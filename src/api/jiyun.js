import { request } from '@/api/client'

// 집운 기록 — 배대지(집운) 배송 요청 · 배송비 결제 · 출고 · 국제 운송장 · 국내 송장. 고객 주문 1건에 붙는다
// 바꿀 때마다 BE 가 그 고객 주문의 추적 기록에 남긴다 (이전값 → 새값). 스펙: docs/api-contract.md '집운 기록'
const toJiyun = (j) => ({
  id: j.id,
  jiyunNo: j.jiyun_no || '',
  status: j.status, // 'requested' | 'dispatched' | 'problem' | 'cancelled'
  packages: j.packages || [], // 묶인 소포 — 중국 운송장 번호들
  weightKg: j.weight_kg || '',
  feeCny: j.fee_cny || '',
  transport: j.transport || '', // 'sea' | 'air'
  requestedAt: j.requested_at,
  payMethod: j.pay_method || '',
  payCurrency: j.pay_currency || '',
  payAmount: j.pay_amount || '',
  chargedKrw: j.charged_krw ?? '',
  chargedStatus: j.charged_status || 'none',
  chargedAt: j.charged_at,
  chargedSource: j.charged_source || '',
  dispatchedAt: j.dispatched_at,
  hbl: j.hbl || '',
  krCourier: j.kr_courier || '', // 'CJGLS' …
  krCourierName: j.kr_courier_name || '',
  krTrackingNo: j.kr_tracking_no || '',
  memo: j.memo || '',
  order: {
    id: j.order.id,
    code: j.order.code || '',
    market: j.order.market,
    orderNo: j.order.order_no,
    productName: j.order.product_name,
    optionName: j.order.option_name || '',
    quantity: j.order.quantity,
  },
})

export const getJiyunList = async ({ orderId, limit } = {}) => {
  const p = new URLSearchParams()
  if (orderId) p.set('order_id', orderId)
  if (limit) p.set('limit', limit)
  const data = await request(`/jiyun-shipments${p.size ? `?${p}` : ''}`, {
    errorMsg: '집운 기록을 불러오지 못했어요',
  })
  return data.items.map(toJiyun)
}

export const getJiyun = async (id) => {
  const data = await request(`/jiyun-shipments/${id}`, {
    errorMsg: '집운 기록을 불러오지 못했어요',
  })
  return toJiyun(data.jiyun)
}

const orNull = (v) => (v === '' || v == null ? null : v)

const toBody = (f) => ({
  jiyun_no: f.jiyunNo,
  status: f.status,
  packages: f.packages,
  weight_kg: orNull(f.weightKg),
  fee_cny: orNull(f.feeCny),
  transport: orNull(f.transport),
  requested_at: orNull(f.requestedAt),
  pay_method: orNull(f.payMethod),
  pay_currency: orNull(f.payCurrency),
  pay_amount: orNull(f.payAmount),
  charged_krw: f.chargedKrw === '' || f.chargedKrw == null ? null : Number(f.chargedKrw),
  charged_status: f.chargedStatus || 'none',
  charged_at: orNull(f.chargedAt),
  charged_source: orNull(f.chargedSource),
  dispatched_at: orNull(f.dispatchedAt),
  hbl: orNull(f.hbl),
  kr_courier: orNull(f.krCourier),
  kr_tracking_no: orNull(f.krTrackingNo),
  memo: orNull(f.memo),
})

export const createJiyun = async (orderId, form) => {
  const data = await request('/jiyun-shipments', {
    method: 'POST',
    body: { order_id: Number(orderId), ...toBody(form) },
    errorMsg: '집운 기록을 저장하지 못했어요',
  })
  return toJiyun(data.jiyun)
}

export const updateJiyun = async (id, form) => {
  const data = await request(`/jiyun-shipments/${id}`, {
    method: 'PATCH',
    body: toBody(form),
    errorMsg: '집운 기록을 수정하지 못했어요',
  })
  return toJiyun(data.jiyun)
}

export const deleteJiyun = (id) =>
  request(`/jiyun-shipments/${id}`, { method: 'DELETE', errorMsg: '집운 기록을 삭제하지 못했어요' })
