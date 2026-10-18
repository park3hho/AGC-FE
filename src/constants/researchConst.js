export const RESEARCH_STATUS = {
  REVIEW: 'review',
  ADOPTED: 'adopted',
  HOLD: 'hold',
}

export const RESEARCH_STATUS_LABEL = {
  review: '검토 중',
  adopted: '채택',
  hold: '보류',
}

// 가격 계산 기본값 — 마진 공식이 정해지기 전 임시값 (루트 CLAUDE.md 미정 사항)
export const PRICE_DEFAULTS = {
  cnyToKrw: 195,
  shippingKrw: 8000,
  feeRate: 0.11,
}
