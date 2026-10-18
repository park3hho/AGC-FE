import { fileUrl, request } from '@/api/client'

// BE 응답(snake_case) → 화면에서 쓰는 모양(camelCase). 스펙: docs/api-contract.md
export const toResearchSummary = (s) => ({
  id: s.id,
  code: s.code,
  productCode: s.product.code,
  researchedAt: s.survey_date,
  taobaoUrl: s.taobao_url,
  optionCount: s.option_count,
  minPriceCny: s.min_price_cny, // 문자열 "39.90" (소수 오차 방지)
  maxPriceCny: s.max_price_cny,
  coupangMinPrice: s.coupang_min_price,
  coupangUrl: s.coupang_url || '',
  naverMinPrice: s.naver_min_price,
  naverUrl: s.naver_url || '',
})

// TODO: 조사가 100개를 넘으면 화면에 페이지 넘김을 붙인다 (BE 는 page/size 지원)
export const getPriceResearches = async () => {
  const data = await request('/price-surveys?size=100', { errorMsg: '조사 목록을 불러오지 못했어요' })
  return data.items.map(toResearchSummary)
}

// 가격 조사 상세 (옵션 포함)
export const getPriceResearch = async (id) => {
  const data = await request(`/price-surveys/${id}`, { errorMsg: '조사를 불러오지 못했어요' })
  const s = data.price_survey
  return {
    ...toResearchSummary(s),
    productId: s.product.id,
    productTitle: s.product.title_ko || s.product.code,
    photoUrl: fileUrl(s.photo_url),
    options: s.options.map((o) => ({
      id: o.id,
      option1: o.option1,
      option2: o.option2 || '',
      priceCny: o.price_cny, // 문자열 "39.90"
      photoUrl: fileUrl(o.photo_url),
    })),
  }
}

// 다음 조사 코드번호 미리보기 (조사일 기준) — 실제 코드는 등록 응답의 code
export const getNextResearchCode = async (date) => {
  const data = await request(`/price-surveys/next-code?survey_date=${encodeURIComponent(date)}`)
  return data.code
}

const orNull = (v) => (v === '' || v === undefined ? null : v)

export const createPriceResearch = async (r) => {
  const data = await request('/price-surveys', {
    method: 'POST',
    body: {
      product_code: r.productCode,
      survey_date: r.researchedAt,
      photo_url: orNull(r.photoPath), // 연결된 제품 사진
      taobao_url: r.taobaoUrl,
      coupang_min_price: orNull(r.coupangMinPrice),
      coupang_url: orNull(r.coupangUrl),
      naver_min_price: orNull(r.naverMinPrice),
      naver_url: orNull(r.naverUrl),
      options: r.options.map((o) => ({
        option1: o.option1,
        option2: orNull(o.option2),
        price_cny: String(o.priceCny),
      })),
    },
    errorMsg: '조사를 저장하지 못했어요',
  })
  return toResearchSummary({ ...data.price_survey, min_price_cny: null, max_price_cny: null })
}
