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
  mock: '목업 데이터',
  manual: '수동',
  api_key: 'API 키',
  session: '로그인',
  system: '시스템',
}

export const EVENT_KIND = {
  collected: '수집',
  changed: '변경',
  pccc_check: '통관부호 검증',
  purchase_created: '타오바오 구매 추가',
  purchase_changed: '타오바오 구매 수정',
  purchase_linked: '타오바오 구매 연결',
  purchase_unlinked: '타오바오 구매 연결 해제',
  purchase_deleted: '타오바오 구매 삭제',
}

// 중국 내 배송 (타오바오 판매처 → 집운 창고) — BE core/purchase_config.CN_STATUS
export const CN_STATUS = {
  ordered: { label: '주문함', hint: '판매처 발송 전', tone: 'neutral' },
  shipped: { label: '판매처 발송', hint: '집운 창고로 가는 중', tone: 'primary' },
  arrived: { label: '창고 입고', hint: '집운 창고에 도착', tone: 'success' },
  problem: { label: '문제', hint: '지연·누락·파손', tone: 'danger' },
  cancelled: { label: '취소·환불', hint: '', tone: 'neutral' },
}

// 중국 택배사 — 입력칸 추천 (목록에 없어도 저장된다)
export const CN_COURIERS = [
  '中通 (ZTO)',
  '圆通 (YTO)',
  '申通 (STO)',
  '韵达 (Yunda)',
  '顺丰 (SF)',
  '极兔 (J&T)',
  '京东 (JD)',
  '邮政 (EMS)',
  '德邦 (Deppon)',
]
