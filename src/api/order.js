import { request } from '@/api/client'

// 주문 접수 API — 스펙: docs/api-contract.md '주문'
// 수취인·통관부호는 BE 가 가린 값만 준다.
const toOrder = (o) => ({
  id: o.id,
  market: o.market, // 'naver' | 'coupang'
  lineNo: o.line_no,
  orderNo: o.order_no,
  shipUnitNo: o.ship_unit_no,
  marketStatus: o.market_status,
  confirmed: o.confirmed,
  stage: o.stage,
  orderedAt: o.ordered_at,
  paidAt: o.paid_at,
  shipDueAt: o.ship_due_at,
  productName: o.product_name,
  optionName: o.option_name || '',
  sellerCode: o.seller_code || '',
  quantity: o.quantity,
  unitPrice: o.unit_price,
  totalPrice: o.total_price,
  receiver: o.receiver, // { name, phone, zip, address, pccc } — 가린 값
  pcccStatus: o.pccc_status, // 'ok' | 'mismatch' | 'missing' | 'error' | 'pending'
  pcccMessage: o.pccc_message || '',
  pcccCheckedAt: o.pccc_checked_at,
  pcccValidTo: o.pccc_valid_to,
  lastSyncedAt: o.last_synced_at,
})

const toRun = (r) =>
  r && {
    id: r.id,
    market: r.market,
    trigger: r.trigger, // 'manual' | 'poller'
    rangeFrom: r.range_from,
    rangeTo: r.range_to,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    fetched: r.fetched,
    created: r.created,
    changed: r.changed,
    checked: r.checked,
    ok: r.ok,
    error: r.error || '',
  }

const toEvent = (e) => ({
  id: e.id,
  at: e.at,
  actorType: e.actor_type, // 'system' | 'agent' | 'user'
  actorName: e.actor_name || '',
  via: e.via,
  kind: e.kind,
  summary: e.summary,
  data: e.data || {},
  syncRunId: e.sync_run_id,
})

export const getOrders = async ({
  stage = 'received',
  market,
  pccc,
  page = 1,
  size = 200,
} = {}) => {
  const q = new URLSearchParams({ stage, page, size })
  if (market) q.set('market', market)
  if (pccc) q.set('pccc', pccc)
  const data = await request(`/orders?${q}`, { errorMsg: '주문을 불러오지 못했어요' })
  return {
    items: data.items.map(toOrder),
    total: data.total,
    pcccCounts: data.pccc_counts,
    lastRuns: { naver: toRun(data.last_runs.naver), coupang: toRun(data.last_runs.coupang) },
    pollMinutes: data.poll_minutes,
  }
}

export const getOrder = async (id) => {
  const data = await request(`/orders/${id}`, { errorMsg: '주문을 불러오지 못했어요' })
  return { order: toOrder(data.order), events: data.events.map(toEvent) }
}

export const collectOrders = async (markets = ['naver', 'coupang']) => {
  const data = await request('/orders/collect', {
    method: 'POST',
    body: { markets },
    errorMsg: '주문을 가져오지 못했어요',
  })
  return data.runs.map(toRun)
}

export const recheckPccc = async (id) => {
  const data = await request(`/orders/${id}/pccc-check`, {
    method: 'POST',
    errorMsg: '통관부호를 검증하지 못했어요',
  })
  return { order: toOrder(data.order), events: data.events.map(toEvent) }
}
