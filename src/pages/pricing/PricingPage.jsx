import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { getPricing, savePricing } from '@/api/pricing'
import { getProducts } from '@/api/product'
import Icon from '@/components/Icon'
import Thumb from '@/components/Thumb'
import HoverInfo from '@/components/common/HoverInfo'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import SectionTabs, { useSectionTabs } from '@/components/common/SectionTabs'
import {
  BULK_MODES,
  BULK_TARGET_ALL,
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
const toForm = (pricing, options) => {
  const byId = Object.fromEntries(pricing.optionPrices.map((o) => [o.optionId, o.salePrice]))
  const groupOf = {}
  const baseIds = []
  for (const o of pricing.optionPrices) {
    if (o.listingGroup != null) groupOf[o.optionId] = o.listingGroup
    if (o.isBase) baseIds.push(o.optionId)
  }
  // 예전 방식(대표 옵션 1개)으로 저장된 값 — 다음 저장 때 옵션별 isBase 로 바뀐다
  if (pricing.baseOptionId != null && !baseIds.length) baseIds.push(pricing.baseOptionId)
  return {
    platformFeeRate: trimDecimal(pricing.platformFeeRate),
    paymentFeeRate: trimDecimal(pricing.paymentFeeRate),
    groupOf,
    baseIds: baseIds.sort((a, b) => a - b),
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
const optionName = (o) => (o.option2 ? `${o.option1} / ${o.option2}` : o.option1)
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
    .map((o) => ({ id: o.id, sale: toNum(form.prices[o.id]), pack: o.option2 }))
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
  const [tab, setTab] = useState(null) // 지금 보는 판매처 key
  const [error, setError] = useState('')
  const [bulk, setBulk] = useState({
    mode: BULK_MODES[0].key, // 기본 = 목표 차익
    amount: BULK_MODES[0].initial,
    target: 'tab', // 'tab' = 지금 탭의 판매처 · BULK_TARGET_ALL = 모든 판매처
  })
  const [bulkMsg, setBulkMsg] = useState(EMPTY_MSG)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    setData(null)
    setError('')
    getPricing(productId)
      .then((d) => {
        setSaved(d.pricings)
        setForms(
          Object.fromEntries(Object.entries(d.pricings).map(([k, p]) => [k, toForm(p, d.options)])),
        )
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
          (p) => p.id !== Number(productId) && ['pending', 'partial'].includes(p.pricingStatus),
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

  const { product, survey, fx, options } = data
  const platforms = PLATFORMS.filter((p) => saved[p.key])
  const cur = platforms.find((p) => p.key === tab) || platforms[0]
  const hide = (id) => (survey ? tabs.hide(id) : '')
  const states = survey
    ? Object.fromEntries(
        platforms.map((p) => [
          p.key,
          platformState(p, forms[p.key], saved[p.key], options, survey, fx),
        ]),
      )
    : {}
  const naverKey = platforms.find((p) => p.priceMode === 'base_addon')?.key
  const naver = naverKey && survey ? naverAddons(forms[naverKey], options) : null
  const optionById = Object.fromEntries(options.map((o) => [o.id, o]))

  const toSave = Object.values(states).filter((s) => s.needsSave)
  const totalChanges = Object.values(states).reduce((n, s) => n + s.changeCount, 0)
  const canSave = toSave.length > 0 && toSave.every((s) => s.valid) && !saving

  const setPrice = (platformKey, optionId, value) =>
    setForms((f) => ({
      ...f,
      [platformKey]: { ...f[platformKey], prices: { ...f[platformKey].prices, [optionId]: value } },
    }))
  const setFee = (platformKey, field, value) =>
    setForms((f) => ({ ...f, [platformKey]: { ...f[platformKey], [field]: value } }))
  // 대표 옵션 고르기 (네이버) — 같은 상품의 다른 직접 대표는 풀고, 직접 고른 대표를 다시 누르면 자동으로
  const setBase = (platformKey, optionId) =>
    setForms((f) => {
      const form = f[platformKey]
      const group = naver?.byId[optionId]?.group
      const others = form.baseIds.filter((id) => naver?.byId[id]?.group !== group)
      const baseIds = form.baseIds.includes(optionId) ? others : [...others, optionId]
      return { ...f, [platformKey]: { ...form, baseIds: baseIds.sort((a, b) => a - b) } }
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
    if (bulk.amount === '') return setBulkMsg({ text: '값을 입력하세요', error: true })
    const targets = bulk.target === BULK_TARGET_ALL ? platforms : [cur]
    const nextForms = { ...forms }
    let skipped = 0
    for (const p of targets) {
      const st = states[p.key]
      if (bulk.mode !== 'sale' && !st.feeReady) {
        return setBulkMsg({ text: `${p.label} 수수료를 먼저 확인해 주세요`, error: true })
      }
      const prices = { ...forms[p.key].prices }
      for (const o of options) {
        let price
        if (bulk.mode === 'sale') {
          price = Math.round(toNum(bulk.amount))
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
              ? salePriceForProfit(o, bulk.amount, st.settings)
              : salePriceForMargin(o, bulk.amount, st.settings)
          if (price == null) {
            return setBulkMsg({ text: '이 값으로는 판매가를 계산할 수 없어요', error: true })
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
          optionPrices: options
            .filter((o) => form.prices[o.id] !== '')
            .map((o) => ({
              optionId: o.id,
              salePrice: Math.round(toNum(form.prices[o.id])),
              listingGroup: addonMode ? (form.groupOf[o.id] ?? null) : null,
              isBase: addonMode && form.baseIds.includes(o.id),
            })),
        })
        setSaved((prev) => ({ ...prev, [key]: res }))
        setForms((prev) => ({ ...prev, [key]: toForm(res, options) }))
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
      ...Object.fromEntries(platforms.map((p) => [p.key, toForm(saved[p.key], options)])),
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

  const st = survey ? states[cur.key] : null
  const fxNow = st ? effectiveFxRate(st.settings) : null
  const isAddon = cur?.key === naverKey
  const bulkMode = BULK_MODES.find((m) => m.key === bulk.mode) || BULK_MODES[0]
  const bulkWon = bulkMode.unit === '원'

  // 옵션 1개의 구성 (지금 판매처)
  const partsOf = (o, r) => {
    const goods = cnyToKrw(o.priceCny, fxNow)
    const ship = cnyToKrw(o.shippingCny, fxNow)
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
            <div className={styles.tabs} role="tablist" aria-label="판매처">
              {platforms.map((p) => {
                const ts = tabStatus(p)
                return (
                  <button
                    key={p.key}
                    type="button"
                    role="tab"
                    aria-selected={cur.key === p.key}
                    className={cur.key === p.key ? styles.tabOn : ''}
                    onClick={() => setTab(p.key)}
                  >
                    {p.label}
                    <span className={`${styles.dot} ${ts.cls}`}>{ts.text}</span>
                  </button>
                )
              })}
            </div>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>옵션</th>
                  <th className={styles.num}>원가</th>
                  <th className={styles.num}>판매가</th>
                  {isAddon && <th>대표·추가금</th>}
                  <th>가격 구조</th>
                  <th className={styles.num}>차익</th>
                  <th className={styles.num}>마진</th>
                </tr>
              </thead>
              <tbody>
                {options.map((o) => {
                  const r = st.results[o.id]
                  const cost = costWithShipping(o, st.settings)
                  const value = forms[cur.key].prices[o.id]
                  const addon = isAddon && naver ? naver.byId[o.id] : null
                  const parts = r ? partsOf(o, r) : null
                  const total = r ? Math.max(r.totalCost + r.fee, toNum(value)) : 0
                  return (
                    <tr key={o.id}>
                      <td>
                        <span className={styles.optName}>{o.option1}</span>{' '}
                        <span className={styles.weak}>{o.option2}</span>
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
                                <Legend parts={partsOf(o, { fee: 0, profit: 0 }).slice(0, 2)} />
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
                      <td className={styles.num}>
                        <input
                          className={`${styles.priceInput} ${
                            invalidPrice(value)
                              ? styles.invalid
                              : st.changedIds.has(o.id)
                                ? styles.changed
                                : ''
                          }`}
                          type="text"
                          inputMode="numeric"
                          placeholder="판매가"
                          aria-label={`${optionName(o)} ${cur.label} 판매가`}
                          value={withCommas(value)}
                          onChange={(e) => setPrice(cur.key, o.id, digitsOnly(e.target.value))}
                        />
                      </td>
                      {isAddon && (
                        <td>
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
                                  cur.key,
                                  o.id,
                                  e.target.value === '' ? null : Number(e.target.value),
                                )
                              }
                            >
                              <option value="">
                                상품 {addon.manualGroup ? '자동' : addon.group}
                              </option>
                              {Array.from({ length: naver.groups.length + 1 }, (_, i) => i + 1).map(
                                (n) => (
                                  <option key={n} value={n}>
                                    {n > naver.groups.length ? `상품 ${n} (새로)` : `상품 ${n}`}
                                  </option>
                                ),
                              )}
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
                              onClick={() => setBase(cur.key, o.id)}
                              disabled={addon.isBase && addon.autoBase}
                            >
                              {addon.isBase
                                ? addon.autoBase
                                  ? '대표(자동)'
                                  : '대표'
                                : formatAddon(addon.amount)}
                            </button>
                          )}
                        </td>
                      )}
                      <td>
                        {r ? (
                          <HoverInfo
                            content={
                              <>
                                <div className={styles.tipTitle}>
                                  {cur.label} {formatWon(toNum(value))} 구성
                                </div>
                                <PriceBar parts={parts} total={total} loss={r.profit < 0} wide />
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
                        ) : (
                          <span className={styles.weak}>-</span>
                        )}
                      </td>
                      <td className={`${styles.num} ${r && r.profit < 0 ? styles.bad : ''}`}>
                        <b>{r ? formatWon(r.profit) : '-'}</b>
                      </td>
                      <td className={`${styles.num} ${marginClass(r)}`}>
                        {r ? formatPct(r.marginPct) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {st.stale && (
              <p className={styles.notice}>
                {cur.label}: 새 가격 조사가 있어요. 판매가를 다시 넣고 저장하세요
              </p>
            )}
            {st.feeTooHigh && (
              <p className={styles.notice}>
                <b>수수료 합계가 100% 이상이에요</b>
              </p>
            )}
            {/* 네이버 — 직접 정한 묶음·대표 때문에 한도를 넘는 상품 */}
            {isAddon &&
              naver &&
              naver.groups
                .filter((g) => g.overIds.length > 0)
                .map((g) => (
                  <p key={g.no} className={styles.notice}>
                    <b>
                      {naver.groups.length > 1 ? `상품 ${g.no} ` : ''}등록 불가 {g.overIds.length}건
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

          <div className="fit-col">
            <Section name="요약" id="summary" sub={cur.label} className={hide('side')}>
              <div className={styles.kv}>
                <span>평균 마진</span>
                <b>{formatPct(st.summary.avgMarginPct)}</b>
              </div>
              <div className={styles.kv}>
                <span>최저 차익</span>
                <b className={st.summary.minProfit < 0 ? styles.bad : ''}>
                  {formatWon(st.summary.minProfit)}
                </b>
              </div>
              <div className={styles.kv}>
                <span>손해 옵션</span>
                <b className={st.summary.lossCount > 0 ? styles.bad : ''}>
                  {st.summary.lossCount}개
                </b>
              </div>
              {isAddon && naver && (
                <>
                  <div className={styles.kv}>
                    <span>네이버 상품</span>
                    <b>{naver.groups.length}개</b>
                  </div>
                  {naver.groups.length > 1 && (
                    <ul className={styles.groups}>
                      {naver.groups.map((g) => (
                        <li key={g.no}>
                          상품 {g.no} · 대표 {optionName(optionById[g.baseId])} {formatWon(g.base)}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </Section>

            <Section name="한 번에 맞추기" id="bulk" className={hide('side')}>
              <div className={styles.row}>
                <select
                  className={styles.select}
                  value={bulk.mode}
                  aria-label="맞추는 방식"
                  onChange={(e) => {
                    const m = BULK_MODES.find((x) => x.key === e.target.value)
                    setBulk((b) => ({ ...b, mode: m.key, amount: m.initial }))
                    setBulkMsg(EMPTY_MSG)
                  }}
                >
                  {BULK_MODES.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <input
                  className={styles.input}
                  type="text"
                  inputMode={bulkWon ? 'numeric' : 'decimal'}
                  aria-label={`${bulkMode.label} 값`}
                  value={bulkWon ? withCommas(bulk.amount) : bulk.amount}
                  onChange={(e) => {
                    const v = bulkWon
                      ? digitsOnly(e.target.value)
                      : e.target.value.replace(/[^0-9.]/g, '')
                    setBulk((b) => ({ ...b, amount: v }))
                    setBulkMsg(EMPTY_MSG)
                  }}
                />
                <span className={styles.weak}>{bulkMode.unit}</span>
              </div>
              <div className={styles.row}>
                <select
                  className={styles.select}
                  value={bulk.target}
                  aria-label="맞출 판매처"
                  onChange={(e) => setBulk((b) => ({ ...b, target: e.target.value }))}
                >
                  <option value="tab">{cur.label}만</option>
                  <option value={BULK_TARGET_ALL}>모든 판매처</option>
                </select>
                <button type="button" className="btn-secondary btn-sm" onClick={applyBulk}>
                  적용
                </button>
              </div>
              <p className={bulkMsg.error ? styles.hintError : styles.hint}>
                {bulkMsg.text ||
                  (bulk.mode === 'sale'
                    ? '모든 옵션에 같은 판매가를 넣어요'
                    : '100원 단위로 올려서 계산해요')}
              </p>
            </Section>

            <Section name="수수료" id="fees" sub={cur.label} className={hide('side')}>
              {FEE_FIELDS.map((f) => (
                <div key={f.key} className={styles.row}>
                  <span className={styles.feeLabel}>{f.label}</span>
                  <input
                    className={`${styles.input} ${st.errors[f.key] ? styles.inputError : ''}`}
                    type="text"
                    inputMode="decimal"
                    aria-label={`${cur.label} ${f.label} 수수료 (%)`}
                    value={forms[cur.key][f.key]}
                    onChange={(e) => setFee(cur.key, f.key, e.target.value.replace(/[^0-9.]/g, ''))}
                  />
                  <span className={styles.weak}>%</span>
                </div>
              ))}
            </Section>

            <Section name="저장" id="save">
              <div className={`${styles.status} ${statusCls}`}>● {statusText}</div>
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
