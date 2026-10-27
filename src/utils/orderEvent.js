import { CLAIM_TYPE, EVENT_KIND, MARKET_STATUS, ORDER_STAGES } from '@/constants/orderConst'

// 추적 기록 '변경' 이벤트 이름 — 수집 때 달라진 내용(data.diff)을 보고 붙인다 (2026-10-27).
//   이미 쌓인 기록도 diff 가 있으니 화면에서만 이 규칙으로 보여준다 (데이터는 그대로).

// diff 항목 이름 (어느 규칙에도 안 맞을 때 '변경 · 수량, 금액' 처럼)
export const DIFF_FIELD = {
  market_status: '마켓 상태',
  confirmed: '발주확인',
  stage: '단계',
  quantity: '수량',
  total_price: '금액',
  product_name: '상품명',
  option_name: '옵션',
  ship_due_at: '발송기한',
  claim_type: '클레임',
  claim_status: '클레임 상태',
}

// '2026-10-30T14:59:59+00:00' → '10-30' (KST)
const md = (v) => {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(5)
}

const stageLabel = (s) => ORDER_STAGES.find((x) => x.key === s)?.label || s

// 값 하나를 사람이 읽는 글자로 — 펼침의 '이전값 → 새값'
export const diffValue = (field, v) => {
  if (v == null || v === '' || v === 'None') return '없음'
  if (field === 'market_status') return MARKET_STATUS[v] || v
  if (field === 'ship_due_at') return md(v)
  if (field === 'stage') return stageLabel(v)
  if (field === 'claim_type') return CLAIM_TYPE[v] || v
  if (field === 'confirmed') return v === true || v === 'True' || v === 'true' ? '됨' : '안 됨'
  if (field === 'total_price') return `${Number(v).toLocaleString('ko-KR')}원`
  return String(v)
}

// 이벤트 이름 — changed 만 내용별로, 나머지는 EVENT_KIND 그대로
export function eventTitle(event) {
  const base = EVENT_KIND[event.kind] || event.kind
  if (event.kind !== 'changed') return base
  const d = event.data || {}
  const diff = d.diff || {}
  const keys = Object.keys(diff)
  const due = diff.ship_due_at
  const dueText = due
    ? new Date(due[1]) > new Date(due[0])
      ? `발송지연 안내 · 발송기한 ${md(due[0])} → ${md(due[1])}`
      : `발송기한 ${md(due[0])} → ${md(due[1])}`
    : ''

  // 1) 마켓 상태가 바뀜 → '고객 주문 상태 변경 (상품준비중)' (+ 발송기한이 같이 바뀌면 뒤에)
  if (diff.market_status) {
    const to = MARKET_STATUS[diff.market_status[1]] || diff.market_status[1]
    return `고객 주문 상태 변경 (${[to, dueText].filter(Boolean).join(' · ')})`
  }
  // 2) 클레임이 생기거나 바뀜
  if (diff.claim_type || diff.claim_status) {
    const t = diff.claim_type?.[1] ?? null
    return `클레임 (${t ? CLAIM_TYPE[t] || t : diffValue('claim_status', diff.claim_status?.[1])})`
  }
  // 3) 단계만 바뀜 (취소 등)
  if (diff.stage) return `고객 주문 상태 변경 (${stageLabel(diff.stage[1])})`
  // 4) 발송기한만 바뀜 — 늦춰졌으면 발송지연 안내
  if (due) return `고객 주문 상태 변경 (${dueText})`
  // 5) 발주확인만 바뀜
  if (diff.confirmed && keys.length === 1) return '발주확인됨 (마켓에서)'
  // 6) 수취인·통관 정보
  if (!keys.length && d.receiver_now) return '수취인·통관 정보 변경'
  // 그 밖 — '변경 · 수량, 금액'
  const names = keys.map((k) => DIFF_FIELD[k] || k)
  if (d.receiver_now) names.push('수취인·통관 정보')
  return names.length ? `${base} · ${names.join(', ')}` : base
}

// 펼침용 — [{ label, from, to }]
export const diffLines = (event) =>
  Object.entries(event.data?.diff || {}).map(([k, [a, b]]) => ({
    key: k,
    label: DIFF_FIELD[k] || k,
    from: diffValue(k, a),
    to: diffValue(k, b),
  }))

// 수집 방식 — data.run(2026-10-27 부터) → 없으면 via 로
export const collectMode = (event) => {
  const run = event.data?.run
  if (run) return run.auto ? '자동 수집' : '수동 수집'
  if (event.via === 'poller') return '자동 수집'
  if (['collected', 'changed', 'claim'].includes(event.kind) && event.syncRunId) return '수동 수집'
  return null
}
