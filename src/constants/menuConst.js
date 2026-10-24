import { FEATURE } from '@/constants/permissions'

// 메뉴 묶음 — 업무 순서 (DESIGN.md §4.5)
export const MENU_GROUPS = [
  { key: 'sourcing', label: '소싱' },
  { key: 'sales', label: '판매' },
  { key: 'settings', label: '설정' },
]

// 왼쪽 메뉴 · 아래 탭 · 더보기를 모두 이 목록 하나로 그린다
//   tab: 모바일 아래 탭에 바로 보임 (나머지는 '더보기')
//   soon: 아직 없는 기능 — 메뉴에 '준비 중'으로만 보이고 누를 수 없음
//   dev: 개발자 모드(내 계정 모달에서 켬)일 때만 보임 — 메뉴 글씨는 보라색 (--color-dev)
export const MENU = [
  {
    key: 'product',
    group: 'sourcing',
    label: '제품조사',
    tabLabel: '제품',
    icon: 'package',
    tone: 'primary',
    path: '/research/products',
    feature: FEATURE.RESEARCH,
    tab: true,
  },
  {
    key: 'price',
    group: 'sourcing',
    label: '가격조사',
    icon: 'yuan',
    tone: 'success',
    path: '/research/prices',
    feature: FEATURE.RESEARCH,
    tab: true,
  },
  {
    key: 'pricing',
    group: 'sales',
    label: '가격 책정',
    icon: 'tag',
    tone: 'warning',
    path: '/pricing',
    feature: FEATURE.RESEARCH,
    tab: true,
  },
  {
    key: 'design',
    group: 'sales',
    label: '디자인',
    icon: 'pen',
    tone: 'primary',
    path: '/design',
    feature: FEATURE.RESEARCH,
  },
  // 상품 — 디자인(상세페이지)이 승인된 제품만 보인다 (DESIGN.md §4.7). 마켓 등록 기능은 다음 단계
  {
    key: 'listing',
    group: 'sales',
    label: '상품',
    icon: 'layout',
    tone: 'success',
    path: '/products',
    feature: FEATURE.RESEARCH,
  },
  {
    key: 'orders',
    group: 'sales',
    label: '주문',
    icon: 'bag',
    tone: 'warning',
    path: '/orders',
    feature: FEATURE.ORDER,
  },
  {
    key: 'purchases',
    group: 'sales',
    label: '타오바오 구매', // 타오바오에서 산 것 · 판매처 → 집운 창고 배송
    dev: true,
    icon: 'yuan',
    tone: 'success',
    path: '/purchases',
    feature: FEATURE.ORDER,
  },
  {
    key: 'shipping',
    group: 'settings',
    label: '배송', // 탭: 배송비 · 출고지·반품지
    icon: 'truck',
    tone: 'primary',
    path: '/shipping',
    feature: FEATURE.RESEARCH,
  },
  {
    key: 'fx',
    group: 'settings',
    label: '환율',
    icon: 'exchange',
    tone: 'success',
    path: '/exchange-rate',
    feature: FEATURE.RESEARCH,
  },
  {
    key: 'markets',
    group: 'settings',
    label: '판매처', // 네이버·쿠팡 구매자 화면 · 관리 센터 링크
    icon: 'store',
    tone: 'primary',
    path: '/markets',
    feature: FEATURE.RESEARCH,
  },
  {
    key: 'account',
    group: 'settings',
    label: '회사 정보', // 탭: 기본 정보 · 로그인 계정 · API 키
    icon: 'building',
    tone: 'warning',
    path: '/accounts',
    feature: FEATURE.ACCOUNT_VIEW,
  },
  {
    key: 'users',
    group: 'settings',
    label: '사용자 관리',
    icon: 'users',
    tone: 'neutral',
    path: '/admin/users',
    feature: FEATURE.USER_MANAGE,
  },
]
