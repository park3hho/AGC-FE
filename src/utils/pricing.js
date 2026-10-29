// 가격 책정 계산 — 순수 함수 (BE DESIGN.md §6.3 공식)
//   실결제환율 = fxRate(현재 환율) × (1 + fxMarkupPct/100)
//   원가+배송  = (priceCny + shippingCny) × 실결제환율   ← 배송비도 위안이라 환율을 따라간다
//   수수료     = salePrice × (platformFeeRate + paymentFeeRate)/100
//   차익       = salePrice − 원가+배송 − 수수료
//   마진율     = 차익 / salePrice
// option: { priceCny, shippingCny } — shippingCny 가 null 이면(용량을 못 읽음) 계산하지 않는다
// settings: { fxRate, fxMarkupPct, platformFeeRate, paymentFeeRate } — 문자열·숫자 모두 받음
import { MARKET_PLATFORMS, NAVER_ADDON_LIMITS, SALE_PRICE_UNIT } from '@/constants/pricingConst'

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

// "목표 마진으로 맞추기" 역산 — 차익/판매가 = 목표 마진율이 되는 판매가 (SALE_PRICE_UNIT 단위 올림)
// salePrice = ceil(원가+배송 / (1 − 수수료율 − 목표마진율) / 단위) × 단위
// 수수료율 + 목표마진율 ≥ 100% 이거나 설정·배송비가 모자라면 null
export const salePriceForMargin = (option, targetMarginPct, settings) => {
  if (!isSettingsReady(settings)) return null
  const margin = toNum(targetMarginPct)
  if (!Number.isFinite(margin)) return null
  const cost = costWithShipping(option, settings)
  if (cost == null) return null
  const denom = 1 - totalFeeRate(settings) / 100 - margin / 100
  if (!(denom > 0)) return null
  const price = Math.ceil(cost / denom / SALE_PRICE_UNIT - 1e-9) * SALE_PRICE_UNIT
  return price > 0 ? price : null
}

// 네이버 옵션 추가금 허용 범위 (원) — 대표가 기준 (NAVER_ADDON_LIMITS). min 은 0 이하(차감)
export const naverAddonRange = (basePrice) => {
  const rule = NAVER_ADDON_LIMITS.find((r) => basePrice >= r.minBase)
  if (!rule) return null
  return {
    min: Math.ceil((basePrice * rule.minPct) / 100),
    max: Math.floor((basePrice * rule.maxPct) / 100),
    minPct: rule.minPct,
    maxPct: rule.maxPct,
  }
}

// ── 네이버 상품 나눠 등록 (2026-10-20) ──
// 한 상품에 모든 옵션을 넣으면 추가금 한도를 넘을 때, 상품 여러 개로 나눈다.
//   1) 한 상품에 다 들어가면 그대로 1개
//   2) 안 되면 용량·입수(option2)별로 묶고, 묶음 안에서도 넘으면 가격으로 더 나눈다
//   대표 = 묶음 안 옵션이 모두 한도 안에 드는 가장 싼 옵션 (검색에 보이는 가격이 낮게)
// 사람이 직접 정한 것(manual)은 자동보다 우선한다.

const bySale = (a, b) => a.sale - b.sale

const fitsAll = (base, items) => {
  const r = naverAddonRange(base.sale)
  return !!r && items.every((i) => i.sale - base.sale >= r.min && i.sale - base.sale <= r.max)
}

// 모두 한도 안에 드는 가장 싼 대표 — 없으면 null
const cheapestFittingBase = (items) =>
  [...items].sort(bySale).find((b) => fitsAll(b, items)) || null

// 가격으로 나누기 — 싼 것부터 한 묶음에 최대한 많이
const splitByPrice = (items) => {
  let rest = [...items].sort(bySale)
  const groups = []
  while (rest.length) {
    let k = rest.length
    while (k > 1 && !cheapestFittingBase(rest.slice(0, k))) k -= 1
    groups.push(rest.slice(0, k))
    rest = rest.slice(k)
  }
  return groups
}

// items: [{ id, sale, pack }] — 판매가가 있는 옵션만. pack = 용량·입수(option2)
// manual: { groupOf: { [id]: 상품 번호 }, baseIds: [id] } — 직접 정한 묶음·대표
// 반환: { groups: [{ no, ids, baseId, base, range, autoBase, overIds, recommendedId }],
//         byId: { [id]: { group, amount, isBase, over, autoBase, manualGroup } }, overIds } · 옵션이 없으면 null
export const naverListingPlan = (items, manual = {}) => {
  if (!items.length) return null
  const groupOf = manual.groupOf || {}
  const baseIds = new Set(manual.baseIds || [])

  const autoItems = items.filter((i) => groupOf[i.id] == null)
  let autoGroups = []
  if (autoItems.length && cheapestFittingBase(autoItems)) {
    autoGroups = [autoItems]
  } else if (autoItems.length) {
    const packs = new Map()
    for (const i of autoItems) packs.set(i.pack || '', [...(packs.get(i.pack || '') || []), i])
    autoGroups = [...packs.values()].flatMap(splitByPrice)
  }
  const minSale = (g) => Math.min(...g.map((i) => i.sale))
  const slots = [...autoGroups].sort((a, b) => minSale(a) - minSale(b)).map((g) => [...g])
  for (const i of items) {
    const n = groupOf[i.id]
    if (n == null) continue
    while (slots.length < n) slots.push([])
    slots[n - 1].push(i)
  }

  const byId = {}
  const overIds = []
  const groups = slots
    .filter((g) => g.length)
    .map((g, idx) => {
      const no = idx + 1
      const manualBase = g.find((i) => baseIds.has(i.id)) || null
      const recommended = cheapestFittingBase(g)
      const base = manualBase || recommended || [...g].sort(bySale)[0]
      const range = naverAddonRange(base.sale)
      const groupOver = []
      for (const i of g) {
        const amount = i.sale - base.sale
        const over = !range || amount < range.min || amount > range.max
        byId[i.id] = {
          group: no,
          amount,
          isBase: i.id === base.id,
          over,
          autoBase: !manualBase,
          manualGroup: groupOf[i.id] != null,
        }
        if (over) groupOver.push(i.id)
      }
      overIds.push(...groupOver)
      return {
        no,
        ids: g.map((i) => i.id),
        baseId: base.id,
        base: base.sale,
        range,
        autoBase: !manualBase,
        overIds: groupOver,
        recommendedId: recommended ? recommended.id : null,
      }
    })
  return { groups, byId, overIds }
}

// 추가금 표시 — 3500 → "+3,500", -3800 → "−3,800", 0 → "0"
export const formatAddon = (n) => {
  if (!n) return '0'
  const s = Math.abs(n).toLocaleString('ko-KR')
  return n > 0 ? `+${s}` : `−${s}`
}

// 숫자 입력칸 — 화면에는 "36,200", 상태에는 숫자만 "36200"
export const digitsOnly = (v) => String(v ?? '').replace(/[^0-9]/g, '')
export const withCommas = (v) => {
  const d = digitsOnly(v)
  return d === '' ? '' : Number(d).toLocaleString('ko-KR')
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

// 제품의 가격 책정 상태 (constants/pricingConst.PRICING_STATUS 키)
export const pricingStatusOf = (pricedPlatforms, hasSurvey) => {
  // 가격 책정 완료 = 마켓(쿠팡·네이버) 모두 저장. 자사몰가는 따로 (없어도 완료)
  const done = MARKET_PLATFORMS.filter((p) => pricedPlatforms.includes(p.key)).length
  if (done === MARKET_PLATFORMS.length) return 'done'
  if (!hasSurvey) return 'nosurvey'
  return done > 0 ? 'partial' : 'pending'
}
