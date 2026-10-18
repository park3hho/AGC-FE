// 업무 흐름 순서 (루트 CLAUDE.md "업무 흐름")
export const MENU = [
  { key: 'research', label: '리서치', desc: '팔 상품 후보를 모아요', path: '/research', ready: true },
  { key: 'pricing', label: '가격 책정', desc: '판매가를 정해요', ready: false },
  { key: 'products', label: '상품 등록', desc: '네이버·쿠팡에 올려요', ready: false },
  { key: 'orders', label: '주문 처리', desc: '발주부터 배송까지', ready: false },
  { key: 'after', label: '사후 관리', desc: '문의·교환·반품', ready: false },
]
