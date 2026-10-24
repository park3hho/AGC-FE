// 상세페이지(디자인) 상수 — BE core/detail_page_config.py 와 문자열이 같아야 한다 (docs/api-contract.md '상세페이지')

// 상세페이지 폭 (px) — 네이버 상세 이미지 기준 폭. 미리보기·이미지 내보내기 모두 이 폭으로 그린다
export const TEMPLATE_WIDTH = 860

// 템플릿 버전 — 그림이 달라지는 템플릿·글꼴·내보내기 형식 변경 때 올린다. 내보내기 기록(detail_page_export.template)에 남는다
export const DETAIL_TEMPLATE_VERSION = 's1-s6@2026-10-24' // 네이버 PNG(무손실) · 쿠팡 JPG 100

// 템플릿 글꼴 — Pretendard(OFL, public/fonts) 를 앱에 실어 어느 PC 에서나 같은 그림이 나오게 한다.
//   이 PC 에 설치된 Pretendard 와 섞이지 않게 이름을 따로 쓴다
export const TEMPLATE_FONT_FAMILY = 'AGC Pretendard'
export const TEMPLATE_FONT_URL = '/fonts/PretendardVariable.woff2'

// 이미지 내보내기 — 판매처별 폭·형식. BE core/detail_page_config.EXPORT_* 와 같아야 한다 (DESIGN.md §4.7)
//   품질 최대 (2026-10-24 사용자 결정 — 용량만 늘고 다른 손해는 없다):
//   · 네이버: PNG 무손실 860px (네이버는 PNG 를 받는다)
//   · 쿠팡: JPG 품질 100, 780px (쿠팡 상세 이미지는 JPG 만) — 2배로 그린 그림을 한 번에 줄인다
//   자르는 위치는 두 판매처가 같다
const MB = 1024 * 1024
export const EXPORT_PLATFORMS = [
  { key: 'naver', label: '네이버', width: 860, mime: 'image/png', ext: 'png', maxFileBytes: 20 * MB },
  { key: 'coupang', label: '쿠팡', width: 780, mime: 'image/jpeg', ext: 'jpg', quality: 1, maxFileBytes: 10 * MB },
]
export const EXPORT_MAX_HEIGHT = 3000 // 조각 1장 최대 높이 (860px 기준) — 쿠팡 권장 3000 · 네이버 5000 중 작은 값
export const EXPORT_MAX_UPLOAD_BYTES = 45 * MB // 한 판매처 조각 합계 (BE EXPORT_MAX_TOTAL_BYTES · nginx 50m)

// 상태 — none 은 상세페이지가 아직 없는 제품 (목록 필터용, BE 에 저장되는 값 아님)
export const DETAIL_STATUS = {
  none: { label: '없음', tone: 'neutral' },
  draft: { label: '초안', tone: 'neutral' },
  review: { label: '검수 대기', tone: 'warning' },
  approved: { label: '승인', tone: 'success' },
  changes: { label: '수정 필요', tone: 'danger' },
}

// 목록 필터 — 첫 항목은 '전체' (DESIGN.md §4.4)
export const DETAIL_STATUS_FILTERS = [
  { key: 'all', label: '상세페이지: 전체' },
  { key: 'none', label: '없음' },
  { key: 'draft', label: '초안' },
  { key: 'review', label: '검수 대기' },
  { key: 'changes', label: '수정 필요' },
  { key: 'approved', label: '승인' },
]

// 휴먼 체크 — 체크리스트 없이 '확인' 한 번 = 승인 (2026-10-22 사용자 결정, ReviewPanel)

// 확인 표시 — 문구 안의 [[...]]. 미리보기에 노란 표시로 보인다. 남아 있어도 확인은 되고 경고만 한다
export const MARKER_RE = /\[\[(.+?)\]\]/g

// 검수 기록 action → 화면 글자
export const REVIEW_ACTION_LABEL = {
  submit: '검수 요청',
  approve: '확인',
  changes: '수정 요청',
  reset: '검수 대기로 되돌림',
}

// 편집 › 묶음 (S1~S6) — 한 번에 한 묶음만 보인다
export const EDITOR_GROUPS = [
  { key: 'hero', label: 'S1 대표' },
  { key: 'points', label: 'S2 포인트' },
  { key: 'flavors', label: 'S3 맛 선택' },
  { key: 'info', label: 'S4 제품 정보' },
  { key: 'howto', label: 'S5 마시는 법' },
  { key: 'common', label: 'S6 공통 안내' },
]

// S5 마시는 법 아이콘 — BE HOW_ICONS 와 같아야 한다
export const HOW_ICONS = [
  { key: 'cold', label: '차갑게 (눈꽃)' },
  { key: 'run', label: '운동' },
  { key: 'bottle', label: '병' },
  { key: 'cup', label: '컵' },
  { key: 'clock', label: '시간' },
  { key: 'sun', label: '해' },
]

// 개수 한도 — BE schemas/detail_page.py 와 같게
export const LIMITS = { infoRows: 15, nutrition: 6, chips: 4, notes: 4, notice: 10 }
