import { request } from './client'

// 집운 묶음 PRE_LP… (2026-11-16) — BE routers/jiyun_bundle.py · services/order/bundle_service.py
//   같은 받는 사람 주문이 날짜 상관없이 open 묶음에 합류 → 확정 → 집운 결제(LP 번호) → 출고 → 완료
export const BUNDLE_STATUS = {
  open: { label: '모으는 중', tone: 'primary' },
  confirmed: { label: '확정 · 결제 대기', tone: 'warning' },
  paid: { label: '집운 결제', tone: 'success' },
  dispatched: { label: '출고', tone: 'success' },
  done: { label: '배송 완료', tone: 'weak' },
  cancelled: { label: '취소', tone: 'weak' },
}

const toBundle = (b) => ({
  id: b.id,
  code: b.code,
  status: b.status,
  lpNo: b.lp_no || '',
  tradeId: b.jiyun_trade_id || '',
  estWeightG: b.est_weight_g,
  maxWeightG: b.max_weight_g,
  isTest: b.is_test,
  size: b.size,
  codes: b.codes || [],
  arrived: b.arrived,
  total: b.total,
  ready: b.ready,
  createdAt: b.created_at,
  confirmedAt: b.confirmed_at,
  paidAt: b.paid_at,
  memo: b.memo || '',
  receiver: b.receiver || '',
  orders: (b.orders || []).map((o) => ({
    id: o.id,
    code: o.code,
    market: o.market,
    stage: o.stage,
    productName: o.product_name,
    optionName: o.option_name,
    quantity: o.quantity,
    weightG: o.weight_g,
    orderedAt: o.ordered_at,
    parcels: (o.parcels || []).map((p) => ({
      purchaseId: p.purchase_id,
      taobaoOrderNo: p.taobao_order_no,
      cnStatus: p.cn_status,
      cnTrackingNo: p.cn_tracking_no,
      arrivedAt: p.arrived_at,
    })),
  })),
  shipments: (b.shipments || []).map((j) => ({
    id: j.id,
    orderId: j.order_id,
    jiyunNo: j.jiyun_no,
    status: j.status,
    feeCny: j.fee_cny,
    chargedKrw: j.charged_krw,
  })),
})

export const getJiyunBundles = async (status = 'active') => {
  const data = await request(`/jiyun-bundles?status=${status}`, { errorMsg: '집운 묶음을 불러오지 못했어요' })
  return data.items.map(toBundle)
}

export const getJiyunBundle = async (code) => {
  const data = await request(`/jiyun-bundles/${encodeURIComponent(code)}`, {
    errorMsg: '집운 묶음을 불러오지 못했어요',
  })
  return toBundle(data.bundle)
}

export const confirmJiyunBundle = async (code, confirm = true) => {
  const data = await request(`/jiyun-bundles/${encodeURIComponent(code)}/${confirm ? 'confirm' : 'reopen'}`, {
    method: 'POST',
    errorMsg: confirm ? '묶음을 확정하지 못했어요' : '확정을 풀지 못했어요',
  })
  return toBundle(data.bundle)
}

// 주문 옮기기 — target: 묶음 code(PRE_LP…) · 주문 코드 · null = 따로(새 묶음)
export const moveToJiyunBundle = (orderId, target = null) =>
  request('/jiyun-bundles/move', {
    method: 'POST',
    body: { order_id: orderId, target },
    errorMsg: '주문을 옮기지 못했어요',
  })
