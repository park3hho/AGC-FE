import { fileUrl, request } from '@/api/client'

// BE 응답(snake_case) → 화면에서 쓰는 모양(camelCase). 스펙: docs/api-contract.md
// 소수 값(fx_rate, *_rate, fx_markup_pct, price_cny)은 문자열 그대로 둔다 (소수 오차 방지)
const toPricing = (p) => ({
  platform: p.platform,
  saved: p.saved,
  surveyId: p.survey_id ?? null,
  fxRate: p.fx_rate, // 문자열 "200.0000"
  fxDate: p.fx_date ?? null,
  fxMarkupPct: p.fx_markup_pct, // 문자열 — 화면에 안 보이고 그대로 다시 보낸다
  shippingFee: p.shipping_fee, // 정수 (원)
  platformFeeRate: p.platform_fee_rate ?? null, // 문자열 "10.80" · 아직 없으면 null
  paymentFeeRate: p.payment_fee_rate, // 문자열
  optionPrices: (p.option_prices || []).map((o) => ({
    optionId: o.option_id,
    salePrice: o.sale_price ?? null, // 정수 (원) · 없으면 null
  })),
  updatedAt: p.updated_at ?? null,
})

// 가격 책정 화면 데이터 — 제품 + 기준 조사(최신) + 옵션 + 판매처별 설정
export const getPricing = async (productId) => {
  const data = await request(`/products/${productId}/pricing`, {
    errorMsg: '가격 책정 정보를 불러오지 못했어요',
  })
  const p = data.product
  return {
    product: {
      id: p.id,
      code: p.code,
      titleCn: p.title_cn || '',
      titleKo: p.title_ko || '',
      photoUrl: fileUrl(p.photo_url),
    },
    survey: data.survey
      ? { id: data.survey.id, code: data.survey.code, surveyDate: data.survey.survey_date }
      : null,
    options: data.options.map((o) => ({
      id: o.id,
      option1: o.option1,
      option2: o.option2 || '',
      priceCny: o.price_cny, // 문자열 "39.90"
      photoUrl: fileUrl(o.photo_url),
    })),
    pricings: Object.fromEntries(
      Object.entries(data.pricings || {}).map(([key, value]) => [key, toPricing(value)]),
    ),
  }
}

// 판매처 가격 저장 (통째로 바꿈) — body 는 camelCase, 소수는 문자열로 보낸다
export const savePricing = async (productId, platform, body) => {
  const data = await request(`/products/${productId}/pricing/${platform}`, {
    method: 'PUT',
    body: {
      survey_id: body.surveyId,
      fx_rate: String(body.fxRate),
      fx_markup_pct: String(body.fxMarkupPct ?? '0'),
      shipping_fee: Number(body.shippingFee),
      platform_fee_rate: String(body.platformFeeRate),
      payment_fee_rate: String(body.paymentFeeRate ?? '0'),
      option_prices: body.optionPrices.map((o) => ({
        option_id: o.optionId,
        sale_price: Number(o.salePrice),
      })),
    },
    errorMsg: '가격을 저장하지 못했어요',
  })
  return toPricing(data.pricing)
}
