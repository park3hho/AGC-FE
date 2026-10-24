// 주문 — 마켓 · 통관부호 검증 상태 · 추적 기록 이름

export const MARKETS = {
  naver: { label: '네이버', short: 'N' },
  coupang: { label: '쿠팡', short: 'C' },
}

export const PCCC_STATUS = {
  ok: { label: '통관부호 일치', short: '일치', tone: 'success' },
  mismatch: { label: '통관부호 불일치', short: '불일치', tone: 'danger' },
  missing: { label: '검증 못 함', short: '검증 못 함', tone: 'warning' },
  error: { label: '검증 오류', short: '오류', tone: 'warning' },
  pending: { label: '검증 전', short: '검증 전', tone: 'neutral' },
}

export const PCCC_FILTERS = ['all', 'mismatch', 'missing', 'error', 'ok']

// 마켓 원래 상태 → 한국어
export const MARKET_STATUS = {
  PAYMENT_WAITING: '입금 대기',
  PAYED: '결제완료',
  DELIVERING: '배송중',
  DELIVERED: '배송완료',
  PURCHASE_DECIDED: '구매확정',
  CANCELED: '취소',
  RETURNED: '반품',
  EXCHANGED: '교환',
  CANCELED_BY_NOPAYMENT: '미입금 취소',
  ACCEPT: '결제완료',
  INSTRUCT: '상품준비중',
  DEPARTURE: '배송지시',
  FINAL_DELIVERY: '배송완료',
  NONE_TRACKING: '추적 없음',
}

export const ACTOR = {
  system: { label: '시스템', tone: 'neutral' },
  agent: { label: '에이전트', tone: 'primary' },
  user: { label: '사람', tone: 'warning' },
}

export const VIA = {
  poller: '자동 수집',
  manual: '수동',
  api_key: 'API 키',
  session: '로그인',
  system: '시스템',
}

export const EVENT_KIND = {
  collected: '수집',
  changed: '변경',
  pccc_check: '통관부호 검증',
}
