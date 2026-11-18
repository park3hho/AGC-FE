import { request } from '@/api/client'

// 자사몰 분석 (2026-11-15) — 자사몰(eidofood.com) 방문 기록 + 결제 주문. 스펙: docs/api-contract.md '자사몰 분석'
//   from · to = KST 'YYYY-MM-DD' (없으면 최근 7일)
//   all = true 면 해외 접속(봇) · 우리 계정(테스트 · 심사 · 대표)까지 전부. 기본은 국내 손님만 (2026-11-18)
export const getShopAnalytics = async ({ from, to, all } = {}) => {
  const q = new URLSearchParams()
  if (from) q.set('from', from)
  if (to) q.set('to', to)
  if (all) q.set('all', 'true')
  const d = await request(`/shop-analytics${q.size ? `?${q}` : ''}`, {
    errorMsg: '자사몰 분석을 불러오지 못했어요',
  })
  const t = d.total
  return {
    range: d.range,
    filter: { all: !!d.filter?.all, foreign: d.filter?.excluded_foreign || 0, internal: d.filter?.excluded_internal || 0 },
    live: d.live,
    total: {
      visitors: t.visitors,
      sessions: t.sessions,
      views: t.views,
      viewsPerSession: t.views_per_session,
      bouncePct: t.bounce_pct,
      medianSec: t.median_sec,
      orders: t.orders,
      revenue: t.revenue,
      conversionPct: t.conversion_pct,
    },
    funnel: d.funnel, // [{ key, label, sessions }]
    days: d.days, // [{ date, visitors, views, orders, revenue }]
    sources: d.sources, // [{ name, sessions, visitors, carts, orders }]
    pages: d.pages, // [{ name, views }]
    products: d.products, // [{ code, name, views, carts }]
    devices: d.devices, // [{ name, visitors }]
    browsers: d.browsers,
    trackingSince: d.tracking_since,
  }
}
