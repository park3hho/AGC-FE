// 목업 — BE 연결 시 request() 호출로 바꾼다.
// 목록 응답에는 비밀번호를 담지 않는다. 비밀번호는 revealPassword() 로 한 건씩만 받는다
// (BE 는 암호화 저장 + 열람 기록). 가짜 값만 둔다. 실제 계정을 넣지 않는다.
let accounts = [
  { id: 3, platform: '네이버 스마트스토어', loginId: 'agc_store', password: 'example-pw-1', usages: ['판매', '정산'] },
  { id: 2, platform: '타오바오', loginId: 'agc_buyer01', password: 'example-pw-2', usages: ['소싱'] },
  { id: 1, platform: '쿠팡', loginId: 'agc_coupang', password: 'example-pw-3', usages: ['판매', '관리자'] },
]
let nextId = 4

const respond = (data) =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), 100))

const withoutPassword = ({ password, ...rest }) => rest // eslint-disable-line no-unused-vars

export const getCompanyAccounts = () => respond(accounts.map(withoutPassword))

export const revealPassword = (id) => respond(accounts.find((a) => a.id === id)?.password ?? '')

export const createCompanyAccount = (data) => {
  const item = { id: nextId++, ...data }
  accounts = [item, ...accounts]
  return respond(withoutPassword(item))
}
