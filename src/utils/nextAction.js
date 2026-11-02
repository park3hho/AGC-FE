import { KR_COURIERS } from '@/constants/orderConst'

// 주문의 '지금 상태' — 주문 목록 · 주문 상세 · 홈이 모두 이 규칙 하나를 쓴다
// (플레이북 'AGC 모바일 화면 설계' §4.3, 2026-10-30 · 2026-11-02 '내가 할 일' / '기다리는 중' 나눔)
//
// kind: todo = 사람이 지금 해야 하는 것 (홈 › 할 일) · wait = 남(판매처·창고·택배·점검 루틴)을 기다림 (홈 › 진행 중)
//       none = 할 일 없음 (배송 중)
// 위에서 처음 맞는 것:
//   클레임 → 통관부호 불일치·없음 → 발주확인 전 → 타오바오 구매 없음 (여기까지 할 일)
//   → 판매처 발송 전 (기다림) → 입고 전 (기다림) → 집운 기록 없음 (할 일: 집운 결제)
//   → 집운 결제됨·출고 전 (기다림) → 출고됨·국내 송장 없음 (기다림 — 30분 점검이 송장 찾으면 자동 발송처리)
//   → (자사몰) 배송 완료 표시 (할 일) → 배송 중 (할 일 없음, 택배사·송장)
// 집운 결제는 사용자가 앱이나 PC 에서 직접 한다. 점검 루틴은 결제된 집운을 기록하고 국내 송장이 나오면 마켓 발송처리만 한다.
//
// 목록에는 구매·집운 기록이 없어서 BE 가 주는 progress 로 판단한다
//   progress = { step 0 구매 · 1 판매처 발송 · 2 입고(또는 집운 기록) · 3 출고(국제 발송), jiyun, tracking,
//                kr_courier, kr_tracking_no } · 기록이 없으면 null
// 상세에서는 purchases · jiyuns 를 넘기면 그걸로 더 정확하게 본다.

export const NEXT = {
  // 내가 할 일
  claim: { label: '클레임 처리', tone: 'danger', group: 'issue', kind: 'todo' },
  pccc: { label: '고객에게 통관부호 확인', tone: 'danger', group: 'issue', kind: 'todo' },
  confirm: { label: '발주확인 보내기', tone: 'primary', group: 'confirm', kind: 'todo' },
  purchase: { label: '타오바오 구매 기록', tone: 'primary', group: 'purchase', kind: 'todo' },
  jiyun: {
    label: '집운 결제하기 — 이 고객 소포만 따로 묶기',
    tone: 'primary',
    group: 'ship',
    kind: 'todo',
  },
  delivered: { label: '배송 완료 표시', tone: 'primary', group: 'delivered', kind: 'todo' },
  // 기다리는 중
  shipped: { label: '판매처 발송 기다리는 중', tone: 'neutral', group: 'wait_cn', kind: 'wait' },
  arrived: {
    label: '중국 배송 중 — 창고 입고 기다리는 중',
    tone: 'neutral',
    group: 'wait_cn',
    kind: 'wait',
  },
  dispatch: {
    label: '집운 결제 끝 — 창고 출고 기다리는 중',
    tone: 'neutral',
    group: 'wait_ship',
    kind: 'wait',
  },
  tracking: {
    label: '한국으로 배송 중 — 국내 송장 나오면 자동 발송처리',
    tone: 'neutral',
    group: 'wait_ship',
    kind: 'wait',
  },
  // 할 일 없음
  shipping: { label: '배송 중 — 할 일 없음', tone: 'neutral', group: null, kind: 'none' },
}

// 홈 › 할 일 묶음 — 사람이 실제로 할 것만 (주문 처리 먼저)
export const NEXT_GROUPS = [
  { key: 'issue', label: '클레임 · 통관부호 확인', sub: '고객 연락이 필요한 주문' },
  { key: 'confirm', label: '새 주문 발주확인', sub: '배송지·통관부호 보고 마켓에 확인 보내기' },
  { key: 'purchase', label: '타오바오 구매 기록하기', sub: '발주확인 끝, 구매기록 없음' },
  { key: 'ship', label: '집운 결제', sub: '창고에 들어온 소포를 고객별로 결제 (앱이나 PC)' },
  { key: 'delivered', label: '자사몰 배송 완료 표시', sub: '고객이 받은 주문을 배송 완료로' },
]

// 홈 › 진행 중 묶음 — 기다리는 것 (사람이 할 일 없음)
export const WAIT_GROUPS = [
  { key: 'wait_cn', label: '중국 안에서 오는 중', sub: '판매처 발송 · 창고 입고 기다리는 중' },
  {
    key: 'wait_ship',
    label: '한국으로 오는 중',
    sub: '창고 출고 · 국내 송장 기다리는 중 (송장 나오면 자동 발송처리)',
  },
]

// 국내 택배 — '우체국택배 1234…' (없으면 '')
export function trackingText(order, { jiyuns } = {}) {
  let courier, no
  if (jiyuns) {
    const j = jiyuns.find((x) => x.status !== 'cancelled' && x.krTrackingNo)
    courier = j?.krCourierName || KR_COURIERS[j?.krCourier] || j?.krCourier
    no = j?.krTrackingNo
  } else {
    courier = KR_COURIERS[order?.progress?.kr_courier] || order?.progress?.kr_courier
    no = order?.progress?.kr_tracking_no
  }
  return no ? `${courier || '택배'} ${no}` : ''
}

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

// 지금 상태 — { key, label, tone, group, kind, info? } · 끝났거나 취소면 null
//   info = 배송 중일 때 택배사 · 송장 번호
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
  if (!st.dispatched && !st.tracking) return pick('dispatch')
  if (!st.tracking) return pick('tracking')
  const info = trackingText(order, extra)
  if (order.market === 'shop' && order.marketStatus !== 'DELIVERED')
    return { ...pick('delivered'), info }
  return { ...pick('shipping'), info }
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
