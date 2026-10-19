import { useMemo, useState } from 'react'

import { savePricing } from '@/api/pricing'
import { BULK_MODES } from '@/constants/pricingConst'
import {
  calcOption,
  costWithShipping,
  formatPct,
  formatWon,
  salePriceForProfit,
  summarize,
  toNum,
  totalFeeRate,
  trimDecimal,
} from '@/utils/pricing'
import OptionPriceRow from './OptionPriceRow'
import styles from './Pricing.module.css'

// 서버 Pricing → 입력칸 값 (전부 문자열)
// 환율·배송비는 여기서 입력하지 않는다 — 환율은 환율 설정, 배송비는 옵션 용량으로 자동 계산
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

const sameForm = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// 설정 입력칸 정의 — 2칸 그리드 순서
const SETTING_FIELDS = [
  { key: 'platformFeeRate', label: '플랫폼 수수료 (%)', inputMode: 'decimal' },
  { key: 'paymentFeeRate', label: '결제 수수료 (%)', inputMode: 'decimal' },
]

export default function PlatformPricingSection({
  productId, // number|string: 제품 id
  platform, // { key, label, priceMode }: PLATFORMS 항목
  survey, // { id, code, surveyDate }: 기준 조사 (최신)
  options, // Array<ShippingOption>: 기준 조사 옵션 (priceCny · shippingCny 포함)
  fx, // { cnyKrw, date, source }: 현재 환율 — 원가·배송비 계산에 씀
  initialPricing, // Pricing: GET 응답의 이 판매처 설정
}) {
  const [pricing, setPricing] = useState(initialPricing) // 마지막으로 서버에서 받은 값
  const [form, setForm] = useState(() => toForm(initialPricing, options))
  const [bulkMode, setBulkMode] = useState(BULK_MODES[0].key)
  const [bulkAmount, setBulkAmount] = useState('')
  const [bulkError, setBulkError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const baseline = useMemo(() => toForm(pricing, options), [pricing, options])
  const dirty = !sameForm(form, baseline)
  const stale = pricing.saved && pricing.surveyId !== survey.id // 저장 뒤 새 조사가 생김
  const needsSave = dirty || !pricing.saved || stale

  // 계산에 쓰는 설정 — 환율은 현재 환율, 실결제 가산율은 화면에 없고 서버 값 그대로
  const settings = { ...form, fxRate: fx.cnyKrw, fxMarkupPct: pricing.fxMarkupPct }
  const feeRate = totalFeeRate(settings)

  // 입력 검증
  const inPct = (v) => toNum(v) >= 0 && toNum(v) <= 100
  const fieldErrors = {}
  if (form.platformFeeRate === '') fieldErrors.platformFeeRate = '수수료를 입력하세요'
  else if (!inPct(form.platformFeeRate)) fieldErrors.platformFeeRate = '0~100 사이로 입력하세요'
  if (form.paymentFeeRate !== '' && !inPct(form.paymentFeeRate)) {
    fieldErrors.paymentFeeRate = '0~100 사이로 입력하세요'
  }
  const feeTooHigh = Number.isFinite(feeRate) && feeRate >= 100

  const invalidPrice = (v) => v !== '' && !(toNum(v) >= 1)
  const hasPriceError = options.some((o) => invalidPrice(form.prices[o.id]))
  const canSave = Object.keys(fieldErrors).length === 0 && !hasPriceError && !saving

  // 옵션별 계산
  const rows = options.map((o) => ({
    option: o,
    cost: costWithShipping(o, settings),
    result: calcOption(o, form.prices[o.id], settings),
  }))
  const summary = summarize(rows.map((r) => r.result))

  // 네이버: 판매가 있는 옵션 중 최저가 = 대표가, 나머지는 추가금
  const isAddon = platform.priceMode === 'base_addon'
  const filledPrices = options.map((o) => toNum(form.prices[o.id])).filter((n) => n >= 1)
  const basePrice = filledPrices.length ? Math.min(...filledPrices) : null

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const setPrice = (optionId, value) =>
    setForm((f) => ({ ...f, prices: { ...f.prices, [optionId]: value } }))

  const applyBulk = () => {
    if (bulkAmount === '') return setBulkError('금액을 입력하세요')
    if (bulkMode === 'sale') {
      const price = Math.round(toNum(bulkAmount))
      if (!(price >= 1)) return setBulkError('판매가는 1원 이상으로 입력하세요')
      setForm((f) => ({
        ...f,
        prices: Object.fromEntries(options.map((o) => [o.id, String(price)])),
      }))
      return setBulkError('')
    }
    // 차익 모드 — 옵션마다 역산
    if (feeTooHigh) return setBulkError('수수료가 100% 이상이라 계산할 수 없어요')
    if (Object.keys(fieldErrors).length) return setBulkError('위 설정을 먼저 채워 주세요')
    // 배송비를 모르는 옵션(용량을 못 읽음)은 건너뛰고 알려 준다
    const next = {}
    const skipped = []
    for (const o of options) {
      if (o.shippingCny == null) {
        skipped.push(o)
        continue
      }
      const price = salePriceForProfit(o, bulkAmount, settings)
      if (price == null) return setBulkError('이 차익으로는 판매가를 계산할 수 없어요')
      next[o.id] = String(price)
    }
    setForm((f) => ({ ...f, prices: { ...f.prices, ...next } }))
    setBulkError(
      skipped.length
        ? `용량을 못 읽은 옵션 ${skipped.length}개는 배송비를 몰라 그대로 뒀어요`
        : '',
    )
  }

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    setSaveError('')
    try {
      const saved = await savePricing(productId, platform.key, {
        surveyId: survey.id,
        fxRate: fx.cnyKrw, // 저장 시점 환율 기록
        fxMarkupPct: pricing.fxMarkupPct ?? '0',
        platformFeeRate: form.platformFeeRate,
        paymentFeeRate: form.paymentFeeRate === '' ? '0' : form.paymentFeeRate,
        optionPrices: options
          .filter((o) => form.prices[o.id] !== '')
          .map((o) => ({ optionId: o.id, salePrice: Math.round(toNum(form.prices[o.id])) })),
      })
      setPricing(saved)
      setForm(toForm(saved, options))
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  let statusText = '저장 안 됨'
  if (dirty) statusText = '바뀐 내용 있음'
  else if (pricing.saved && !stale) statusText = '저장됨'

  return (
    <section className={styles.section} id={platform.key}>
      {/* a) 헤더 */}
      <div className={styles.head}>
        <div className={styles.headTitle}>
          <span className={styles.platform}>{platform.label}</span>
          <span className={`${styles.status} ${dirty ? styles.statusDirty : ''}`}>
            {statusText}
          </span>
        </div>
        <button
          className={`${needsSave ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={save}
          disabled={!canSave}
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>

      {stale && (
        <p className={styles.notice}>새 가격 조사가 있어요. 판매가를 다시 넣고 저장하세요</p>
      )}
      {saveError && <p className="form-error">{saveError}</p>}

      {/* b) 요약 */}
      <div className={styles.summary}>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>평균 마진율</span>
          <span className={styles.tileValue}>{formatPct(summary.avgMarginPct)}</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>최저 차익</span>
          <span className={`${styles.tileValue} ${summary.minProfit < 0 ? styles.loss : ''}`}>
            {formatWon(summary.minProfit)}
          </span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>손해 옵션</span>
          <span className={`${styles.tileValue} ${summary.lossCount > 0 ? styles.loss : ''}`}>
            {summary.count ? `${summary.lossCount}개` : '-'}
          </span>
        </div>
      </div>

      {/* c) 수수료 2칸 — 환율·배송비는 자동 */}
      <div className={styles.settings}>
        {SETTING_FIELDS.map((f) => (
          <label key={f.key} className={styles.field}>
            <span className={styles.fieldLabel}>{f.label}</span>
            <input
              className={`form-input ${styles.compact} ${fieldErrors[f.key] ? 'form-input-error' : ''}`}
              type="number"
              inputMode={f.inputMode}
              min={0}
              value={form[f.key]}
              onChange={(e) => setField(f.key, e.target.value)}
            />
            {fieldErrors[f.key] && <span className="form-error">{fieldErrors[f.key]}</span>}
          </label>
        ))}
      </div>
      {feeTooHigh && <p className="form-error">수수료 합계가 100% 이상이라 계산할 수 없어요</p>}

      {/* d) 일괄 적용 */}
      <div>
        <div className={styles.bulk}>
          <div className={styles.segment} role="group" aria-label="일괄 적용 방식">
            {BULK_MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`${styles.segmentItem} ${bulkMode === m.key ? styles.segmentActive : ''}`}
                aria-pressed={bulkMode === m.key}
                onClick={() => {
                  setBulkMode(m.key)
                  setBulkError('')
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
          <input
            className={`form-input ${styles.compact} ${styles.priceInput} ${bulkError ? 'form-input-error' : ''}`}
            type="number"
            inputMode="numeric"
            placeholder="금액 (원)"
            aria-label="일괄 적용 금액"
            value={bulkAmount}
            onChange={(e) => {
              setBulkAmount(e.target.value)
              setBulkError('')
            }}
          />
          <button className={`btn-secondary btn-sm ${styles.bulkButton}`} onClick={applyBulk}>
            전체 적용
          </button>
        </div>
        {bulkError && <p className="form-error">{bulkError}</p>}
      </div>

      {/* e) 옵션 목록 */}
      <div className={styles.options}>
        {rows.map((r) => {
          const sale = toNum(form.prices[r.option.id])
          return (
            <OptionPriceRow
              key={r.option.id}
              option={r.option}
              value={form.prices[r.option.id]}
              cost={r.cost}
              result={r.result}
              addon={isAddon && basePrice != null && sale >= 1 ? sale - basePrice : undefined}
              invalid={invalidPrice(form.prices[r.option.id])}
              onChange={(v) => setPrice(r.option.id, v)}
            />
          )
        })}
      </div>

      <p className={styles.footHint}>
        {isAddon
          ? basePrice != null
            ? `${platform.label}는 최저 옵션가 ${formatWon(basePrice)}을 대표가로, 나머지는 추가금으로 등록해요`
            : `${platform.label}는 최저 옵션가를 대표가로, 나머지는 추가금으로 등록해요`
          : `${platform.label}은 옵션마다 판매가를 따로 등록해요`}
      </p>
    </section>
  )
}
