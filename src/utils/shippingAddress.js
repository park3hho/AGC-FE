import { ADDRESS_USES, LISTING_MARKETS } from '@/constants/shippingConst'

// 출고지·반품지는 주소 하나 (구매대행 = 배대지). 기본 출고지로 잡힌 주소, 없으면 첫 주소
export const pickAddress = (list) =>
  list.find((a) => a.defaults.includes('outbound')) || list[0] || null

// 표에 보여줄 마켓 — 상품 등록 마켓 + 번호가 들어 있는 다른 마켓
export const marketsOf = (address) => [
  ...new Set([...LISTING_MARKETS, ...(address?.marketCodes || []).map((c) => c.market)]),
]

export const codeOf = (address, market, use) =>
  address?.marketCodes.find((c) => c.market === market && c.use === use) || null

// 구매대행 점검 — 반환: [{ key, tone: 'success' | 'warning' | 'danger', text }]
export const addressChecks = (address) => {
  if (!address)
    return [{ key: 'none', tone: 'danger', text: '주소가 없어요 — 배대지 주소를 넣어주세요' }]
  const out = [
    address.overseas
      ? {
          key: 'ov',
          tone: 'success',
          text: `해외 주소 (${address.country}) — 구매대행 출고지로 쓸 수 있어요`,
        }
      : {
          key: 'ov',
          tone: 'danger',
          text: '국내 주소예요 — 구매대행은 해외(배대지) 주소가 필요해요',
        },
  ]
  for (const m of LISTING_MARKETS) {
    for (const u of ADDRESS_USES) {
      const has = codeOf(address, m, u.key)
      out.push({
        key: `${m}-${u.key}`,
        tone: has ? 'success' : 'warning',
        text: has
          ? `${m} ${u.label} 번호 있음 (${has.code})`
          : `${m} ${u.label} 번호 없음 — ${m} 주소록에 이 주소를 추가하고 번호를 넣어주세요`,
      })
    }
  }
  return out
}
