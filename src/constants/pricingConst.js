// 가격 책정 상수 — 판매처 키는 BE core/pricing_config.Platform 과 같아야 한다
// priceMode: 'each' = 옵션마다 판매가 따로 등록 · 'base_addon' = 최저 옵션가를 대표가로, 나머지는 추가금
export const PLATFORMS = [
  { key: 'coupang', label: '쿠팡', priceMode: 'each' },
  { key: 'naver', label: '네이버', priceMode: 'base_addon' },
]

// 마진율이 이 값(%) 이상이면 초록색으로 강조 — 임시 기준, 사용자 확정 전
export const GOOD_MARGIN_PCT = 20

// 마진율이 이 값(%) 미만이면 주의색 — 임시 기준, 사용자 확정 전
export const LOW_MARGIN_PCT = 8

// 마진 막대가 꽉 차는 마진율(%)
export const MARGIN_BAR_MAX_PCT = 25

// 네이버 스마트스토어 옵션가(추가금) 한도 — 대표가(판매가) 대비 최대 +%
//   대표가 10,000원 이상: −50% ~ +50% / 그 미만: −50% ~ +100%
//   근거: 스마트스토어 옵션가 범위 안내 (2026-10-20 확인). 대표가 = 최저 옵션가라 아래쪽 한도는 걸리지 않는다
export const NAVER_ADDON_LIMITS = [
  { minBase: 10000, maxPct: 50 },
  { minBase: 0, maxPct: 100 },
]

// 판매가 단위 (원) — 입력 step, "차익으로 맞추기" 올림 단위
export const SALE_PRICE_UNIT = 100

// 일괄 적용 방식 — unit: 입력칸 단위, initial: 방식을 바꿀 때 넣어 주는 값
export const BULK_MODES = [
  { key: 'profit', label: '목표 차익', unit: '원', initial: '3000' },
  { key: 'margin', label: '목표 마진', unit: '%', initial: '10' },
  { key: 'sale', label: '판매가', unit: '원', initial: '' },
]

// 일괄 적용 대상 — 'all' = 모든 판매처
export const BULK_TARGET_ALL = 'all'

// 환율 출처 — BE core/pricing_config.FxSource 와 같아야 한다
export const FX_SOURCE_LABEL = {
  manual: '직접 입력',
  default: '기본값',
}

// 제품의 가격 책정 상태 — 목록 배지 · 필터 · 홈 숫자 (utils/pricing.pricingStatusOf)
//   done: 모든 판매처 판매가 저장 · partial: 일부만 · pending: 조사는 있고 아직 안 정함 · nosurvey: 가격조사 없음
export const PRICING_STATUS = {
  done: { label: '완료', tone: 'success' },
  partial: { label: '일부', tone: 'warning' },
  pending: { label: '대기', tone: 'warning' },
  nosurvey: { label: '조사 없음', tone: 'neutral' },
}

// 목록 필터 — 첫 항목은 '전체' (DESIGN.md §4.4)
export const PRICING_STATUS_FILTERS = [
  { key: 'all', label: '가격 책정: 전체' },
  { key: 'todo', label: '대기 (일부 포함)' },
  { key: 'done', label: '완료' },
  { key: 'nosurvey', label: '조사 없음' },
]
