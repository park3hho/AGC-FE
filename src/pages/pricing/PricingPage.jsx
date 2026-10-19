import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getPricing, savePricing } from '@/api/pricing'
import PageHeader from '@/components/common/PageHeader'
import Thumb from '@/components/Thumb'
import { BULK_MODES, BULK_TARGET_ALL, FX_SOURCE_LABEL, PLATFORMS } from '@/constants/pricingConst'
import research from '@/pages/research/Research.module.css'
import {
  calcOption,
  costWithShipping,
  formatFx,
  formatPct,
  formatWon,
  naverAddonCap,
  naverAddonCapPct,
  salePriceForMargin,
  salePriceForProfit,
  summarize,
  toNum,
  totalFeeRate,
  trimDecimal,
} from '@/utils/pricing'
import PricingBulkBar from './PricingBulkBar'
import PricingOptionRow from './PricingOptionRow'
import styles from './Pricing.module.css'

// 서버 Pricing → 입력값 (전부 문자열). 환율·배송비는 여기서 입력하지 않는다 (환율 설정 · 옵션 용량으로 자동)
const toForm = (pricing, options) => {
  const byId = Object.fromEntries(pricing.optionPrices.map((o) => [o.optionId, o.salePrice]))
  return {
    platformFeeRate: trimDecimal(pricing.platformFeeRate),
    paymentFeeRate: trimDecimal(pricing.paymentFeeRate),
    prices: Object.fromEntries(
      options.map((o) => [o.id, byId[o.id] == null ? '' : String(byId[o.id])]),
    ),
  }
}

const FEE_FIELDS = [
  { key: 'platformFeeRate', label: '수수료' },
  { key: 'paymentFeeRate', label: '결제' },
]

const inPct = (v) => toNum(v) >= 0 && toNum(v) <= 100
const invalidPrice = (v) => v !== '' && !(toNum(v) >= 1)
const optionName = (o) => (o.option2 ? `${o.option1} / ${o.option2}` : o.option1)

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
  const changeCount = changedPrices.length + changedFees.length
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

// 네이버 — 판매가 있는 옵션 중 최저가 = 대표가, 나머지는 추가금 (한도: NAVER_ADDON_LIMITS)
const naverAddons = (form, options) => {
  const filled = options.map((o) => toNum(form.prices[o.id])).filter((n) => n >= 1)
  if (!filled.length) return { base: null, cap: null, capPct: null, byId: {}, over: [] }
  const base = Math.min(...filled)
  const cap = naverAddonCap(base)
  const byId = {}
  const over = []
  for (const o of options) {
    const sale = toNum(form.prices[o.id])
    if (!(sale >= 1)) continue
    const amount = sale - base
    const isOver = cap != null && amount > cap
    byId[o.id] = { amount, isBase: amount === 0, over: isOver }
    if (isOver) over.push(o)
  }
  return { base, cap, capPct: naverAddonCapPct(base), byId, over }
}

const EMPTY_MSG = { text: '', error: false }

// 가격 책정 › 제품 1개 — 쿠팡·네이버를 옵션별로 나란히 놓고 한 번에 저장
export default function PricingPage() {
  const { productId } = useParams()
  const [data, setData] = useState(null) // { product, survey, fx, options }
  const [saved, setSaved] = useState(null) // { [platform]: Pricing } — 마지막으로 서버에서 받은 값
  const [forms, setForms] = useState(null) // { [platform]: form }
  const [error, setError] = useState('')
  const [bulk, setBulk] = useState({
    mode: BULK_MODES[0].key, // 기본 = 목표 차익
    amount: BULK_MODES[0].initial,
    target: BULK_TARGET_ALL,
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
          Object.fromEntries(
            Object.entries(d.pricings).map(([k, p]) => [k, toForm(p, d.options)]),
          ),
        )
        setData(d)
      })
      .catch((err) => setError(err.message))
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

  const toSave = Object.values(states).filter((s) => s.needsSave)
  const totalChanges = Object.values(states).reduce((n, s) => n + s.changeCount, 0)
  const canSave = toSave.length > 0 && toSave.every((s) => s.valid) && !saving

  // 원가 표시는 첫 판매처 설정(실결제 가산율) 기준 — 판매처 모두 같은 환율을 쓴다
  const costSettings = platforms.length && survey ? states[platforms[0].key].settings : null

  const setPrice = (platformKey, optionId, value) =>
    setForms((f) => ({
      ...f,
      [platformKey]: { ...f[platformKey], prices: { ...f[platformKey].prices, [optionId]: value } },
    }))
  const setFee = (platformKey, field, value) =>
    setForms((f) => ({ ...f, [platformKey]: { ...f[platformKey], [field]: value } }))

  const applyBulk = () => {
    if (bulk.amount === '') return setBulkMsg({ text: '값을 입력하세요', error: true })
    const targets =
      bulk.target === BULK_TARGET_ALL ? platforms : platforms.filter((p) => p.key === bulk.target)
    const next = { ...forms }
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
      next[p.key] = { ...forms[p.key], prices }
    }
    setForms(next)
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
        const res = await savePricing(product.id, key, {
          surveyId: survey.id,
          fxRate: fx.cnyKrw, // 저장 시점 환율 기록
          fxMarkupPct: saved[key].fxMarkupPct ?? '0',
          platformFeeRate: form.platformFeeRate,
          paymentFeeRate: form.paymentFeeRate === '' ? '0' : form.paymentFeeRate,
          optionPrices: options
            .filter((o) => form.prices[o.id] !== '')
            .map((o) => ({ optionId: o.id, salePrice: Math.round(toNum(form.prices[o.id])) })),
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

  let statusText = '저장됨'
  if (totalChanges > 0) statusText = `저장 안 된 변경 ${totalChanges}건`
  else if (toSave.length > 0) statusText = '아직 저장 안 됨'

  return (
    <main className="page-flat">
      <PageHeader title="가격 책정" back />

      <Link to={`/research/products/${product.id}`} className={research.linked}>
        <Thumb src={product.photoUrl} />
        <div className={styles.productBody}>
          <div className={styles.productTitle}>
            <span className={research.linkedTitle}>{product.titleKo || product.titleCn}</span>
            <span className={research.code}>{product.code}</span>
          </div>
          {survey && (
            <div className={research.hint}>
              기준 조사 {survey.code} · {survey.surveyDate} · 옵션 {options.length}개
            </div>
          )}
        </div>
      </Link>

      {/* 환율은 환율 설정에서 바꾼다 — 바꾸면 원가·배송비·차익이 다시 계산됨 (판매가는 그대로) */}
      <div className={styles.fxBar}>
        <span>
          환율 <strong>1위안 = {formatFx(fx.cnyKrw)}원</strong>
          <span className={styles.fxMeta}>
            {fx.date ? ` · ${fx.date} ${FX_SOURCE_LABEL[fx.source] || fx.source}` : ' · 기본값'}
            {' · 배송비는 옵션 용량으로 자동 계산'}
          </span>
        </span>
        <span className={styles.fxLinks}>
          <Link to="/shipping" className="btn-text">
            배송비
          </Link>
          <Link to="/exchange-rate" className="btn-text">
            환율 설정
          </Link>
        </span>
      </div>

      {!survey ? (
        <div className={styles.noSurvey}>
          <p>아직 가격조사가 없어요. 조사를 먼저 등록하면 판매가를 정할 수 있어요.</p>
          <Link
            to={`/research/prices/new?product=${encodeURIComponent(product.code)}`}
            className="btn-text"
          >
            가격조사 등록하기
          </Link>
        </div>
      ) : (
        <>
          <PricingBulkBar
            bulk={bulk}
            platforms={platforms}
            message={bulkMsg}
            onChange={(partial) => {
              setBulk((b) => ({ ...b, ...partial }))
              setBulkMsg(EMPTY_MSG)
            }}
            onApply={applyBulk}
          />

          <div className={styles.table} style={{ '--cols': platforms.length }}>
            {/* 머리 — 판매처별 수수료 · 요약 */}
            <div className={`${styles.grid} ${styles.head}`}>
              <div className={styles.headOpt}>옵션 · 원가</div>
              {platforms.map((p) => {
                const s = states[p.key]
                let badge = '저장 안 됨'
                if (s.changeCount > 0) badge = '바뀜'
                else if (saved[p.key].saved && !s.stale) badge = '저장됨'
                return (
                  <div key={p.key} className={styles.headCell}>
                    <div className={styles.headTitle}>
                      <span className={styles.platform}>{p.label}</span>
                      <span className={`${styles.status} ${s.needsSave ? styles.statusDirty : ''}`}>
                        {badge}
                      </span>
                    </div>
                    <div className={styles.fees}>
                      {FEE_FIELDS.map((f) => (
                        <label key={f.key} className={styles.fee}>
                          {f.label}
                          <input
                            className={`form-input ${styles.feeInput} ${
                              s.errors[f.key] ? 'form-input-error' : ''
                            }`}
                            type="text"
                            inputMode="decimal"
                            aria-label={`${p.label} ${f.label} (%)`}
                            value={forms[p.key][f.key]}
                            onChange={(e) =>
                              setFee(p.key, f.key, e.target.value.replace(/[^0-9.]/g, ''))
                            }
                          />
                          %
                        </label>
                      ))}
                    </div>
                    <div className={styles.sum}>
                      평균 <b>{formatPct(s.summary.avgMarginPct)}</b> · 최저{' '}
                      <b className={s.summary.minProfit < 0 ? styles.negText : ''}>
                        {formatWon(s.summary.minProfit)}
                      </b>
                      {s.summary.lossCount > 0 && (
                        <b className={styles.negText}> · 손해 {s.summary.lossCount}</b>
                      )}
                    </div>
                    {s.feeTooHigh && <div className="form-error">수수료 합계가 100% 이상이에요</div>}
                  </div>
                )
              })}
            </div>

            {options.map((o) => (
              <PricingOptionRow
                key={o.id}
                option={o}
                cost={costSettings ? costWithShipping(o, costSettings) : null}
                cells={platforms.map((p) => ({
                  platform: p,
                  value: forms[p.key].prices[o.id],
                  result: states[p.key].results[o.id],
                  addon: p.key === naverKey ? naver.byId[o.id] : undefined,
                  invalid: invalidPrice(forms[p.key].prices[o.id]),
                  changed: states[p.key].changedIds.has(o.id),
                }))}
                onChange={(platformKey, v) => setPrice(platformKey, o.id, v)}
              />
            ))}
          </div>

          {platforms
            .filter((p) => states[p.key].stale)
            .map((p) => (
              <p key={p.key} className={styles.notice}>
                {p.label}: 새 가격 조사가 있어요. 판매가를 다시 넣고 저장하세요
              </p>
            ))}

          {naver && naver.over.length > 0 && (
            <div className={styles.warnBox}>
              <b>네이버 등록 불가 {naver.over.length}건</b> · 대표가 {formatWon(naver.base)} 기준
              옵션 추가금은 최대 +{formatWon(naver.cap)}({naver.capPct}%)까지예요.{' '}
              {naver.over.map(optionName).join(', ')} 옵션이 한도를 넘어요.
            </div>
          )}

          <p className={styles.footHint}>
            쿠팡은 옵션마다 판매가를 따로 등록하고, 네이버는 최저 옵션가
            {naver?.base != null ? ` ${formatWon(naver.base)}` : ''}을 대표가로, 나머지는
            추가금으로 등록해요.
          </p>

          {saveError && <p className="form-error">{saveError}</p>}

          <div className={`sticky-cta ${styles.saveBar}`}>
            <span className={`${styles.saveStatus} ${totalChanges > 0 ? styles.statusDirty : ''}`}>
              {statusText}
            </span>
            <div className={styles.saveButtons}>
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
            </div>
          </div>
        </>
      )}
    </main>
  )
}
