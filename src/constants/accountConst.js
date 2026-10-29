// 회사 계정 — 플랫폼은 자유 입력이다. 아래는 입력칸 자동완성 제안일 뿐 (목록에 없어도 저장된다).
// url: 제안을 고르면 홈페이지 칸이 비어 있을 때 채워 준다
export const PLATFORM_SUGGESTIONS = [
  { name: '타오바오', url: 'https://www.taobao.com' },
  { name: '네이버 스마트스토어', url: 'https://sell.smartstore.naver.com' },
  { name: '네이버 커머스API센터', url: 'https://apicenter.commerce.naver.com' },
  { name: '쿠팡 Wing', url: 'https://wing.coupang.com' },
  { name: '식품안전나라', url: 'https://www.foodsafetykorea.go.kr' },
  { name: '한국식품산업협회', url: 'https://www.kfia21.or.kr' },
  { name: 'UNI-PASS (관세청)', url: 'https://unipass.customs.go.kr' },
  { name: '홈택스', url: 'https://www.hometax.go.kr' },
  { name: '배송대행지', url: '' },
]

export const USAGES = ['소싱', '판매', '정산', '배송', '통관', '인허가', '마케팅', 'API', '관리자', '기타']

// 공유 서비스 — 체크한 서비스의 서버가 이 계정·키를 내부 API(/internal/company)로 조회할 수 있다.
// BE core/internal_services.py 의 SERVICES 와 code 가 같아야 한다. 비어 있으면 AGC 사람만 본다.
export const SHARE_SERVICES = [
  { code: 'fin', label: 'FIN', desc: '회계' },
  { code: 'mkt', label: 'MKT', desc: '마케팅' },
  { code: 'shop', label: 'SHOP', desc: '자사몰' },
]
export const shareLabel = (code) => SHARE_SERVICES.find((s) => s.code === code)?.label || code
