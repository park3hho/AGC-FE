import { request } from '@/api/client'

// 집운 가용재고 (2026-11-18) — 고객 취소 뒤 환불 못 받은 타오바오 소포를 창고에 두고 같은 상품 다음 주문에 쓴다
const toItem = (s) => ({
  id: s.id,
  status: s.status,
  statusLabel: s.status_label,
  sku: s.sku || '',
  productCode: s.product_code || '',
  bundleQty: s.bundle_qty,
  label: s.label,
  costCny: s.cost_cny,
  costKrw: s.cost_krw,
  expiresOn: s.expires_on,
  usedAt: s.used_at,
  closedAt: s.closed_at,
  createdAt: s.created_at,
  memo: s.memo || '',
  where: s.where || '',
  purchase: s.purchase
    ? {
        id: s.purchase.id,
        taobaoOrderNo: s.purchase.taobao_order_no,
        shopName: s.purchase.shop_name || '',
        cnStatus: s.purchase.cn_status,
        cnTrackingNo: s.purchase.cn_tracking_no || '',
      }
    : null,
  sourceOrder: s.source_order,
  usedOrder: s.used_order,
})

export const getJiyunStock = async ({ status = 'available' } = {}) => {
  const data = await request(`/jiyun-stock?status=${status}`, { errorMsg: '집운 재고를 불러오지 못했어요', fresh: true })
  return (data.items || []).map(toItem)
}

export const useJiyunStock = async (id, orderCode) => {
  const data = await request(`/jiyun-stock/${id}/use`, {
    method: 'POST',
    body: { order_code: orderCode },
    errorMsg: '재고를 주문에 쓰지 못했어요',
  })
  return toItem(data.item)
}

export const updateJiyunStock = async (id, body) => {
  const data = await request(`/jiyun-stock/${id}`, { method: 'PATCH', body, errorMsg: '재고를 바꾸지 못했어요' })
  return toItem(data.item)
}
