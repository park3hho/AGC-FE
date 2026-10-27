import { request } from '@/api/client'

// 주문 접수 API — 스펙: docs/api-contract.md '주문'
// 수취인·통관부호는 BE 가 가린 값만 준다.
const toOrder = (o) => ({
  id: o.id,
  code: o.code || '', // 자사 주문 코드 OR-YYMMDD-XXXX
  market: o.market, // 'naver' | 'coupang'
  lineNo: o.line_no,
  orderNo: o.order_no,
  shipUnitNo: o.ship_unit_no,
  marketStatus: o.market_status,
  confirmed: o.confirmed,
  claimType: o.claim_type || null, // 클레임 (CANCEL · RETURN · EXCHANGE · STOP_SHIPPING …) · 없으면 null
  claimStatus: o.claim_status || null,
  claimAt: o.claim_at || null,
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
  receiver: o.receiver, // { name, phone(통관용), contact_phone(쇼핑몰 연락처), zip, address, pccc } — 가린 값
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
  search, // 자사 코드 · 마켓 주문번호 검색
  page = 1,
  size = 200,
} = {}) => {
  const q = new URLSearchParams({ page, size })
  if (stage) q.set('stage', stage) // 비우면 모든 단계
  if (market) q.set('market', market)
  if (pccc) q.set('pccc', pccc)
  if (search) q.set('q', search)
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
  return toDetail(data)
}

// 상세 전용 수취인 원본 — 타오바오 한국 주소·배송에 쓴다. 통관용 전화와 쇼핑몰 연락처는 따로
const toReceiverFull = (r) =>
  r && {
    name: r.name || '',
    zip: r.zip || '',
    address: r.address || '',
    customsPhone: r.customs_phone || '',
    contactPhone: r.contact_phone || '',
    pccc: r.pccc || '',
  }

const toDetail = (data) => ({
  order: toOrder(data.order),
  events: data.events.map(toEvent),
  raw: data.raw_masked,
  receiverFull: toReceiverFull(data.receiver_full),
  // 타오바오에서 살 것 — 마켓 옵션 = 조사 옵션 × 묶음 수 (판매자 코드 · 마켓 등록 기록으로 찾음). 못 찾으면 null
  sourcing: data.sourcing
    ? {
        productId: data.sourcing.product_id,
        productCode: data.sourcing.product_code,
        productTitle: data.sourcing.product_title || '',
        taobaoUrl: data.sourcing.taobao_url || '',
        optionId: data.sourcing.option_id ?? null,
        option1: data.sourcing.option1 || '',
        option2: data.sourcing.option2 || '',
        priceCny: data.sourcing.price_cny ?? null,
        bundleQty: data.sourcing.bundle_qty ?? null,
        taobaoQty: data.sourcing.taobao_qty ?? null, // 주문 수량 × 묶음 수
        matchedBy: data.sourcing.matched_by,
      }
    : null,
})

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
  return toDetail(data)
}

// 앱 아래 바 — 마켓별 마지막 수집 + 자동 수집 주기 (가벼운 조회)
export const getCollectStatus = async () => {
  const data = await request('/orders/collect-status', {
    errorMsg: '수집 상태를 불러오지 못했어요',
    authRedirect: false,
  })
  return {
    lastRuns: { naver: toRun(data.last_runs.naver), coupang: toRun(data.last_runs.coupang) },
    pollMinutes: data.poll_minutes,
  }
}

// 주문을 가져온 뒤 아래 바가 바로 다시 읽게 알리는 이벤트 이름
export const ORDERS_COLLECTED_EVENT = 'agc:orders-collected'

// 발주확인 — 마켓에 '주문 확인했어요'를 보낸다 (쿠팡 상품준비중 · 네이버 발주 확인). 타오바오 구매 등록 전에 한다.
//   이미 확인된 주문이면 마켓에 다시 보내지 않고 already: true
export const confirmOrder = async (id) => {
  const data = await request(`/orders/${id}/confirm`, {
    method: 'POST',
    errorMsg: '발주확인을 보내지 못했어요',
  })
  return { ...toDetail(data), already: !!data.already }
}

// 주문 접수 화면 알림 — after(이벤트 id) 뒤 새 주문·새 클레임. after 없이 부르면 기준 id 만
const toUpdate = (u) => ({
  eventId: u.event_id,
  orderId: u.order_id,
  code: u.code,
  market: u.market,
  productName: u.product_name,
  summary: u.summary,
  at: u.at,
  auto: !!u.auto, // 자동 수집으로 들어왔는지
})
export const getOrderUpdates = async (after) => {
  const q = after == null ? '' : `?after=${after}`
  const data = await request(`/orders/updates${q}`, {
    errorMsg: '새 주문 소식을 불러오지 못했어요',
  })
  return {
    lastEventId: data.last_event_id,
    newOrders: data.new_orders.map(toUpdate),
    claims: data.claims.map(toUpdate),
  }
}
