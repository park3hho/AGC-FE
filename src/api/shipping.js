import { fileUrl, request } from '@/api/client'
import { toFx } from '@/api/exchangeRate'

// 옵션 + 배송비 (가격 책정 · 배송비 화면 공통). 스펙: docs/api-contract.md ShippingOption
// 용량을 못 읽은 옵션은 volumeMl · weightG · billableKg · shippingCny 가 null
export const toShippingOption = (o) => ({
  id: o.id,
  option1: o.option1,
  option2: o.option2 || '',
  priceCny: o.price_cny, // 문자열 "39.90"
  photoUrl: fileUrl(o.photo_url),
  volumeMl: o.volume_ml ?? null, // 정수 (ml)
  weightG: o.weight_g ?? null, // 정수 (g) — 용량 + 박스
  billableKg: o.billable_kg ?? null, // 문자열 "6.5" — 요금 계산 무게
  shippingCny: o.shipping_cny ?? null, // 문자열 "55.00" (위안)
  overLimit: !!o.over_limit, // 30kg 초과 — 집운 소형으로 못 보냄
  boxAssumed: !!o.box_assumed, // 용량을 못 읽어 최소 상자(세 변 합 50cm)로 계산한 값 (2026-10-30)
  dimWeightG: o.dim_weight_g ?? null, // 부피 무게 (g) — 차만. 계산 무게는 실제·부피 중 큰 값
})

const toRule = (r) => ({
  service: r.service,
  category: r.category,
  firstKg: r.first_kg,
  firstCny: r.first_cny,
  stepKg: r.step_kg,
  stepCny: r.step_cny,
  maxKg: r.max_kg,
  boxWeightG: r.box_weight_g,
  // 타오바오 공식 집운 안내 (표시용 — 계산은 식품 요율)
  eta: r.eta || '',
  rates: (r.rates || []).map((x) => ({
    name: x.name,
    cn: x.cn,
    range: x.range,
    price: x.price,
    applied: !!x.applied, // AGC 계산에 쓰는 요율
  })),
  billableRule: r.billable_rule || '',
  rounding: r.rounding || [],
  sizeLimits: r.size_limits || [],
  taxNote: r.tax_note || '',
  notes: r.notes || [],
  volumetric: r.volumetric
    ? {
        divisor: r.volumetric.divisor,
        appliesTo: r.volumetric.applies_to, // 'tea'
        boxCm: r.volumetric.box_cm, // [30, 20, 15]
        boxWeightG: r.volumetric.box_weight_g, // 상자 1개 부피 무게 (g)
        sourceUrl: r.volumetric.source_url,
        sourceNote: r.volumetric.source_note,
      }
    : null,
  sourceUrl: r.source_url || '',
  sourceChecked: r.source_checked || '',
})

// 배송비 화면 — 요금 규칙 + 무게 구간별 요금표(위안) + 현재 환율. 원화는 화면에서 환율을 곱한다
export const getShippingRule = async () => {
  const data = await request('/shipping-fees/rule', {
    errorMsg: '배송비 요금표를 불러오지 못했어요',
  })
  return {
    fx: toFx(data.fx),
    rule: toRule(data.rule),
    brackets: data.brackets.map((b) => ({
      billableKg: b.billable_kg, // 문자열 "6.5"
      maxVolumeMl: b.max_volume_ml, // 정수 — 이 구간에 들어가는 최대 용량 (박스 뺀 값)
      shippingCny: b.shipping_cny, // 문자열 "55.00"
    })),
  }
}
