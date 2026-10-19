// 가격 책정 계산 — 순수 함수 (BE DESIGN.md §6.3 공식)
//   실결제환율 = fxRate(현재 환율) × (1 + fxMarkupPct/100)
//   원가+배송  = (priceCny + shippingCny) × 실결제환율   ← 배송비도 위안이라 환율을 따라간다
//   수수료     = salePrice × (platformFeeRate + paymentFeeRate)/100
//   차익       = salePrice − 원가+배송 − 수수료
//   마진율     = 차익 / salePrice
// option: { priceCny, shippingCny } — shippingCny 가 null 이면(용량을 못 읽음) 계산하지 않는다
// settings: { fxRate, fxMarkupPct, platformFeeRate, paymentFeeRate } — 문자열·숫자 모두 받음
import { SALE_PRICE_UNIT } from '@/constants/pricingConst'

// 빈 값('' · null · undefined)은 NaN — 0 으로 착각하지 않게
export const toNum = (v) => (v === '' || v == null ? NaN : Number(v))

// "200.0000" → "200", "10.80" → "10.8" (입력칸 표시용, 문자열 그대로 다룬다)
export const trimDecimal = (v) => {
  if (v == null || v === '') return ''
  const s = String(v)
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

export const effectiveFxRate = ({ fxRate, fxMarkupPct }) =>
  toNum(fxRate) * (1 + (toNum(fxMarkupPct) || 0) / 100)

// 수수료율 합계 (%) — 결제 수수료는 비면 0, 플랫폼 수수료는 비면 NaN
export const totalFeeRate = ({ platformFeeRate, paymentFeeRate }) =>
  toNum(platformFeeRate) + (toNum(paymentFeeRate) || 0)

// 계산에 필요한 설정이 다 들어 있는지 (수수료율 100% 이상이면 계산 불가)
export const isSettingsReady = (settings) => {
  const fx = effectiveFxRate(settings)
  const fee = totalFeeRate(settings)
  return fx > 0 && Number.isFinite(fee) && fee >= 0 && fee < 100
}

// 위안 → 원 (환율이 없거나 값이 없으면 null)
export const cnyToKrw = (cny, rate) => {
  const v = toNum(cny)
  const r = toNum(rate)
  return v >= 0 && r > 0 ? v * r : null
}

// 원가 + 배송비 (원) — 환율이 없거나 배송비를 모르면 null
export const costWithShipping = (option, settings) => {
  const fx = effectiveFxRate(settings)
  const shipping = toNum(option.shippingCny)
  if (!(fx > 0) || !(shipping >= 0)) return null
  return (toNum(option.priceCny) + shipping) * fx
}

// 옵션 1개 계산 — 판매가가 없거나 설정·배송비가 모자라면 null
export const calcOption = (option, salePrice, settings) => {
  const sale = toNum(salePrice)
  if (!(sale > 0) || !isSettingsReady(settings)) return null
  const totalCost = costWithShipping(option, settings)
  if (totalCost == null) return null
  const fee = (sale * totalFeeRate(settings)) / 100
  const profit = sale - totalCost - fee
  return { totalCost, fee, profit, marginPct: (profit / sale) * 100 }
}

// "차익으로 맞추기" 역산 — 목표 차익을 내는 판매가 (SALE_PRICE_UNIT 단위 올림)
// salePrice = ceil((원가 + 배송비 + 목표차익) / (1 − 수수료율) / 단위) × 단위
// 계산 불가(수수료율 ≥ 100%, 설정·배송비 부족, 결과 ≤ 0)면 null
export const salePriceForProfit = (option, targetProfit, settings) => {
  if (!isSettingsReady(settings)) return null
  const target = toNum(targetProfit)
  if (!Number.isFinite(target)) return null
  const cost = costWithShipping(option, settings)
  if (cost == null) return null
  const rate = totalFeeRate(settings) / 100
  const raw = (cost + target) / (1 - rate)
  // 부동소수 오차로 19900.0000001 → 20000 이 되지 않게 아주 작은 값을 빼고 올림
  const price = Math.ceil(raw / SALE_PRICE_UNIT - 1e-9) * SALE_PRICE_UNIT
  return price > 0 ? price : null
}

// 요약 — results: calcOption 결과 배열 (null 은 판매가 없음 → 뺀다)
export const summarize = (results) => {
  const valid = results.filter(Boolean)
  if (valid.length === 0) return { count: 0, avgMarginPct: null, minProfit: null, lossCount: 0 }
  return {
    count: valid.length,
    avgMarginPct: valid.reduce((sum, r) => sum + r.marginPct, 0) / valid.length,
    minProfit: Math.min(...valid.map((r) => r.profit)),
    lossCount: valid.filter((r) => r.profit < 0).length,
  }
}

// 표시용 — 원 단위 정수 반올림, 마진율 소수 1자리
export const formatWon = (n) =>
  n == null ? '-' : `${(Math.round(n) || 0).toLocaleString('ko-KR')}원`
export const formatPct = (n) => (n == null ? '-' : `${n.toFixed(1)}%`)

// 위안 표시 — "55.00" → "¥55", "88.80" → "¥88.8"
export const formatCny = (v) => (v == null || v === '' ? '-' : `¥${trimDecimal(v)}`)

// 환율 표시 — "200.0000" → "200", "201.3500" → "201.35"
export const formatFx = (v) => trimDecimal(v)

// 무게 표시 — 6380 (g) → "6.38kg"
export const formatKgFromG = (g) => (g == null ? '-' : `${Number((g / 1000).toFixed(2))}kg`)
