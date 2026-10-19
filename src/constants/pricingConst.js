// 가격 책정 상수 — 판매처 키는 BE core/pricing_config.Platform 과 같아야 한다
// priceMode: 'each' = 옵션마다 판매가 따로 등록 · 'base_addon' = 최저 옵션가를 대표가로, 나머지는 추가금
export const PLATFORMS = [
  { key: 'coupang', label: '쿠팡', priceMode: 'each' },
  { key: 'naver', label: '네이버', priceMode: 'base_addon' },
]

// 마진율이 이 값(%) 이상이면 초록색으로 강조 — 임시 기준, 사용자 확정 전
export const GOOD_MARGIN_PCT = 20

// 판매가 단위 (원) — 입력 step, "차익으로 맞추기" 올림 단위
export const SALE_PRICE_UNIT = 100

// 일괄 적용 방식
export const BULK_MODES = [
  { key: 'sale', label: '판매가' },
  { key: 'profit', label: '차익' },
]

// 환율 출처 — BE core/pricing_config.FxSource 와 같아야 한다
export const FX_SOURCE_LABEL = {
  manual: '직접 입력',
  default: '기본값',
}
