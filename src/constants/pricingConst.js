// 가격 책정 상수 — 판매처 키는 BE core/pricing_config.Platform 과 같아야 한다
// priceMode: 'each' = 옵션마다 판매가 따로 등록 · 'base_addon' = 대표 옵션 가격을 대표가로, 나머지는 ±추가금
// 판매처 — market: 마켓(상품 등록 · 주문 수집 대상). 자사몰(eidofood.com)은 마켓이 아니라 가격만 정한다 (2026-10-29)
//   minMarginPct: '목표 차익' 맞추기 때 마진 바닥(%) — 없으면 PROFIT_MIN_MARGIN_PCT(5). 자사몰은 8 (2026-10-29 사용자 결정:
//   다른 판매처처럼 차익 2,000원으로 맞추되, 마진이 8% 아래면 8%가 되게 올린다)
export const PLATFORMS = [
  { key: 'coupang', label: '쿠팡', priceMode: 'each', market: true },
  { key: 'naver', label: '네이버', priceMode: 'base_addon', market: true },
  {
    key: 'shop',
    label: '자사몰',
    priceMode: 'each',
    market: false,
    minMarginPct: 8,
  },
]
export const MARKET_PLATFORMS = PLATFORMS.filter((p) => p.market)

// 마진율이 이 값(%) 이상이면 초록색으로 강조 — 임시 기준, 사용자 확정 전
export const GOOD_MARGIN_PCT = 20

// 마진율이 이 값(%) 미만이면 주의색 — 임시 기준, 사용자 확정 전
export const LOW_MARGIN_PCT = 8

// 마진 막대가 꽉 차는 마진율(%)
export const MARGIN_BAR_MAX_PCT = 25

// 네이버 스마트스토어 옵션가(추가금) 한도 — 할인 전 대표가 대비 %
//   대표가 1만 원 이상: −50% ~ +50% / 2천~1만 원 미만: −50% ~ +100% / 2천 원 미만: 0 ~ +100%
//   대표 옵션(추가금 0원)은 아무 옵션이나 될 수 있다 — 중간 가격을 대표로 하면 ± 양쪽을 쓴다
//   근거: 스마트스토어 옵션가 제한 범위 안내 (2026-10-20 확인). 도서·가구 등 예외 카테고리는 다르다
export const NAVER_ADDON_LIMITS = [
  { minBase: 10000, minPct: -50, maxPct: 50 },
  { minBase: 2000, minPct: -50, maxPct: 100 },
  { minBase: 0, minPct: 0, maxPct: 100 },
]

// 판매가 단위 (원) — 입력 step, "차익으로 맞추기" 올림 단위
export const SALE_PRICE_UNIT = 100

// 일괄 적용 방식 — unit: 입력칸 단위, initial: 방식을 바꿀 때 넣어 주는 값
// 목표 차익으로 맞출 때 마진율 바닥(%) — 차익을 맞춘 판매가의 마진이 이보다 낮으면 이 마진이 되게 올린다
// (묶음처럼 비싼 옵션은 2,000원 차익이 마진 5% 아래가 된다, 2026-10-26 사용자 결정)
export const PROFIT_MIN_MARGIN_PCT = 5

export const BULK_MODES = [
  { key: 'profit', label: '목표 차익', unit: '원', initial: '2000' },
  { key: 'margin', label: '목표 마진', unit: '%', initial: '10' },
  { key: 'sale', label: '판매가', unit: '원', initial: '' },
]

// 일괄 적용 대상 — 'all' = 모든 판매처
export const BULK_TARGET_ALL = 'all'

// 환율 출처 — BE core/pricing_config.FxSource 와 같아야 한다
export const FX_SOURCE_LABEL = {
  hana: '하나은행 고시',
  open_er_api: 'open.er-api',
  manual: '직접 입력',
  default: '기본값',
}

// 자동으로 받는 환율 출처 — 이 출처면 '자동' 표시
export const FX_AUTO_SOURCES = ['hana', 'open_er_api']

// 환율 추이 기간 — 서버가 저장한 기록만 (매일 9시 1개 + 지금 받아오기 · 직접 입력). 31일보다 길면 BE 가 하루 마지막 값 하나씩으로 줄여 준다
export const FX_TREND_RANGES = [
  { key: '1w', label: '1주', days: 7 },
  { key: '1m', label: '1달', days: 30 },
  { key: '3m', label: '3달', days: 90 },
  { key: '1y', label: '1년', days: 365 },
]
export const FX_TREND_DEFAULT = '1m'

// 제품의 가격 책정 상태 — 목록 배지 · 필터 · 홈 숫자 (utils/pricing.pricingStatusOf)
//   done: 모든 판매처 판매가 저장 · partial: 일부만 · pending: 조사는 있고 아직 안 정함 · nosurvey: 가격조사 없음
//   noship: 옵션 용량을 못 읽어 배송비를 모름 — 판매가를 저장했어도 완료가 아님 (2026-10-30)
export const PRICING_STATUS = {
  done: { label: '완료', tone: 'success' },
  noship: { label: '배송비 모름', tone: 'danger' },
  partial: { label: '일부', tone: 'warning' },
  pending: { label: '대기', tone: 'warning' },
  nosurvey: { label: '조사 없음', tone: 'neutral' },
}

// 목록 필터 — 첫 항목은 '전체' (DESIGN.md §4.4)
export const PRICING_STATUS_FILTERS = [
  { key: 'all', label: '가격 책정: 전체' },
  { key: 'todo', label: '대기 (일부 포함)' },
  { key: 'done', label: '완료' },
  { key: 'noship', label: '배송비 모름' },
  { key: 'nosurvey', label: '조사 없음' },
]
