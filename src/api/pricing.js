import { fileUrl, request } from '@/api/client'
import { toFx } from '@/api/exchangeRate'
import { toShippingOption } from '@/api/shipping'

// 판매 옵션 줄 키 — 묶음 1 은 조사 옵션 id(숫자) 그대로, 2 이상은 "66x2" (BE bundle_key 와 같은 꼴)
export const rowIdOf = (optionId, bundleQty = 1) =>
  bundleQty > 1 ? `${optionId}x${bundleQty}` : optionId

// 묶음 판매 옵션 (조사 옵션 × N) — 옵션과 같은 모양 + 묶음 정보. 원가·운임은 묶음 전체 기준
const toBundle = (b) => ({
  ...toShippingOption({ ...b, id: b.key }),
  optionId: b.option_id,
  bundleQty: b.bundle_qty,
  suggested: !!b.suggested, // 10kg 규칙이 제안한 묶음
  marketOption1: b.market_option1,
  marketOption2: b.market_option2 || '', // 마켓에 올릴 용량·입수 "330ml×48캔"
  packNote: b.pack_note || '', // "24캔×2"
  totalCount: b.total_count ?? null,
  overDutyFree: !!b.over_duty_free, // 상품가가 면세 한도($150 근사)를 넘을 수 있음
})

const toOptionPrice = (o) => ({
  optionId: o.option_id,
  bundleQty: o.bundle_qty || 1, // 묶음 수 — 1 = 조사 옵션 그대로
  rowId: rowIdOf(o.option_id, o.bundle_qty || 1), // 화면 줄 키 (옵션 id · "66x2")
  salePrice: o.sale_price ?? null, // 정수 (원) · 없으면 null
  listingGroup: o.listing_group ?? null, // (네이버) 직접 정한 상품 번호 · null = 자동
  isBase: !!o.is_base, // (네이버) 그 상품의 대표로 직접 지정
})

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
  // 조사 옵션 그대로 파는 판매가 (묶음 1) — 기준 조사 옵션 순서와 같다
  optionPrices: (p.option_prices || []).map(toOptionPrice),
  // 묶음(조사 옵션 × N) 판매가 — 가격 책정 화면만 쓴다
  bundlePrices: (p.bundle_prices || []).map(toOptionPrice),
  // 예전 방식(상품 1개일 때의 대표 옵션) — 읽기만 하고, 저장은 옵션별 isBase 로 한다
  baseOptionId: p.base_option_id ?? null,
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
    bundles: (data.bundles || []).map(toBundle),
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
        bundle_qty: o.bundleQty || 1,
        sale_price: Number(o.salePrice),
        listing_group: o.listingGroup ?? null, // 네이버 상품 나누기 — 직접 정한 것만
        is_base: !!o.isBase,
      })),
      base_option_id: null, // 예전 방식 — 더 안 씀 (옵션별 is_base)
    },
    errorMsg: '가격을 저장하지 못했어요',
  })
  return toPricing(data.pricing)
}
