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

// ---- 집운 묶음 (2026-11-11) — 받는 사람이 같은 주문 여러 건을 집운 한 번에
const toCandidate = (g) => ({
  key: g.key,
  receiver: g.receiver,
  region: g.region || '',
  ready: g.ready, // 창고에 들어온(아직 집운 안 묶인) 소포 수
  coming: g.coming, // 아직 오는 중 (판매처 발송 전 포함)
  orders: g.orders.map((o) => ({
    id: o.id,
    code: o.code || '',
    market: o.market,
    productName: o.product_name,
    optionName: o.option_name || '',
    quantity: o.quantity,
    hasJiyun: o.has_jiyun,
    shipDueAt: o.ship_due_at,
    parcels: o.parcels.map((p) => ({
      purchaseId: p.purchase_id,
      taobaoOrderNo: p.taobao_order_no,
      no: p.no || '',
      cnCourier: p.cn_courier || '',
      cnStatus: p.cn_status, // ordered · shipped · arrived
      ready: p.ready,
      arrivedAt: p.arrived_at,
    })),
  })),
})

export const getBundleCandidates = async () => {
  const data = await request('/jiyun-shipments/bundle-candidates', {
    errorMsg: '묶을 주문을 불러오지 못했어요',
  })
  return data.groups.map(toCandidate)
}

// orders: [{ orderId, packages: [...], weightKg }] · 금액은 묶음 합계 (BE 가 무게 비율로 나눔)
export const createJiyunBundle = async (form, orders) => {
  const { packages: _p, weight_kg: _w, ...rest } = toBody(form)
  const data = await request('/jiyun-shipments/bundle', {
    method: 'POST',
    body: {
      ...rest,
      orders: orders.map((o) => ({
        order_id: o.orderId,
        packages: o.packages,
        weight_kg: orNull(o.weightKg),
      })),
    },
    errorMsg: '집운 묶음을 저장하지 못했어요',
  })
  return data.items.map(toJiyun)
}

// 한 상자에 같은 값(상태 · 출고 · H B/L · 국내 택배사·송장)을 묶음 전체에
export const updateJiyunBundle = async (id, patch) => {
  const data = await request(`/jiyun-shipments/${id}/bundle`, {
    method: 'PATCH',
    body: patch,
    errorMsg: '집운 묶음을 수정하지 못했어요',
  })
  return data.items.map(toJiyun)
}
