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
})

// 제품별 기준 조사 옵션의 배송비 + 현재 환율 + 요금 규칙
export const getShippingFees = async ({ page = 1, size = 100 } = {}) => {
  const data = await request(`/shipping-fees?page=${page}&size=${size}`, {
    errorMsg: '배송비를 불러오지 못했어요',
  })
  return {
    fx: toFx(data.fx),
    rule: toRule(data.rule),
    items: data.items.map((it) => ({
      product: {
        id: it.product.id,
        code: it.product.code,
        titleCn: it.product.title_cn || '',
        titleKo: it.product.title_ko || '',
        photoUrl: fileUrl(it.product.photo_url),
      },
      survey: it.survey
        ? { id: it.survey.id, code: it.survey.code, surveyDate: it.survey.survey_date }
        : null,
      options: it.options.map(toShippingOption),
    })),
    total: data.total,
    page: data.page,
    size: data.size,
  }
}
