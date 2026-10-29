import { apiUrl, postForm, request } from '@/api/client'

// 주문 증빙 파일 — 고객 결제에서 빠진 돈(타오바오 구매 · 집운 배송비 · 마켓 수수료 등)의 근거 서류 (2026-10-29)
//   kind: 'purchase' 타오바오 구매 영수증 · 'jiyun' 집운 배송비 · 'market' 마켓 정산·수수료 · 'card' 카드·간편결제 청구 · 'other'
const toDoc = (d) => ({
  id: d.id,
  kind: d.kind,
  kindLabel: d.kind_label,
  purchaseId: d.purchase_id,
  jiyunId: d.jiyun_id,
  name: d.name,
  size: d.size,
  contentType: d.content_type,
  memo: d.memo || '',
  createdAt: d.created_at,
  url: apiUrl(d.url), // 누르면 새 탭에서 바로 열린다 (로그인 쿠키로)
})

export const getOrderDocuments = async (orderId) => {
  const data = await request(`/orders/${orderId}/documents`, {
    errorMsg: '증빙을 불러오지 못했어요',
  })
  return data.items.map(toDoc)
}

export const uploadOrderDocument = async (orderId, file, { kind, purchaseId, jiyunId, memo } = {}) => {
  const form = new FormData()
  form.append('file', file)
  form.append('kind', kind)
  if (purchaseId) form.append('purchase_id', purchaseId)
  if (jiyunId) form.append('jiyun_id', jiyunId)
  if (memo) form.append('memo', memo)
  const data = await postForm(`/orders/${orderId}/documents`, form, {
    errorMsg: '증빙을 올리지 못했어요',
  })
  return toDoc(data.document)
}

export const deleteOrderDocument = (orderId, docId) =>
  request(`/orders/${orderId}/documents/${docId}`, {
    method: 'DELETE',
    errorMsg: '증빙을 지우지 못했어요',
  })
