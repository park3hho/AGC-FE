import { fileUrl, request } from '@/api/client'
import { toFx } from '@/api/exchangeRate'
import { toShippingOption } from '@/api/shipping'

// BE 응답(snake_case) → 화면에서 쓰는 모양(camelCase). 스펙: docs/api-contract.md
// 소수 값(fx_rate, *_rate, fx_markup_pct, price_cny)은 문자열 그대로 둔다 (소수 오차 방지)
const toPricing = (p) => ({
  platform: p.platform,
  saved: p.saved,
  surveyId: p.survey_id ?? null,
  fxRate: p.fx_rate, // 문자열 "200.0000" — 저장 시점 환율 (기록용, 계산은 현재 환율 fx 로)
  fxDate: p.fx_date ?? null,
  fxMarkupPct: p.fx_markup_pct, // 문자열 — 화면에 안 보이고 그대로 다시 보낸다
  shippingFee: p.shipping_fee, // 쓰지 않음 — 배송비는 옵션별 shippingCny
  platformFeeRate: p.platform_fee_rate ?? null, // 문자열 "10.80" · 아직 없으면 null
  paymentFeeRate: p.payment_fee_rate, // 문자열
  optionPrices: (p.option_prices || []).map((o) => ({
    optionId: o.option_id,
    salePrice: o.sale_price ?? null, // 정수 (원) · 없으면 null
  })),
  baseOptionId: p.base_option_id ?? null, // 대표 옵션 (네이버 추가금 0원) · null = 자동
  updatedAt: p.updated_at ?? null,
})

// 가격 책정 화면 데이터 — 제품 + 기준 조사(최신) + 현재 환율 + 옵션(배송비 포함) + 판매처별 설정
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
    fx: toFx(data.fx), // 현재 환율 — 원가·배송비 계산에 쓴다
    options: data.options.map(toShippingOption),
    pricings: Object.fromEntries(
      Object.entries(data.pricings || {}).map(([key, value]) => [key, toPricing(value)]),
    ),
  }
}

// 판매처 가격 저장 (통째로 바꿈) — body 는 camelCase, 소수는 문자열로 보낸다
// fxRate = 저장 시점 현재 환율 (기록용). 배송비는 보내지 않는다 (BE 가 옵션 용량으로 계산)
export const savePricing = async (productId, platform, body) => {
  const data = await request(`/products/${productId}/pricing/${platform}`, {
    method: 'PUT',
    body: {
      survey_id: body.surveyId,
      fx_rate: String(body.fxRate),
      fx_markup_pct: String(body.fxMarkupPct ?? '0'),
      platform_fee_rate: String(body.platformFeeRate),
      payment_fee_rate: String(body.paymentFeeRate ?? '0'),
      option_prices: body.optionPrices.map((o) => ({
        option_id: o.optionId,
        sale_price: Number(o.salePrice),
      })),
      base_option_id: body.baseOptionId ?? null, // 판매가가 있는 옵션만 · null = 자동
    },
    errorMsg: '가격을 저장하지 못했어요',
  })
  return toPricing(data.pricing)
}
