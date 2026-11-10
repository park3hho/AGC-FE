import { request } from '@/api/client'

// 매출 현황 (2026-11-10) — 기간 안 주문의 매출 · 정산 · 구매 · 집운 · 이익 · 마진
//   from · to = KST 주문일 'YYYY-MM-DD' (없으면 전체). 구매·집운 기록이 없는 줄은 BE 가 조사가·배송비로 추정(estimated)
const sum = (s) => ({
  orders: s.orders,
  lines: s.lines,
  cancelled: s.cancelled,
  revenue: s.revenue,
  settlement: s.settlement,
  purchase: s.purchase,
  jiyun: s.jiyun,
  profit: s.profit,
  marginPct: s.margin_pct,
  estimatedLines: s.estimated_lines,
})

export const getSalesSummary = async ({ from, to } = {}) => {
  const q = new URLSearchParams()
  if (from) q.set('from', from)
  if (to) q.set('to', to)
  const data = await request(`/sales/summary${q.toString() ? `?${q}` : ''}`, {
    errorMsg: '매출 현황을 불러오지 못했어요',
  })
  return {
    total: sum(data.total),
    markets: data.markets.map((m) => ({ market: m.market, label: m.label, ...sum(m) })),
    days: data.days.map((d) => ({ date: d.date, ...sum(d) })),
    products: data.products.map((p) => ({ key: p.key, title: p.title, ...sum(p) })),
    orders: data.orders.map((o) => ({
      id: o.id,
      code: o.code,
      market: o.market,
      date: o.date,
      productName: o.product_name,
      optionName: o.option_name || '',
      quantity: o.quantity,
      stage: o.stage,
      cancelled: o.cancelled,
      claimType: o.claim_type,
      revenue: o.revenue,
      settlement: o.settlement,
      purchase: o.purchase,
      jiyun: o.jiyun,
      profit: o.profit,
      marginPct: o.margin_pct,
      estimated: o.estimated || [],
    })),
  }
}
