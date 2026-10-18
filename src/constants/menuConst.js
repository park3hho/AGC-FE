import { FEATURE } from '@/constants/permissions'

export const MENU = [
  { key: 'product', label: '제품조사', icon: 'package', tone: 'primary', path: '/research/products', feature: FEATURE.RESEARCH },
  { key: 'price', label: '가격조사', icon: 'yuan', tone: 'success', path: '/research/prices', feature: FEATURE.RESEARCH },
  { key: 'pricing', label: '가격 책정', icon: 'tag', tone: 'warning', path: '/pricing', feature: FEATURE.RESEARCH },
  { key: 'account', label: '회사 계정', icon: 'key', tone: 'warning', path: '/accounts', feature: FEATURE.ACCOUNT_VIEW },
  { key: 'users', label: '사용자 관리', icon: 'users', tone: 'neutral', path: '/admin/users', feature: FEATURE.USER_MANAGE },
]
