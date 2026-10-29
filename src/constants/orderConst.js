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
  code_issued: '자사 코드 발급',
  purchase_created: '타오바오 구매기록 등록',
  purchase_changed: '타오바오 구매기록 수정',
  purchase_deleted: '타오바오 구매기록 삭제',
  jiyun_created: '집운 기록 등록',
  jiyun_changed: '집운 기록 수정',
  jiyun_deleted: '집운 기록 삭제',
  market_confirmed: '발주확인',
  market_confirm_failed: '발주확인 실패',
  claim: '클레임',
  stage: '단계 변경',
  dispatch_delayed: '발송지연',
  warehouse_requested: '집운 배송 요청',
  warehouse_dispatched: '집운 출고',
  market_dispatched: '마켓 발송처리',
  customs_status: '통관',
  domestic_status: '국내 배송',
  delivered: '배송완료',
  purchase_decided: '구매확정',
  settled: '정산',
  document_add: '증빙 추가',
  document_delete: '증빙 삭제',
}

// 추적 기록의 큰 단계 · 세부 단계 (data.stage · data.step) — 진행 막대 순서
export const TRACE_STAGE = {
  receive: { label: '접수', tone: 'neutral' },
  process: { label: '처리', tone: 'primary' },
  done: { label: '완료', tone: 'success' },
}

export const TRACE_STEPS = [
  { step: '신규 주문', stage: 'receive' },
  { step: '확인', stage: 'receive' },
  { step: '발주확인', stage: 'receive' },
  { step: '타오바오 구매', stage: 'process' },
  { step: '중국 내 배송', stage: 'process' },
  { step: '배대지 입고', stage: 'process' },
  { step: '국제 발송', stage: 'process' },
  { step: '통관', stage: 'process' },
  { step: '국내 배송', stage: 'process' },
  { step: '도착', stage: 'done' },
  { step: '구매확정 · 정산', stage: 'done' },
]

// data.step 이 없는 기록 → 세부 단계
export const KIND_STEP = {
  collected: '신규 주문',
  code_issued: '신규 주문',
  pccc_check: '확인',
  market_confirmed: '발주확인',
  market_confirm_failed: '발주확인',
  dispatch_delayed: '발주확인',
  purchase_created: '타오바오 구매',
  jiyun_created: '국제 발송',
  warehouse_requested: '국제 발송',
  warehouse_dispatched: '국제 발송',
  market_dispatched: '국제 발송',
  customs_status: '통관',
  domestic_status: '국내 배송',
  delivered: '도착',
  purchase_decided: '구매확정 · 정산',
  settled: '구매확정 · 정산',
}

// 기록의 출처 (data.source) — 값이 어디서 왔는지
export const TRACE_SOURCE = {
  naver_api: '네이버 API',
  coupang_api: '쿠팡 API',
  unipass: '관세청 UNI-PASS',
  jiyun: '집운',
  taobao: '타오바오',
  manual: '사람 입력',
  agent: '에이전트',
}

// 관련 번호 (data.refs) 이름
export const TRACE_REF = {
  product_order_id: '상품주문번호',
  taobao_order_no: '타오바오',
  cn_courier: '중국 택배',
  cn_tracking_no: '중국 운송장',
  jiyun_request_no: '집운 요청',
  hbl: 'H B/L',
  kr_courier: '국내 택배',
  kr_tracking_no: '국내 송장',
}

// 주문 목록 단계 탭
export const ORDER_STAGES = [
  { key: 'received', label: '접수' },
  { key: 'processing', label: '처리' },
  { key: 'done', label: '완료' },
  { key: 'cancelled', label: '취소' }, // 취소·반품 완료 — 사유와 함께 (2026-10-27)
  { key: 'all', label: '전체' },
]

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

// 타오바오 실제 결제 — BE core/purchase_config
export const PAY_METHOD = {
  card: '카드',
  kakaopay: '카카오페이',
  alipay: '알리페이',
  other: '기타',
}
export const PAY_CURRENCY = ['USD', 'KRW', 'CNY']
export const CHARGED_STATUS = {
  none: { label: '미확인', tone: 'warning' },
  approved: { label: '승인 금액', tone: 'primary' },
  settled: { label: '청구 확정', tone: 'success' },
}

// 집운 기록 — BE core/jiyun_config.JIYUN_STATUS
export const JIYUN_STATUS = {
  requested: { label: '배송 요청', hint: '집운에 배송 요청·배송비 결제', tone: 'primary' },
  dispatched: { label: '집운 출고', hint: '한국으로 출발', tone: 'success' },
  problem: { label: '문제', hint: '지연·누락·파손', tone: 'danger' },
  cancelled: { label: '취소', hint: '', tone: 'neutral' },
}

// 국내 택배사 — BE core/shipping_config.COURIERS (마켓 발송처리 코드)
export const KR_COURIERS = {
  CJGLS: 'CJ대한통운',
  HANJIN: '한진택배',
  LOTTE: '롯데택배',
  EPOST: '우체국택배',
  KGB: '로젠택배',
}

export const TRANSPORTS = { sea: '해운', air: '항공' }

// 클레임 종류 (BE order_service.CLAIM_LABEL 과 같게) — 2026-10-27
export const CLAIM_TYPE = {
  CANCEL: '취소',
  ADMIN_CANCEL: '취소(관리자)',
  RETURN: '반품',
  EXCHANGE: '교환',
  STOP_SHIPPING: '출고중지 요청',
  PURCHASE_DECISION_HOLDBACK: '구매확정 보류',
}

// 클레임 한 줄 — 끝난 클레임(주문 단계가 취소)이면 '취소 완료' · '반품 완료', 아니면 '출고중지 요청' 처럼 (2026-10-27)
export const claimLabel = ({ claimType, stage }) => {
  if (!claimType) return ''
  const t = CLAIM_TYPE[claimType] || claimType
  return stage === 'cancelled' && !t.endsWith('요청') ? `${t} 완료` : t
}
