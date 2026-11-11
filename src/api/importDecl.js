import { request } from '@/api/client'

// 수입식품 구매대행 수입신고 기록 (2026-11-11) — 신고서 1장 = 같은 B/L 로 온 같은 고객 주문들
// 30분 점검이 유니패스에 내고 여기에 적는다. 사람은 주문마다 확인 · 상태 고치기.
const toDecl = (d) => ({
  id: d.id,
  declNo: d.decl_no || '',
  receiptNo: d.receipt_no || '',
  kind: d.kind,
  kindLabel: d.kind_label,
  status: d.status, // draft · sent · accepted · approved · fix · rejected · missed
  statusLabel: d.status_label,
  agencyCode: d.agency_code || '',
  blNo: d.bl_no || '',
  vessel: d.vessel || '',
  arrivalDate: d.arrival_date,
  warehouseCode: d.warehouse_code || '',
  consignee: d.consignee || '',
  items: (d.items || []).map((i) => ({
    nameEn: i.name_en,
    makerEn: i.maker_en || '',
    country: i.country,
    qty: i.qty,
    unit: i.unit,
  })),
  sellerSite: d.seller_site || '',
  shipperSite: d.shipper_site || '',
  sentAt: d.sent_at,
  acceptedAt: d.accepted_at,
  approvedAt: d.approved_at,
  result: d.result || '',
  memo: d.memo || '',
  orders: (d.orders || []).map((o) => ({
    id: o.id,
    code: o.code || '',
    market: o.market,
    productName: o.product_name,
    optionName: o.option_name || '',
    quantity: o.quantity,
  })),
  createdAt: d.created_at,
  updatedAt: d.updated_at,
})

export const getDeclarations = async ({ orderId, status, q } = {}) => {
  const p = new URLSearchParams()
  if (orderId) p.set('order_id', orderId)
  if (status) p.set('status', status)
  if (q) p.set('q', q)
  const data = await request(`/import-declarations${p.size ? `?${p}` : ''}`, {
    errorMsg: '수입신고 기록을 불러오지 못했어요',
  })
  return { items: data.items.map(toDecl), status: data.status, kind: data.kind }
}

// 신고해야 할 B/L — 집운 출고 · 통관 전 · 신고서 없음
export const getPendingDeclarations = async () => {
  const data = await request('/import-declarations/pending', {
    errorMsg: '신고할 것을 불러오지 못했어요',
  })
  return data.items.map((g) => ({
    blNo: g.bl_no,
    dispatchedAt: g.dispatched_at,
    customsStatus: g.customs_status || '',
    consignee: g.consignee,
    orders: g.orders.map((o) => ({
      id: o.id,
      code: o.code || '',
      market: o.market,
      stage: o.stage,
      productName: o.product_name,
      optionName: o.option_name || '',
      quantity: o.quantity,
    })),
  }))
}

export const updateDeclaration = async (id, patch) => {
  const data = await request(`/import-declarations/${id}`, {
    method: 'PATCH',
    body: patch,
    errorMsg: '수입신고 기록을 고치지 못했어요',
  })
  return toDecl(data.declaration)
}
