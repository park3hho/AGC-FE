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
}

export const ROLE_FEATURES = {
  admin: Object.values(FEATURE),
  member: [FEATURE.RESEARCH, FEATURE.ACCOUNT_VIEW],
}

export const hasFeature = (user, feature) => !!user && ROLE_FEATURES[user.role]?.includes(feature)
