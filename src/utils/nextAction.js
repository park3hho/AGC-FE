// 주문의 '다음 할 일' — 주문 목록 · 주문 상세 · 홈 할 일이 모두 이 규칙 하나를 쓴다
// (플레이북 'AGC 모바일 화면 설계' §4.3, 2026-10-30)
//
// 위에서 처음 맞는 것:
//   클레임 → 통관부호 불일치·없음 → 발주확인 전 → 타오바오 구매 없음 → 판매처 발송 전 → 입고 전
//   → 집운 요청 없음 → 국내 송장 없음 → (자사몰) 배송 완료 표시
//
// 목록에는 구매·집운 기록이 없어서 BE 가 주는 progress 로 판단한다
//   progress = { step 0 구매 · 1 판매처 발송 · 2 입고(또는 집운 요청) · 3 국제 발송, jiyun, tracking } · 기록이 없으면 null
// 상세에서는 purchases · jiyuns 를 넘기면 그걸로 더 정확하게 본다.

export const NEXT = {
  claim: { label: '클레임 처리', tone: 'danger', group: 'issue' },
  pccc: { label: '고객에게 통관부호 확인', tone: 'danger', group: 'issue' },
  confirm: { label: '발주확인 보내기', tone: 'primary', group: 'confirm' },
  purchase: { label: '타오바오 구매 기록', tone: 'primary', group: 'purchase' },
  shipped: { label: '판매처 발송 확인', tone: 'primary', group: 'cn' },
  arrived: { label: '입고 확인', tone: 'primary', group: 'cn' },
  jiyun: { label: '집운 배송 요청', tone: 'primary', group: 'ship' },
  tracking: { label: '국내 송장 넣기', tone: 'primary', group: 'ship' },
  delivered: { label: '배송 완료 표시', tone: 'primary', group: 'ship' },
  shipping: { label: '배송 중 — 할 일 없음', tone: 'neutral', group: null },
}

// 홈 할 일 묶음 (주문 처리 먼저)
export const NEXT_GROUPS = [
  { key: 'issue', label: '클레임 · 통관부호 확인', sub: '고객 연락이 필요한 주문' },
  { key: 'confirm', label: '새 주문 발주확인', sub: '배송지·통관부호 보고 마켓에 확인 보내기' },
  { key: 'purchase', label: '타오바오 구매 기록하기', sub: '발주확인 끝, 구매기록 없음' },
  { key: 'cn', label: '판매처 발송 · 입고 확인', sub: '중국 운송장 · 집운 창고 입고' },
  { key: 'ship', label: '집운 요청 · 국내 송장', sub: '창고에서 한국으로 보내기' },
]

// 진행 상태 — { confirmed, purchase, shipped, arrived, jiyun, dispatched, tracking }
export function orderState(order, { purchases, jiyuns } = {}) {
  const st = { confirmed: !!order.confirmed }
  if (purchases) {
    const live = purchases.filter((p) => p.cnStatus !== 'cancelled')
    st.purchase = live.length > 0
    st.shipped = st.purchase && live.every((p) => ['shipped', 'arrived'].includes(p.cnStatus))
    st.arrived = st.purchase && live.every((p) => p.cnStatus === 'arrived')
  } else {
    const p = order.progress
    st.purchase = !!p
    st.shipped = !!p && p.step >= 1
    st.arrived = !!p && (p.step >= 2 || !!p.jiyun)
  }
  if (jiyuns) {
    const live = jiyuns.filter((j) => j.status !== 'cancelled')
    st.jiyun = live.length > 0
    st.dispatched = live.some((j) => j.status === 'dispatched')
    st.tracking = live.some((j) => !!j.krTrackingNo)
  } else {
    const p = order.progress
    st.jiyun = !!p?.jiyun
    st.dispatched = !!p && p.step >= 3
    st.tracking = !!p?.tracking
  }
  // 집운 기록이 있으면 창고까지는 왔다고 본다 (입고 표시를 빠뜨려도 다음 할 일이 뒤로 가지 않게)
  if (st.jiyun) st.arrived = st.shipped = st.purchase = true
  return st
}

// 다음 할 일 — { key, label, tone, group } · 끝났거나 취소면 null
export function nextAction(order, extra) {
  if (!order || order.stage === 'cancelled') return null
  const pick = (key) => ({ key, ...NEXT[key] })
  if (order.claimType) return pick('claim')
  if (order.stage === 'done') return null
  if (['mismatch', 'missing'].includes(order.pcccStatus)) return pick('pccc')
  if (!order.confirmed) return pick('confirm')
  const st = orderState(order, extra)
  if (!st.purchase) return pick('purchase')
  if (!st.shipped) return pick('shipped')
  if (!st.arrived) return pick('arrived')
  if (!st.jiyun) return pick('jiyun')
  if (!st.tracking) return pick('tracking')
  if (order.market === 'shop' && order.marketStatus !== 'DELIVERED') return pick('delivered')
  return pick('shipping')
}

// 상세 위 진행 6칸 — 접수 · 발주확인 · 구매 · 창고 · 국제 · 배송. 반환: 끝난 칸 수(0~6)
export const STEPS6 = ['접수', '발주확인', '구매', '창고', '국제', '배송']
export function stepsDone(order, extra) {
  if (!order) return 0
  if (order.stage === 'done') return 6
  const st = orderState(order, extra)
  let n = 1
  if (st.confirmed) n = 2
  if (n === 2 && st.purchase) n = 3
  if (n === 3 && st.arrived) n = 4
  if (n === 4 && st.dispatched) n = 5
  if (n === 5 && st.tracking) n = 6
  return n
}
