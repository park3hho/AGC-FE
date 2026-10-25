import { matchPath } from 'react-router-dom'

// 화면 이름 · 빵가루 — 경로 → { name, group, parent } (DESIGN.md §4.5)
// name 은 섹션 부르는 법 '화면 이름 › 섹션 이름' 의 앞부분이다. 새 화면을 만들면 여기에 먼저 추가한다.
// 더 구체적인 경로(/new)를 :id 보다 먼저 둔다.
export const SCREENS = [
  { path: '/', name: '홈' },
  { path: '/more', name: '더보기' },
  { path: '/research/products', name: '제품조사', group: '소싱' },
  {
    path: '/research/products/new',
    name: '제품 추가',
    group: '소싱',
    parent: '/research/products',
  },
  {
    path: '/research/products/:id',
    name: '제품 상세',
    group: '소싱',
    parent: '/research/products',
  },
  { path: '/research/prices', name: '가격조사', group: '소싱' },
  {
    path: '/research/prices/new',
    name: '가격조사 추가',
    group: '소싱',
    parent: '/research/prices',
  },
  {
    path: '/research/prices/:id',
    name: '가격조사 상세',
    group: '소싱',
    parent: '/research/prices',
  },
  { path: '/pricing', name: '가격 책정', group: '판매' },
  { path: '/pricing/:productId', name: '가격 책정 (제품)', group: '판매', parent: '/pricing' },
  { path: '/design', name: '디자인', group: '판매' },
  { path: '/design/:productId', name: '디자인 (제품)', group: '판매', parent: '/design' },
  { path: '/orders', name: '주문 접수', group: '판매' },
  { path: '/purchases', name: '타오바오 구매기록', group: '판매' },
  { path: '/jiyun', name: '집운 기록', group: '판매' },
  { path: '/orders/:orderId/jiyun/new', name: '집운 기록 추가', group: '판매', parent: '/orders' },
  { path: '/orders/jiyun/:id/edit', name: '집운 기록 수정', group: '판매', parent: '/orders' },
  {
    path: '/orders/:orderId/purchases/new',
    name: '타오바오 구매기록 추가',
    group: '판매',
    parent: '/orders',
  },
  {
    path: '/orders/purchases/:id/edit',
    name: '타오바오 구매기록 수정',
    group: '판매',
    parent: '/orders',
  },
  { path: '/products', name: '상품', group: '판매' },
  { path: '/products/:productId', name: '상품 상세', group: '판매', parent: '/products' },
  { path: '/shipping', name: '배송비', group: '설정' },
  { path: '/shipping/addresses', name: '출고지·반품지', group: '설정', parent: '/shipping' },
  {
    path: '/shipping/addresses/edit',
    name: '주소 수정',
    group: '설정',
    parent: '/shipping/addresses',
  },
  { path: '/exchange-rate', name: '환율', group: '설정' },
  { path: '/markets', name: '판매처', group: '설정' },
  // 회사 정보 — 탭 3개 (기본 정보 · 로그인 계정 · API 키)
  { path: '/accounts', name: '기본 정보', group: '설정' },
  { path: '/accounts/info/new', name: '기본 정보 추가', group: '설정', parent: '/accounts' },
  { path: '/accounts/info/:id/edit', name: '기본 정보 수정', group: '설정', parent: '/accounts' },
  { path: '/accounts/logins', name: '로그인 계정', group: '설정' },
  {
    path: '/accounts/logins/new',
    name: '로그인 계정 추가',
    group: '설정',
    parent: '/accounts/logins',
  },
  {
    path: '/accounts/logins/:id/edit',
    name: '로그인 계정 수정',
    group: '설정',
    parent: '/accounts/logins',
  },
  { path: '/accounts/api-keys', name: 'API 키', group: '설정' },
  {
    path: '/accounts/api-keys/new',
    name: 'API 키 추가',
    group: '설정',
    parent: '/accounts/api-keys',
  },
  {
    path: '/accounts/api-keys/:id/edit',
    name: 'API 키 수정',
    group: '설정',
    parent: '/accounts/api-keys',
  },
  { path: '/admin/users', name: '사용자 관리', group: '설정' },
  { path: '/admin/users/new', name: '사용자 추가', group: '설정', parent: '/admin/users' },
]

const UNKNOWN = { path: '', name: '' }

export const findScreen = (pathname) =>
  SCREENS.find((s) => matchPath({ path: s.path, end: true }, pathname)) || UNKNOWN

export const screenByPath = (path) => SCREENS.find((s) => s.path === path) || UNKNOWN
