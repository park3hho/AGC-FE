// 판매처 — 마켓별 구매자 화면(스토어) · 관리 센터 링크. 확인일 2026-10-24
// 바로가기 경로는 실제로 열어 본 화면만 둔다. 마켓이 주소를 바꾸면 여기만 고친다.

export const MARKETS = [
  {
    key: 'naver',
    name: '네이버 스마트스토어',
    storeName: '이도식품',
    ids: [
      { label: '스토어 URL', value: 'eidofood' },
      { label: '채널 번호', value: '1100222737' },
    ],
    buyer: {
      url: 'https://smartstore.naver.com/eidofood',
      note: '구매자가 보는 스토어 첫 화면',
    },
    admin: {
      url: 'https://sell.smartstore.naver.com/',
      label: '스마트스토어센터',
      note: '로그인: 회사 정보 › 로그인 계정 "네이버 스마트스토어" (네이버 아이디로 로그인)',
    },
    shortcuts: [
      {
        label: '스토어 기본정보',
        url: 'https://sell.smartstore.naver.com/#/sellers/store/detail/smartstore',
      },
      { label: '상품판매권한 신청', url: 'https://sell.smartstore.naver.com/#/member/auth/sell' },
      { label: '심사내역 조회', url: 'https://sell.smartstore.naver.com/#/judgment/list' },
    ],
  },
  {
    key: 'coupang',
    name: '쿠팡',
    storeName: '이도',
    ids: [{ label: '업체코드', value: 'A01774978' }],
    buyer: {
      url: 'https://shop.coupang.com/A01774978',
      note: '판매자 마이샵 — 승인된 상품이 생기기 전에는 "페이지를 찾을 수 없음"으로 보여요',
    },
    admin: {
      url: 'https://wing.coupang.com/',
      label: '쿠팡 Wing',
      note: '로그인: 회사 정보 › 로그인 계정 "쿠팡 Wing". 판매자정보 화면은 비밀번호를 한 번 더 물어요',
    },
    shortcuts: [
      { label: '상품 조회/수정', url: 'https://wing.coupang.com/vendor-inventory/list' },
      { label: '주소록/배송정보', url: 'https://wing.coupang.com/tenants/sfl-portal/address/list' },
      {
        label: '추가판매정보',
        url: 'https://wing.coupang.com/tenants/wing-account/vendor/salesinfo',
      },
    ],
  },
]
