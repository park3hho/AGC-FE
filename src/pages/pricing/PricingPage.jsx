import { Fragment, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { adoptBundle, dropBundle, getPricing, rowIdOf, savePricing } from '@/api/pricing'
import { getProducts } from '@/api/product'
import Icon from '@/components/Icon'
import Thumb from '@/components/Thumb'
import HoverInfo from '@/components/common/HoverInfo'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import SectionTabs, { useSectionTabs } from '@/components/common/SectionTabs'
import {
  BULK_MODES,
  FX_SOURCE_LABEL,
  GOOD_MARGIN_PCT,
  LOW_MARGIN_PCT,
  PLATFORMS,
} from '@/constants/pricingConst'
import {
  calcOption,
  cnyToKrw,
  costWithShipping,
  digitsOnly,
  effectiveFxRate,
  formatAddon,
  formatCny,
  formatFx,
  formatKgFromG,
  formatPct,
  formatWon,
  naverListingPlan,
  salePriceForMargin,
  salePriceForProfit,
  summarize,
  toNum,
  totalFeeRate,
  trimDecimal,
  withCommas,
} from '@/utils/pricing'
import styles from './PricingEdit.module.css'

// 서버 Pricing → 입력값 (전부 문자열). 환율·배송비는 여기서 입력하지 않는다 (환율 설정 · 옵션 용량으로 자동)
// (네이버) groupOf: 직접 정한 상품 번호 { [optionId]: n } · baseIds: 직접 정한 대표 옵션 — 비어 있으면 자동
// rows = 판매 옵션 줄 전부 (조사 옵션 + 묶음). 키는 줄 id (옵션 id · 묶음은 "66x2")
const byKey = (a, b) => String(a).localeCompare(String(b), 'en', { numeric: true })
const toForm = (pricing, options) => {
  const all = [...pricing.optionPrices, ...pricing.bundlePrices]
  const byId = Object.fromEntries(all.map((o) => [o.rowId, o.salePrice]))
  const groupOf = {}
  const baseIds = []
  for (const o of all) {
    if (o.listingGroup != null) groupOf[o.rowId] = o.listingGroup
    if (o.isBase) baseIds.push(o.rowId)
  }
  // 예전 방식(대표 옵션 1개)으로 저장된 값 — 다음 저장 때 옵션별 isBase 로 바뀐다
  if (pricing.baseOptionId != null && !baseIds.length) baseIds.push(pricing.baseOptionId)
  return {
    platformFeeRate: trimDecimal(pricing.platformFeeRate),
    paymentFeeRate: trimDecimal(pricing.paymentFeeRate),
    groupOf,
    baseIds: baseIds.sort(byKey),
    prices: Object.fromEntries(
      options.map((o) => [o.id, byId[o.id] == null ? '' : String(byId[o.id])]),
    ),
  }
}

const FEE_FIELDS = [
  { key: 'platformFeeRate', label: '판매' },
  { key: 'paymentFeeRate', label: '결제' },
]

const inPct = (v) => toNum(v) >= 0 && toNum(v) <= 100
const invalidPrice = (v) => v !== '' && !(toNum(v) >= 1)
const optionName = (o) =>
  o.bundleQty > 1
    ? `${o.marketOption1}${o.marketOption2 ? ` / ${o.marketOption2}` : ''} (${o.packNote})`
    : o.option2
      ? `${o.option1} / ${o.option2}`
      : o.option1
const YMD = (date) => (date ? date.slice(2).replace(/-/g, '') : '') // '2026-10-24' → '261024'

// 가격 구조 막대 색 — 상품·배송은 옅은 주색, 수수료 선색, 차익 주색 (오버레이는 body 에 그려져 전역 토큰만)
const MIX = {
  goods: 'color-mix(in srgb, var(--color-primary) 28%, var(--color-bg))',
  ship: 'color-mix(in srgb, var(--color-primary) 55%, var(--color-bg))',
  fee: 'var(--color-border-strong)',
  profit: 'var(--color-primary)',
}

// 판매처 1곳의 화면 상태 — 계산 · 검증 · 바뀐 칸
const platformState = (platform, form, saved, options, survey, fx) => {
  const settings = { ...form, fxRate: fx.cnyKrw, fxMarkupPct: saved.fxMarkupPct }
  const baseline = toForm(saved, options)

  const errors = {}
  if (form.platformFeeRate === '' || !inPct(form.platformFeeRate)) errors.platformFeeRate = true
  if (form.paymentFeeRate !== '' && !inPct(form.paymentFeeRate)) errors.paymentFeeRate = true
  const feeTooHigh = totalFeeRate(settings) >= 100
  const priceError = options.some((o) => invalidPrice(form.prices[o.id]))

  const results = Object.fromEntries(
    options.map((o) => [o.id, calcOption(o, form.prices[o.id], settings)]),
  )
  const changedPrices = options.filter((o) => form.prices[o.id] !== baseline.prices[o.id])
  const changedFees = FEE_FIELDS.filter((f) => form[f.key] !== baseline[f.key])
  const changedBase =
    JSON.stringify(form.baseIds) !== JSON.stringify(baseline.baseIds) ||
    JSON.stringify(form.groupOf) !== JSON.stringify(baseline.groupOf)
      ? 1
      : 0
  const changeCount = changedPrices.length + changedFees.length + changedBase
  const stale = saved.saved && saved.surveyId !== survey.id // 저장 뒤 새 조사가 생김

  return {
    platform,
    settings,
    errors,
    feeTooHigh,
    feeReady: Object.keys(errors).length === 0 && !feeTooHigh,
    valid: Object.keys(errors).length === 0 && !feeTooHigh && !priceError,
    results,
    summary: summarize(Object.values(results)),
    changedIds: new Set(changedPrices.map((o) => o.id)),
    changeCount,
    stale,
    needsSave: changeCount > 0 || !saved.saved || stale,
  }
}

// 네이버 — 상품(묶음)마다 대표 옵션 가격 = 대표가, 나머지는 ±추가금.
// 한도(NAVER_ADDON_LIMITS)를 넘으면 용량·입수별로 상품을 나눈다 (utils/pricing.naverListingPlan)
const naverAddons = (form, options) => {
  const items = options
    .map((o) => ({ id: o.id, sale: toNum(form.prices[o.id]), pack: o.marketOption2 ?? o.option2 }))
    .filter((i) => i.sale >= 1)
  return naverListingPlan(items, { groupOf: form.groupOf, baseIds: form.baseIds })
}

const marginClass = (r) => {
  if (!r) return styles.weak
  if (r.profit < 0) return styles.bad
  if (r.marginPct < LOW_MARGIN_PCT) return styles.warn
  if (r.marginPct >= GOOD_MARGIN_PCT) return styles.ok
  return ''
}

// 범례 (오버레이 안)
function Legend({ parts }) {
  return (
    <div className={styles.legend}>
      {parts.map((p) => (
        <span key={p.label} style={{ display: 'contents' }}>
          <i style={{ background: p.color }} />
          <span>{p.label}</span>
          <b>{formatWon(p.value)}</b>
        </span>
      ))}
    </div>
  )
}

// 가격 구조 막대 — 판매가 = 상품 + 배송 + 수수료 + 차익. 손해면 차익 칸 없이 빨간 테두리
function PriceBar({ parts, total, loss, wide }) {
  return (
    <span className={`${styles.bar} ${loss ? styles.barLoss : ''} ${wide ? styles.tipStack : ''}`}>
      {parts.map((p) => (
        <i
          key={p.label}
          style={{ width: `${(Math.max(0, p.value) / total) * 100}%`, background: p.color }}
        />
      ))}
    </span>
  )
}

const EMPTY_MSG = { text: '', error: false }

// 모바일에서는 한 번에 한 섹션 (DESIGN.md §4.4) — 저장은 늘 보인다
const MOBILE_TABS = [
  { id: 'prices', name: '판매가' },
  { id: 'side', name: '요약·맞추기' },
  { id: 'product', name: '제품' },
]

// 가격 책정 › 제품 1개 — B안 (2026-10-24 사용자 선택)
//   왼쪽: 판매처 탭(상태 점) + 옵션 표 (원가 · 판매가 · 가격 구조 막대 · 차익 · 마진, 네이버는 대표·추가금·상품 번호)
//   오른쪽: 요약 · 한 번에 맞추기 · 수수료 · 저장 (저장 옆에 다음 제품)
export default function PricingPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const tabs = useSectionTabs(MOBILE_TABS)
  const [next, setNext] = useState(null) // 다음 대기 제품 (목록 순서로 이 제품 뒤 → 없으면 맨 앞)
  const [data, setData] = useState(null) // { product, survey, fx, options }
  const [saved, setSaved] = useState(null) // { [platform]: Pricing } — 마지막으로 서버에서 받은 값
  const [forms, setForms] = useState(null) // { [platform]: form }
  const [error, setError] = useState('')
  const [bulk, setBulk] = useState({
    mode: BULK_MODES[0].key, // 기본 = 목표 차익
    // 판매처별 값 — 쿠팡·네이버를 나란히 넣고 '적용' 한 번에 둘 다 바꾼다 (비우면 그 판매처는 그대로)
    amounts: Object.fromEntries(PLATFORMS.map((p) => [p.key, BULK_MODES[0].initial])),
  })
  const [bulkMsg, setBulkMsg] = useState(EMPTY_MSG)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [bundleOn, setBundleOn] = useState(() => new Set()) // 판매 옵션으로 채택한 묶음 줄 (서버 product_bundle)
  const [bundleBusy, setBundleBusy] = useState(false)

  useEffect(() => {
    setData(null)
    setError('')
    getPricing(productId)
      .then((d) => {
        setSaved(d.pricings)
        setForms(
          Object.fromEntries(
            Object.entries(d.pricings).map(([k, p]) => [
              k,
              toForm(p, [...d.options, ...d.bundles]),
            ]),
          ),
        )
        setBundleOn(new Set(d.bundles.filter((b) => b.adopted).map((b) => b.id)))
        setData(d)
      })
      .catch((err) => setError(err.message))
  }, [productId])

  useEffect(() => {
    setNext(null)
    getProducts()
      .then((list) => {
        const here = list.findIndex((p) => p.id === Number(productId))
        const todo = list.filter(
          (p) =>
            p.id !== Number(productId) &&
            (['pending', 'partial'].includes(p.pricingStatus) || p.bundleUnpriced > 0),
        )
        setNext(todo.find((p) => list.indexOf(p) > here) || todo[0] || null)
      })
      .catch(() => setNext(null))
  }, [productId])

  if (error) {
    return (
      <main className="page-flat">
        <PageHeader title="가격 책정" back />
        <p className="form-error">{error}</p>
      </main>
    )
  }
  if (!data || !forms) return null

  const { product, survey, fx, options, bundles } = data
  const platforms = PLATFORMS.filter((p) => saved[p.key])
  // 묶음 줄 — 어느 판매처든 판매가가 있거나 켠 것만 판매 옵션. 나머지 제안은 표 아래에 따로
  const isOn = (b) =>
    bundleOn.has(b.id) || platforms.some((p) => (forms[p.key].prices[b.id] ?? '') !== '')
  const allRows = [...options, ...bundles] // 저장 · 바뀐 칸 비교 기준
  const rows = [...options, ...bundles.filter(isOn)] // 표에 판매 옵션으로 보이는 줄
  const offers = bundles.filter((b) => !isOn(b))
  // 추가 · 빼기는 바로 서버에 남긴다 (판매가는 저장 버튼으로 따로)
  const setBundle = async (b, on) => {
    setSaveError('')
    try {
      if (on) await adoptBundle(product.id, b.optionId, b.bundleQty)
      else await dropBundle(product.id, b.optionId, b.bundleQty)
    } catch (err) {
      setSaveError(err.message)
      return
    }
    setBundleOn((s) => {
      const n = new Set(s)
      if (on) n.add(b.id)
      else n.delete(b.id)
      return n
    })
    if (!on) {
      setForms((f) =>
        Object.fromEntries(
          Object.entries(f).map(([k, form]) => {
            const groupOf = { ...form.groupOf }
            delete groupOf[b.id]
            return [
              k,
              {
                ...form,
                groupOf,
                baseIds: form.baseIds.filter((id) => id !== b.id),
                prices: { ...form.prices, [b.id]: '' },
              },
            ]
          }),
        ),
      )
    }
  }
  const hide = (id) => (survey ? tabs.hide(id) : '')
  const states = survey
    ? Object.fromEntries(
        platforms.map((p) => [
          p.key,
          platformState(p, forms[p.key], saved[p.key], allRows, survey, fx),
        ]),
      )
    : {}
  const naverKey = platforms.find((p) => p.priceMode === 'base_addon')?.key
  const naver = naverKey && survey ? naverAddons(forms[naverKey], allRows) : null
  const optionById = Object.fromEntries(allRows.map((o) => [o.id, o]))

  const toSave = Object.values(states).filter((s) => s.needsSave)
  const totalChanges = Object.values(states).reduce((n, s) => n + s.changeCount, 0)
  const canSave = toSave.length > 0 && toSave.every((s) => s.valid) && !saving

  const setPrice = (platformKey, optionId, value) =>
    setForms((f) => ({
      ...f,
      [platformKey]: { ...f[platformKey], prices: { ...f[platformKey].prices, [optionId]: value } },
    }))
  // 대표 옵션 고르기 (네이버) — 같은 상품의 다른 직접 대표는 풀고, 직접 고른 대표를 다시 누르면 자동으로
  const setBase = (platformKey, optionId) =>
    setForms((f) => {
      const form = f[platformKey]
      const group = naver?.byId[optionId]?.group
      const others = form.baseIds.filter((id) => naver?.byId[id]?.group !== group)
      const baseIds = form.baseIds.includes(optionId) ? others : [...others, optionId]
      return { ...f, [platformKey]: { ...form, baseIds: baseIds.sort(byKey) } }
    })
  // 상품 번호 옮기기 (네이버) — null = 자동
  const setGroup = (platformKey, optionId, no) =>
    setForms((f) => {
      const form = f[platformKey]
      const groupOf = { ...form.groupOf }
      if (no == null) delete groupOf[optionId]
      else groupOf[optionId] = no
      // 묶음을 옮기면 그 옵션의 직접 대표 지정은 푼다
      const baseIds = form.baseIds.filter((id) => id !== optionId)
      return { ...f, [platformKey]: { ...form, groupOf, baseIds } }
    })

  const applyBulk = () => {
    const targets = platforms.filter((p) => (bulk.amounts[p.key] ?? '') !== '')
    if (!targets.length) return setBulkMsg({ text: '값을 입력하세요', error: true })
    const nextForms = { ...forms }
    let skipped = 0
    for (const p of targets) {
      const st = states[p.key]
      if (bulk.mode !== 'sale' && !st.feeReady) {
        return setBulkMsg({ text: `${p.label} 수수료를 먼저 확인해 주세요`, error: true })
      }
      const amount = bulk.amounts[p.key]
      const prices = { ...forms[p.key].prices }
      for (const o of rows) {
        let price
        if (bulk.mode === 'sale') {
          price = Math.round(toNum(amount))
          if (!(price >= 1)) {
            return setBulkMsg({ text: '판매가는 1원 이상으로 입력하세요', error: true })
          }
        } else {
          if (o.shippingCny == null) {
            skipped += 1
            continue
          }
          price =
            bulk.mode === 'profit'
              ? salePriceForProfit(o, amount, st.settings)
              : salePriceForMargin(o, amount, st.settings)
          if (price == null) {
            return setBulkMsg({
              text: `${p.label}: 이 값으로는 판매가를 계산할 수 없어요`,
              error: true,
            })
          }
        }
        prices[o.id] = String(price)
      }
      nextForms[p.key] = { ...forms[p.key], prices }
    }
    setForms(nextForms)
    setBulkMsg({
      text: skipped
        ? `용량을 못 읽은 옵션 ${skipped}칸은 배송비를 몰라 그대로 뒀어요`
        : `${targets.map((p) => p.label).join('·')} 판매가를 바꿨어요. 저장해야 반영돼요`,
      error: false,
    })
  }

  const saveAll = async () => {
    if (!canSave) return
    setSaving(true)
    setSaveError('')
    try {
      for (const s of toSave) {
        const key = s.platform.key
        const form = forms[key]
        // 상품 나누기·대표 직접 지정은 대표가+추가금 판매처(네이버)만 보낸다
        const addonMode = s.platform.priceMode === 'base_addon'
        const res = await savePricing(product.id, key, {
          surveyId: survey.id,
          fxRate: fx.cnyKrw, // 저장 시점 환율 기록
          fxMarkupPct: saved[key].fxMarkupPct ?? '0',
          platformFeeRate: form.platformFeeRate,
          paymentFeeRate: form.paymentFeeRate === '' ? '0' : form.paymentFeeRate,
          optionPrices: allRows
            .filter((o) => (form.prices[o.id] ?? '') !== '')
            .map((o) => ({
              optionId: o.optionId ?? o.id,
              bundleQty: o.bundleQty ?? 1,
              salePrice: Math.round(toNum(form.prices[o.id])),
              listingGroup: addonMode ? (form.groupOf[o.id] ?? null) : null,
              isBase: addonMode && form.baseIds.includes(o.id),
            })),
        })
        setSaved((prev) => ({ ...prev, [key]: res }))
        setForms((prev) => ({ ...prev, [key]: toForm(res, allRows) }))
      }
      setBulkMsg(EMPTY_MSG)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const revert = () => {
    setForms((f) => ({
      ...f,
      ...Object.fromEntries(platforms.map((p) => [p.key, toForm(saved[p.key], allRows)])),
    }))

    setBulkMsg(EMPTY_MSG)
  }

  // 판매처 탭 옆 상태 점
  const tabStatus = (p) => {
    const s = states[p.key]
    if (p.key === naverKey && naver?.overIds.length) {
      return { cls: styles.bad, text: `등록 불가 ${naver.overIds.length}` }
    }
    if (s.changeCount > 0) return { cls: styles.warn, text: `변경 ${s.changeCount}` }
    if (s.stale) return { cls: styles.warn, text: '새 조사' }
    if (!saved[p.key].saved) return { cls: styles.weak, text: '저장 안 됨' }
    if (options.every((o) => forms[p.key].prices[o.id] === '')) {
      return { cls: styles.warn, text: '판매가 없음' }
    }
    const emptyBundles = rows.filter((o) => o.bundleQty > 1 && !forms[p.key].prices[o.id]).length
    if (emptyBundles) return { cls: styles.warn, text: `묶음 빈칸 ${emptyBundles}` }
    return { cls: styles.ok, text: '저장됨' }
  }

  let statusText = '저장됨'
  let statusCls = styles.ok
  if (totalChanges > 0) {
    statusText = `저장 안 된 변경 ${totalChanges}건`
    statusCls = styles.warn
  } else if (toSave.length > 0) {
    statusText = '아직 저장 안 됨'
    statusCls = styles.weak
  }

  const bulkMode = BULK_MODES.find((m) => m.key === bulk.mode) || BULK_MODES[0]
  const bulkWon = bulkMode.unit === '원'
  // 원가 표시는 첫 판매처 환율 설정 기준 (판매처 모두 같은 환율)
  const costSettings = survey ? states[platforms[0].key].settings : null

  // 옵션 1개 · 판매처 1곳의 구성 — 판매가 = 상품 + 배송 + 수수료 + 차익
  const partsOf = (o, r, settings) => {
    const fxRate = effectiveFxRate(settings)
    const goods = cnyToKrw(o.priceCny, fxRate)
    const ship = cnyToKrw(o.shippingCny, fxRate)
    return [
      { label: `상품 ${formatCny(o.priceCny)}`, value: goods, color: MIX.goods },
      {
        label: `배송 ${formatCny(o.shippingCny)} (${o.billableKg}kg)`,
        value: ship,
        color: MIX.ship,
      },
      { label: '수수료', value: r.fee, color: MIX.fee },
      ...(r.profit > 0 ? [{ label: '차익', value: r.profit, color: MIX.profit }] : []),
    ]
  }

  return (
    <main className="page-flat">
      <PageHeader title="가격 책정" back />

      {survey && <SectionTabs {...tabs} />}

      <Section name="제품" id="product" title={false} className={hide('product')}>
        <div className={styles.product}>
          <Thumb src={product.photoUrl} size={36} />
          <div className={styles.productText}>
            <Link to={`/research/products/${product.id}`} className={styles.productTitle}>
              {product.titleKo || product.titleCn}
            </Link>
            <div className={styles.productMeta}>
              {product.code}
              {survey && ` · 조사 ${survey.code} · 옵션 ${options.length}`} · 환율{' '}
              <span className={styles.fx}>{formatFx(fx.cnyKrw)}</span>원
              {fx.date
                ? ` (${YMD(fx.date)} ${FX_SOURCE_LABEL[fx.source] || fx.source})`
                : ' (기본값)'}
            </div>
          </div>
          <span className={styles.spacer} />
          <Link to="/shipping" className={styles.textLink}>
            배송비
          </Link>
          <Link to="/exchange-rate" className={styles.textLink}>
            환율
          </Link>
        </div>
      </Section>

      {!survey ? (
        <Section name="옵션별 판매가" id="prices" title={false}>
          <div className={styles.noSurvey}>
            <p>아직 가격조사가 없어요. 조사를 먼저 등록하면 판매가를 정할 수 있어요.</p>
            <Link
              to={`/research/prices/new?product=${encodeURIComponent(product.code)}`}
              className={styles.textLink}
            >
              가격조사 등록하기
            </Link>
          </div>
        </Section>
      ) : (
        <div className={`fit-row ${styles.layout}`}>
          <Section
            name="옵션별 판매가"
            id="prices"
            title={false}
            flush
            fill="stretch"
            className={hide('prices')}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>옵션</th>
                  <th className={styles.num}>원가</th>
                  {platforms.map((p) => {
                    const ts = tabStatus(p)
                    const fee = totalFeeRate(states[p.key].settings)
                    return (
                      <th key={p.key} className={styles.platHead}>
                        {p.label}
                        <span className={`${styles.dot} ${ts.cls}`}>{ts.text}</span>
                        <span className={styles.feeNote}>
                          수수료 {trimDecimal(fee.toFixed(2))}%
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const cost = costSettings ? costWithShipping(o, costSettings) : null
                  const bundled = o.bundleQty > 1
                  return (
                    <tr key={o.id}>
                      <td>
                        <span className={styles.optName}>
                          {bundled ? o.marketOption1 : o.option1}
                        </span>{' '}
                        <span className={styles.weak}>{bundled ? o.marketOption2 : o.option2}</span>
                        {bundled && (
                          <span className={styles.bundleNote}>
                            묶음 {o.packNote} · {formatKgFromG(o.weightG)} · 타오바오에서{' '}
                            {o.bundleQty}개 구매
                            <button
                              type="button"
                              className={styles.bundleBtn}
                              onClick={() => setBundle(o, false)}
                              title="이 묶음을 판매 옵션에서 빼요 (저장해야 반영)"
                            >
                              빼기
                            </button>
                          </span>
                        )}
                        {o.overDutyFree && (
                          <span className={styles.optWarn}>
                            상품가가 면세 한도($150)를 넘을 수 있어요
                          </span>
                        )}
                        {o.shippingCny == null && (
                          <span className={styles.optWarn}>용량을 못 읽어 배송비를 몰라요</span>
                        )}
                        {o.overLimit && (
                          <span className={styles.optWarn}>30kg 초과 — 집운 소형 불가</span>
                        )}
                      </td>
                      <td className={styles.num}>
                        {cost == null ? (
                          '-'
                        ) : (
                          <HoverInfo
                            content={
                              <>
                                <div className={styles.tipTitle}>원가 {formatWon(cost)}</div>
                                <Legend
                                  parts={partsOf(o, { fee: 0, profit: 0 }, costSettings).slice(
                                    0,
                                    2,
                                  )}
                                />
                                <div className={styles.tipNote}>
                                  위안 × {formatFx(fx.cnyKrw)}원 (오늘 환율)
                                </div>
                              </>
                            }
                          >
                            {formatWon(cost)}
                          </HoverInfo>
                        )}
                      </td>
                      {platforms.map((p) => {
                        const s = states[p.key]
                        const r = s.results[o.id]
                        const value = forms[p.key].prices[o.id]
                        const addon = p.key === naverKey && naver ? naver.byId[o.id] : null
                        const parts = r ? partsOf(o, r, s.settings) : null
                        const total = r ? Math.max(r.totalCost + r.fee, toNum(value)) : 0
                        return (
                          <td key={p.key} className={styles.platCell}>
                            <div className={styles.cellTop}>
                              <input
                                className={`${styles.priceInput} ${
                                  invalidPrice(value)
                                    ? styles.invalid
                                    : s.changedIds.has(o.id)
                                      ? styles.changed
                                      : ''
                                }`}
                                type="text"
                                inputMode="numeric"
                                placeholder="판매가"
                                aria-label={`${optionName(o)} ${p.label} 판매가`}
                                value={withCommas(value)}
                                onChange={(e) => setPrice(p.key, o.id, digitsOnly(e.target.value))}
                              />
                              {addon && (naver.groups.length > 1 || addon.manualGroup) && (
                                <select
                                  className={`${styles.groupSelect} ${
                                    addon.manualGroup ? styles.groupManual : ''
                                  }`}
                                  value={addon.manualGroup ? String(addon.group) : ''}
                                  title={
                                    addon.manualGroup
                                      ? '직접 정한 상품 번호'
                                      : '자동으로 나눈 상품 번호'
                                  }
                                  aria-label={`${optionName(o)} 네이버 상품 번호`}
                                  onChange={(e) =>
                                    setGroup(
                                      p.key,
                                      o.id,
                                      e.target.value === '' ? null : Number(e.target.value),
                                    )
                                  }
                                >
                                  <option value="">
                                    상품 {addon.manualGroup ? '자동' : addon.group}
                                  </option>
                                  {Array.from(
                                    { length: naver.groups.length + 1 },
                                    (_, k) => k + 1,
                                  ).map((n) => (
                                    <option key={n} value={n}>
                                      {n > naver.groups.length ? `상품 ${n} (새로)` : `상품 ${n}`}
                                    </option>
                                  ))}
                                </select>
                              )}
                              {addon && (
                                <button
                                  type="button"
                                  className={`${styles.addon} ${addon.isBase ? styles.addonBase : ''} ${
                                    addon.over ? styles.addonOver : ''
                                  }`}
                                  title={
                                    addon.isBase
                                      ? addon.autoBase
                                        ? '자동으로 고른 대표 옵션'
                                        : '직접 고른 대표 — 누르면 자동으로'
                                      : addon.over
                                        ? '추가금 한도를 넘어요 — 누르면 이 옵션을 대표로'
                                        : '누르면 이 옵션을 대표로'
                                  }
                                  onClick={() => setBase(p.key, o.id)}
                                  disabled={addon.isBase && addon.autoBase}
                                >
                                  {addon.isBase
                                    ? addon.autoBase
                                      ? '대표(자동)'
                                      : '대표'
                                    : formatAddon(addon.amount)}
                                </button>
                              )}
                            </div>
                            <div className={styles.cellBottom}>
                              {r ? (
                                <>
                                  <HoverInfo
                                    content={
                                      <>
                                        <div className={styles.tipTitle}>
                                          {p.label} {formatWon(toNum(value))} 구성
                                        </div>
                                        <PriceBar
                                          parts={parts}
                                          total={total}
                                          loss={r.profit < 0}
                                          wide
                                        />
                                        <Legend
                                          parts={
                                            r.profit < 0
                                              ? [
                                                  ...parts,
                                                  {
                                                    label: '손해',
                                                    value: r.profit,
                                                    color: 'var(--color-danger)',
                                                  },
                                                ]
                                              : parts
                                          }
                                        />
                                      </>
                                    }
                                  >
                                    <PriceBar parts={parts} total={total} loss={r.profit < 0} />
                                  </HoverInfo>
                                  <span className={r.profit < 0 ? styles.bad : ''}>
                                    {formatWon(r.profit)}
                                  </span>
                                  <span className={marginClass(r)}>{formatPct(r.marginPct)}</span>
                                </>
                              ) : (
                                <span className={styles.weak}>판매가를 넣어 주세요</span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
                {offers.map((b) => {
                  const one = optionById[b.optionId]
                  const perUnit = b.shippingCny == null ? null : toNum(b.shippingCny) / b.bundleQty
                  return (
                    <tr key={b.id} className={styles.offerRow}>
                      <td colSpan={2 + platforms.length}>
                        <span className={styles.offerTag}>묶음 제안</span>
                        <span className={styles.optName}>{b.marketOption1}</span>{' '}
                        <span className={styles.weak}>{b.marketOption2}</span>
                        <span className={styles.bundleNote}>
                          {b.packNote} · {formatKgFromG(b.weightG)} · 운임{' '}
                          {formatCny(b.shippingCny)}
                          {one?.shippingCny != null && perUnit != null && (
                            <>
                              {' '}
                              ({one.option2 || one.option1} 1개당 {formatCny(perUnit.toFixed(2))},
                              지금 {formatCny(one.shippingCny)})
                            </>
                          )}
                        </span>
                        <button
                          type="button"
                          className={styles.bundleBtn}
                          onClick={() => setBundle(b, true)}
                        >
                          판매 옵션으로 추가
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {platforms
              .filter((p) => states[p.key].stale)
              .map((p) => (
                <p key={p.key} className={styles.notice}>
                  {p.label}: 새 가격 조사가 있어요. 판매가를 다시 넣고 저장하세요
                </p>
              ))}
            {/* 네이버 — 직접 정한 묶음·대표 때문에 한도를 넘는 상품 */}
            {naver &&
              naver.groups
                .filter((g) => g.overIds.length > 0)
                .map((g) => (
                  <p key={g.no} className={styles.notice}>
                    <b>
                      네이버{naver.groups.length > 1 ? ` 상품 ${g.no}` : ''} 등록 불가{' '}
                      {g.overIds.length}건
                    </b>{' '}
                    · 대표가 {formatWon(g.base)} 기준 추가금은 {formatAddon(g.range.min)} ~{' '}
                    {formatAddon(g.range.max)}원까지예요
                    <button
                      type="button"
                      className={styles.noticeBtn}
                      onClick={() =>
                        setForms((f) => ({
                          ...f,
                          [naverKey]: { ...f[naverKey], groupOf: {}, baseIds: [] },
                        }))
                      }
                    >
                      자동으로 나누기
                    </button>
                  </p>
                ))}
          </Section>

          <div className={`fit-col ${styles.side}`}>
            {/* 요약 · 맞추기 · 수수료는 쿠팡·네이버를 나란히 (열 = 판매처) */}
            <Section name="요약" id="summary" className={hide('side')}>
              <div className={styles.grid} style={{ '--cols': platforms.length }}>
                <span />
                {platforms.map((p) => (
                  <span key={p.key} className={styles.gridHead}>
                    {p.label}
                  </span>
                ))}
                <span className={styles.gridLabel}>평균 마진</span>
                {platforms.map((p) => (
                  <b key={p.key}>{formatPct(states[p.key].summary.avgMarginPct)}</b>
                ))}
                <span className={styles.gridLabel}>최저 차익</span>
                {platforms.map((p) => (
                  <b key={p.key} className={states[p.key].summary.minProfit < 0 ? styles.bad : ''}>
                    {formatWon(states[p.key].summary.minProfit)}
                  </b>
                ))}
                <span className={styles.gridLabel}>손해 옵션</span>
                {platforms.map((p) => (
                  <b key={p.key} className={states[p.key].summary.lossCount > 0 ? styles.bad : ''}>
                    {states[p.key].summary.lossCount}개
                  </b>
                ))}
                {naver && (
                  <>
                    <span className={styles.gridLabel}>등록 상품</span>
                    {platforms.map((p) =>
                      p.key === naverKey ? (
                        <HoverInfo
                          key={p.key}
                          content={
                            naver.groups.length > 1 && (
                              <>
                                <div className={styles.tipTitle}>
                                  네이버는 상품 {naver.groups.length}개로 나눠 등록해요
                                </div>
                                <ul className={styles.groups}>
                                  {naver.groups.map((g) => (
                                    <li key={g.no}>
                                      상품 {g.no} · 대표 {optionName(optionById[g.baseId])}{' '}
                                      {formatWon(g.base)}
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )
                          }
                        >
                          <b>{naver.groups.length}개</b>
                        </HoverInfo>
                      ) : (
                        <b key={p.key} className={styles.weak}>
                          옵션별
                        </b>
                      ),
                    )}
                  </>
                )}
              </div>
            </Section>

            <Section
              name="한 번에 맞추기"
              id="bulk"
              className={`${styles.bottomGroup} ${hide('side')}`}
            >
              <div className={styles.row}>
                <span className={styles.gridLabel}>방식</span>
                <select
                  className={styles.select}
                  value={bulk.mode}
                  aria-label="맞추는 방식"
                  onChange={(e) => {
                    const m = BULK_MODES.find((x) => x.key === e.target.value)
                    setBulk({
                      mode: m.key,
                      amounts: Object.fromEntries(platforms.map((p) => [p.key, m.initial])),
                    })
                    setBulkMsg(EMPTY_MSG)
                  }}
                >
                  {BULK_MODES.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.grid} style={{ '--cols': platforms.length }}>
                <span />
                {platforms.map((p) => (
                  <span key={p.key} className={styles.gridHead}>
                    {p.label} ({bulkMode.unit})
                  </span>
                ))}
                <span />
                {platforms.map((p) => (
                  <input
                    key={p.key}
                    className={styles.input}
                    type="text"
                    inputMode={bulkWon ? 'numeric' : 'decimal'}
                    placeholder="그대로"
                    aria-label={`${p.label} ${bulkMode.label}`}
                    value={
                      bulkWon ? withCommas(bulk.amounts[p.key] ?? '') : (bulk.amounts[p.key] ?? '')
                    }
                    onChange={(e) => {
                      const v = bulkWon
                        ? digitsOnly(e.target.value)
                        : e.target.value.replace(/[^0-9.]/g, '')
                      setBulk((b) => ({ ...b, amounts: { ...b.amounts, [p.key]: v } }))
                      setBulkMsg(EMPTY_MSG)
                    }}
                  />
                ))}
              </div>
              {bulkMsg.text && (
                <p className={bulkMsg.error ? styles.hintError : styles.hint}>{bulkMsg.text}</p>
              )}
            </Section>

            {/* 저장 · 다음 — 오른쪽 열 맨 아래 */}
            <Section name="저장" id="save" sub={<span className={statusCls}>● {statusText}</span>}>
              <button
                type="button"
                className={`btn-secondary btn-md ${styles.applyBtn}`}
                onClick={applyBulk}
                title={
                  bulk.mode === 'sale'
                    ? '모든 옵션에 같은 판매가 · 비운 판매처는 그대로'
                    : '100원 단위로 올림 · 비운 판매처는 그대로'
                }
              >
                쿠팡·네이버 한 번에 적용
              </button>

              {offers.length > 0 && (
                <button
                  type="button"
                  className={`btn-secondary btn-md ${styles.applyBtn}`}
                  disabled={bundleBusy}
                  title="표 아래 묶음 제안을 모두 판매 옵션으로 넣어요. 판매가는 비워 둬요"
                  onClick={async () => {
                    setBundleBusy(true)
                    for (const b of offers) await setBundle(b, true)
                    setBundleBusy(false)
                  }}
                >
                  {bundleBusy ? '추가 중…' : `묶음 제안 ${offers.length}개 모두 추가`}
                </button>
              )}
              {saveError && <p className={styles.hintError}>{saveError}</p>}
              <div className={styles.saveRow}>
                <button
                  type="button"
                  className="btn-secondary btn-md"
                  onClick={revert}
                  disabled={totalChanges === 0 || saving}
                >
                  되돌리기
                </button>
                <button
                  type="button"
                  className="btn-primary btn-md"
                  onClick={saveAll}
                  disabled={!canSave}
                >
                  {saving ? '저장 중…' : '저장'}
                </button>
                {next && (
                  <button
                    type="button"
                    className="btn-secondary btn-md"
                    onClick={() => navigate(`/pricing/${next.id}`)}
                    title={`다음 대기 제품: ${next.titleKo || next.titleCn}`}
                  >
                    다음 <Icon name="arrowRight" size={14} />
                  </button>
                )}
              </div>
            </Section>
          </div>
        </div>
      )}
    </main>
  )
}
