import { fileUrl, request } from '@/api/client'

// 가격 책정 › 자사몰 판매 — BE GET /shop-pricing (계산 · 표시만, 2026-11-27)
export const getShopPricing = async () => {
  const d = await request('/shop-pricing', { errorMsg: '자사몰 판매가를 불러오지 못했어요' })
  return {
    fx: d.fx,
    rule: d.rule,
    items: d.items.map((x) => ({ ...x, photoUrl: fileUrl(x.photo_url) })),
  }
}
