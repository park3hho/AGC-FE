// 출고지·반품지 — 용도 이름 · 마켓 · 국가 제안

export const ADDRESS_USES = [
  { key: 'outbound', label: '출고지' },
  { key: 'return', label: '반품지' },
]

export const useLabel = (key) => ADDRESS_USES.find((u) => u.key === key)?.label || key

// 상품 등록을 하는 마켓 — 점검표에 항상 나온다 (마켓 이름은 자유 입력, 이건 제안)
export const LISTING_MARKETS = ['네이버', '쿠팡']

export const COUNTRY_SUGGESTIONS = [
  { code: 'KR', name: '한국' },
  { code: 'CN', name: '중국' },
]

// 배송 경로 — 국제 구간 운송 방식 (BE shipping_config.TRANSPORTS 와 같은 키)
export const TRANSPORTS = [
  { key: 'sea', label: '해운' },
  { key: 'air', label: '항공' },
]

export const EMPTY_ROUTE = {
  forwarder: '',
  transport: 'sea',
  port: '',
  courier: '',
  trackingWhen: '',
  customsRef: '',
  confirmed: false,
  note: '',
}
