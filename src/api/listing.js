import { request } from '@/api/client'

// 마켓 등록 기록 (쿠팡·네이버에 올린 상품) — 스펙: docs/api-contract.md '마켓 등록'
const toListing = (x) => ({
  id: x.id,
  productId: x.product_id,
  platform: x.platform, // 'coupang' | 'naver'
  marketProductId: x.market_product_id, // 쿠팡 sellerProductId · 네이버 원상품번호
  title: x.title || '',
  url: x.url || '',
  status: x.status || '', // 마켓이 준 상태 (승인완료 등)
  listedAt: x.listed_at, // 업로드 일시 (ISO) · 없으면 null
  items: (x.items || []).map((i) => ({
    optionId: i.option_id ?? null,
    name: i.name || '',
    salePrice: i.sale_price ?? null,
    marketItemId: i.market_item_id || '',
  })),
  source: x.source, // 'api' | 'manual'
  syncedAt: x.synced_at,
  memo: x.memo || '',
})

// productId 를 주면 그 제품 것만
export const getListings = async (productId) => {
  const q = productId ? `?product_id=${productId}` : ''
  const data = await request(`/listings${q}`, { errorMsg: '마켓 등록 기록을 불러오지 못했어요' })
  return data.items.map(toListing)
}

// 직접 추가 — listedAt 은 'YYYY-MM-DDTHH:mm' (KST 로 보낸다)
export const createListing = async (body) => {
  const data = await request('/listings', {
    method: 'POST',
    body: {
      product_id: body.productId,
      platform: body.platform,
      market_product_id: body.marketProductId,
      title: body.title || null,
      url: body.url || null,
      listed_at: body.listedAt ? `${body.listedAt}:00+09:00` : null,
      memo: body.memo || null,
    },
    errorMsg: '마켓 등록 기록을 저장하지 못했어요',
  })
  return toListing(data.listing)
}

export const deleteListing = async (id) => {
  await request(`/listings/${id}`, { method: 'DELETE', errorMsg: '마켓 등록 기록을 지우지 못했어요' })
}

// 쿠팡에서 불러오기 — 쿠팡 셀러 상품 전체를 읽어 옵션 SKU(제품 코드-옵션 id)로 제품에 붙인다
export const syncCoupangListings = async () => {
  const data = await request('/listings/sync/coupang', {
    method: 'POST',
    errorMsg: '쿠팡 상품을 불러오지 못했어요',
  })
  return {
    total: data.total,
    created: data.created,
    updated: data.updated,
    unmatched: data.unmatched || [],
  }
}
