// BE core/permissions.py 와 문자열 동기 필수 (DESIGN.md §5)
export const ROLE = {
  ADMIN: 'admin',
  MEMBER: 'member',
}

export const ROLE_LABEL = {
  admin: '관리자',
  member: '직원',
}

export const FEATURE = {
  RESEARCH: 'research',
  ACCOUNT_VIEW: 'account_view',
  ACCOUNT_EDIT: 'account_edit',
  USER_MANAGE: 'user_manage',
  DETAIL_REVIEW: 'detail_review', // 상세페이지 휴먼 체크 (승인 · 수정 요청 · 공통 안내) — API 키로는 못 씀
  ORDER: 'order', // 주문 접수·처리 (수취인·통관부호는 가린 값만)
}

export const ROLE_FEATURES = {
  admin: Object.values(FEATURE),
  member: [FEATURE.RESEARCH, FEATURE.ACCOUNT_VIEW, FEATURE.DETAIL_REVIEW, FEATURE.ORDER],
}

export const hasFeature = (user, feature) => !!user && ROLE_FEATURES[user.role]?.includes(feature)
