import { request } from '@/api/client'

// 타오바오 구매 · 중국 내 배송 (판매처 → 집운 창고) — 타오바오 주문번호 하나로 식별, 고객 주문 1건에 붙는다
// 바꿀 때마다 BE 가 그 고객 주문의 추적 기록에 남긴다 (이전값 → 새값). 스펙: docs/api-contract.md '타오바오 구매'
const toPurchase = (p) => ({
  id: p.id,
  taobaoOrderNo: p.taobao_order_no || '',
  shopName: p.shop_name || '',
  itemUrl: p.item_url || '',
  items: (p.items || []).map((i) => ({ name: i.name, qty: i.qty, priceCny: i.price_cny || '' })),
  paidCny: p.paid_cny || '',
  purchasedAt: p.purchased_at,
  purchasedBy: p.purchased_by, // { id, name } | null
  cnStatus: p.cn_status, // 'ordered' | 'shipped' | 'arrived' | 'problem' | 'cancelled'
  shippedAt: p.shipped_at,
  cnCourier: p.cn_courier || '',
  cnTrackingNo: p.cn_tracking_no || '',
  arrivedAt: p.arrived_at,
  statusSource: p.status_source, // 'manual' | 'poll'
  statusCheckedAt: p.status_checked_at,
  memo: p.memo || '',
  order: {
    id: p.order.id,
    code: p.order.code || '',
    market: p.order.market,
    orderNo: p.order.order_no,
    productName: p.order.product_name,
    optionName: p.order.option_name || '',
    quantity: p.order.quantity,
  },
})

export const getPurchases = async ({ orderId } = {}) => {
  const q = orderId ? `?order_id=${orderId}` : ''
  const data = await request(`/taobao-purchases${q}`, {
    errorMsg: '타오바오 구매를 불러오지 못했어요',
  })
  return data.items.map(toPurchase)
}

export const getPurchase = async (id) => {
  const data = await request(`/taobao-purchases/${id}`, {
    errorMsg: '타오바오 구매를 불러오지 못했어요',
  })
  return toPurchase(data.purchase)
}

const orNull = (v) => (v === '' || v == null ? null : v)

// 화면 값 → BE 본문. 시각은 ISO(+09:00) 로 받는다
const toBody = (f) => ({
  taobao_order_no: f.taobaoOrderNo,
  shop_name: orNull(f.shopName),
  item_url: orNull(f.itemUrl),
  items: f.items.map((i) => ({ name: i.name, qty: Number(i.qty), price_cny: orNull(i.priceCny) })),
  paid_cny: orNull(f.paidCny),
  purchased_at: orNull(f.purchasedAt),
  cn_status: f.cnStatus,
  shipped_at: orNull(f.shippedAt),
  cn_courier: orNull(f.cnCourier),
  cn_tracking_no: orNull(f.cnTrackingNo),
  arrived_at: orNull(f.arrivedAt),
  memo: orNull(f.memo),
})

export const createPurchase = async (orderId, form) => {
  const data = await request('/taobao-purchases', {
    method: 'POST',
    body: { order_id: Number(orderId), ...toBody(form) },
    errorMsg: '타오바오 구매를 저장하지 못했어요',
  })
  return toPurchase(data.purchase)
}

export const updatePurchase = async (id, form) => {
  const data = await request(`/taobao-purchases/${id}`, {
    method: 'PATCH',
    body: toBody(form),
    errorMsg: '타오바오 구매를 수정하지 못했어요',
  })
  return toPurchase(data.purchase)
}

export const deletePurchase = (id) =>
  request(`/taobao-purchases/${id}`, {
    method: 'DELETE',
    errorMsg: '타오바오 구매를 삭제하지 못했어요',
  })
