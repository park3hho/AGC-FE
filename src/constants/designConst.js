// 상세페이지(디자인) 상수 — BE core/detail_page_config.py 와 문자열이 같아야 한다 (docs/api-contract.md '상세페이지')

// 상세페이지 폭 (px) — 네이버·쿠팡 상세 이미지 기준 폭. 미리보기·PNG 모두 이 폭으로 그린다
export const TEMPLATE_WIDTH = 860

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

// 휴먼 체크 — 전부 체크해야 승인 버튼이 켜진다. key 는 BE REVIEW_CHECKS 와 같아야 한다
//   needs: 'regNo' = 공통 안내에 실제 등록번호가 있어야 체크 가능 · 'noMarks' = 확인 표시([[...]])가 0개여야 체크 가능
export const REVIEW_CHECKS = [
  {
    key: 'reg_no',
    label: '등록번호 확인',
    hint: '맨 위·맨 아래 구매대행업 등록번호가 실제 번호인가요?',
    needs: 'regNo',
  },
  {
    key: 'ingredients',
    label: '원재료를 실제 라벨과 대조',
    hint: '맛마다 라벨 사진과 S4 원재료가 같은가요?',
  },
  {
    key: 'photo_promo',
    label: '사진 속 중국 현지 프로모·문구 확인',
    hint: '병의 이벤트 스티커(扫码赢红包 등)·가격 문구를 안내했나요?',
  },
  {
    key: 'claims',
    label: '효능·과장 표현 없음',
    hint: '"피로 회복", "다이어트" 같은 효능·최고·1위 표현이 없나요?',
  },
  {
    key: 'draft_copy',
    label: '가안 문구 확정',
    hint: '노란 확인 표시와 S6 가안 문구를 모두 정했나요?',
    needs: 'noMarks',
  },
]

// 확인 표시 — 문구 안의 [[...]]. 미리보기에 노란 표시로 보이고, 남아 있으면 승인할 수 없다
export const MARKER_RE = /\[\[(.+?)\]\]/g

// 검수 기록 action → 화면 글자
export const REVIEW_ACTION_LABEL = {
  submit: '검수 요청',
  approve: '승인',
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
