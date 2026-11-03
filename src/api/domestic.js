import { request } from '@/api/client'

// 국내 배송 기록 — 국내 택배 송장 1개 = 1건. 고객 주문 1건에 붙는다 (2026-11-03)
// 집운 기록의 국내 송장 · 마켓 원본 송장에서 BE 가 자동으로 만들고, 5분 수집 때 마켓 발송처리 · 배송 조회를 갱신한다
// 스펙: docs/api-contract.md '국내 배송 기록'
const toDomestic = (d) => ({
  id: d.id,
  jiyunId: d.jiyun_id,
  courier: d.courier || '', // KR_COURIERS 키
  courierName: d.courier_name || '',
  trackingNo: d.tracking_no,
  trackingUrl: d.tracking_url, // tracker.delivery 조회 화면
  status: d.status, // 'ready' | 'dispatched' | 'delivering' | 'delivered' | 'problem' | 'cancelled'
  source: d.source, // 'jiyun' | 'market' | 'manual'
  sourceLabel: d.source_label,
  marketCourier: d.market_courier || '',
  marketCourierName: d.market_courier_name || '',
  marketTrackingNo: d.market_tracking_no || '',
  marketSentAt: d.market_sent_at,
  marketWrong: d.market_wrong,
  marketMatch: d.market_match, // 마켓에 이 송장으로 발송처리 됐는지
  trackState: d.track_state || '',
  trackStateId: d.track_state_id || '',
  trackLocation: d.track_location || '',
  trackLastAt: d.track_last_at,
  trackEvents: d.track_events || [], // [{ time, status, location, description }] 오래된 것부터
  trackError: d.track_error || '',
  trackedAt: d.tracked_at,
  deliveredAt: d.delivered_at,
  memo: d.memo || '',
  createdAt: d.created_at,
  order: {
    id: d.order.id,
    code: d.order.code || '',
    market: d.order.market,
    orderNo: d.order.order_no,
    marketStatus: d.order.market_status,
    productName: d.order.product_name,
    optionName: d.order.option_name || '',
    quantity: d.order.quantity,
  },
})

export const getDomesticList = async ({ orderId, limit } = {}) => {
  const p = new URLSearchParams()
  if (orderId) p.set('order_id', orderId)
  if (limit) p.set('limit', limit)
  const data = await request(`/domestic-shipments${p.size ? `?${p}` : ''}`, {
    errorMsg: '국내 배송 기록을 불러오지 못했어요',
  })
  return data.items.map(toDomestic)
}

export const getDomestic = async (id) => {
  const data = await request(`/domestic-shipments/${id}`, {
    errorMsg: '국내 배송 기록을 불러오지 못했어요',
  })
  return toDomestic(data.domestic)
}

const orNull = (v) => (v === '' || v == null ? null : v)

export const updateDomestic = async (id, form) => {
  const data = await request(`/domestic-shipments/${id}`, {
    method: 'PATCH',
    body: {
      courier: orNull(form.courier),
      tracking_no: form.trackingNo,
      status: form.status,
      memo: orNull(form.memo),
    },
    errorMsg: '국내 배송 기록을 수정하지 못했어요',
  })
  return toDomestic(data.domestic)
}

export const refreshDomestic = async (id) => {
  const data = await request(`/domestic-shipments/${id}/refresh`, {
    method: 'POST',
    errorMsg: '배송 조회를 하지 못했어요',
  })
  return toDomestic(data.domestic)
}

export const deleteDomestic = (id) =>
  request(`/domestic-shipments/${id}`, {
    method: 'DELETE',
    errorMsg: '국내 배송 기록을 삭제하지 못했어요',
  })
