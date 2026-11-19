import { request } from '@/api/client'

// 마켓 최저가 경쟁 (2026-11-07) — 제품 × 판매처(쿠팡·네이버)마다
//   최소가(마진 5% 바닥) · 현재 판매가 · 그 마켓 최저가 판매자 · 그 가격 · 구매대행/국내 재고
// 우리 쪽 값은 BE 가 가격 책정·실구매가로 계산하고, 경쟁자 쪽은 에이전트 점검(매일 새벽 3시)이 덮어쓴다
const toCheck = (c) => ({
  optionId: c.option_id,
  option: c.option || '',
  ourPrice: c.our_price ?? null,
  cost: c.cost ?? null,
  minPrice: c.min_price ?? null,
  marginPct: c.margin_pct ?? null,
  profit: c.profit ?? null,
  costBasis: c.cost_basis || '', // actual(이 옵션 실구매가) · sibling(같은 조사의 형제 옵션 실구매가) · survey(조사가)
  buyCny: c.buy_cny ?? null,
  shipCny: c.ship_cny ?? null,
  verdict: c.verdict, // cheapest · only_us · match · lose · unchecked
  competitor: c.competitor
    ? {
        status: c.competitor.status,
        vendorName: c.competitor.vendor_name || '',
        vendorPrice: c.competitor.vendor_price ?? null,
        vendorShipping: c.competitor.vendor_shipping ?? null,
        vendorType: c.competitor.vendor_type || '',
        vendorNote: c.competitor.vendor_note || '',
        vendorUrl: c.competitor.vendor_url || '',
        query: c.competitor.query || '',
        checkedAt: c.competitor.checked_at,
        history: c.competitor.history || [],
      }
    : null,
})

export const getCompetitors = async () => {
  const data = await request('/competitor-prices', {
    errorMsg: '최저가 경쟁 정보를 불러오지 못했어요',
  })
  return {
    items: data.items.map((it) => ({
      product: {
        id: it.product.id,
        code: it.product.code,
        title: it.product.title,
        photoUrl: it.product.photo_url,
      },
      platforms: Object.fromEntries(
        Object.entries(it.platforms).map(([pf, v]) => [
          pf,
          { main: toCheck(v.main), checks: v.checks.map(toCheck), optionCount: v.option_count },
        ]),
      ),
    })),
    counts: data.counts,
    marginFloorPct: data.margin_floor_pct,
  }
}

// 확인 대기열 (2026-11-19) — 무엇을 먼저 볼지 서버가 정한다: 주문 → 바뀜 → 확인 전 → 검색 안 됨 → lose·match → 오래된 순
// 점검 결과를 저장(POST /competitor-prices/bulk)하면 그 줄의 사유가 저절로 풀린다
export const getCompetitorQueue = async (platform, limit = 500) => {
  const data = await request(
    `/competitor-prices/queue?platform=${platform}&limit=${limit}&include_skipped=true`,
    {
      errorMsg: '확인 대기열을 불러오지 못했어요',
    },
  )
  return {
    total: data.total,
    counts: data.counts || {},
    generatedAt: data.generated_at,
    items: data.items.map((it, i) => ({
      no: i + 1,
      group: it.group,
      groupLabel: it.group_label,
      reasons: it.reasons || [],
      productId: it.product_id,
      code: it.code,
      title: it.title,
      optionId: it.option_id,
      option: it.option || '',
      query: it.query || '',
      querySource: it.query_source,
      searchNote: it.search_note || '',
      userNote: it.user_note || '',
      needsUserCheck: !!it.needs_user_check,
      skipUntil: it.skip_until,
      skipped: !!it.skipped,
      lastStatus: it.last_status,
      lastVerdict: it.last_verdict,
      lastCheckedAt: it.last_checked_at,
      ourPrice: it.our_price ?? null,
      vendorName: it.vendor_name || '',
      vendorPrice: it.vendor_price ?? null,
    })),
  }
}
