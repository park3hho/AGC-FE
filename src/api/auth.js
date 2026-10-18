import { fail, mockDb, publicUser, respond } from '@/api/mockUsers'

// 목업 — BE 연결 시 아래처럼 바꾼다 (세션 쿠키는 BE 가 발급, FE 는 저장하지 않음)
//   login  → request('/auth/login', { method: 'POST', body: { username, password, remember } })
//   logout → request('/auth/logout', { method: 'POST' })
//   check  → request('/auth/check')
// 목업은 브라우저 저장소로 세션 쿠키를 흉내 낸다: 로그인 유지 = 7일(요청마다 연장), 아니면 탭을 닫을 때까지.
const KEY = 'agc_mock_session'
const KEEP_MS = 7 * 24 * 60 * 60 * 1000

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}

const write = (session) => {
  try {
    const store = session.remember ? localStorage : sessionStorage
    store.setItem(KEY, JSON.stringify(session))
  } catch {
    // 저장소를 못 쓰면 이번 탭에서만 로그인 유지
  }
}

const clear = () => {
  try {
    localStorage.removeItem(KEY)
    sessionStorage.removeItem(KEY)
  } catch {
    // 무시
  }
}

export const login = ({ username, password, remember }) => {
  const user = mockDb.users.find((u) => u.username === username && u.password === password)
  if (!user) return fail('아이디나 비밀번호가 맞지 않아요')
  if (!user.active) return fail('사용이 멈춘 계정이에요. 관리자에게 문의해 주세요')
  write({ userId: user.id, remember, expiresAt: remember ? Date.now() + KEEP_MS : null })
  return respond(publicUser(user))
}

export const logout = () => {
  clear()
  return respond(null)
}

export const checkAuth = () => {
  const session = read()
  const user = session && mockDb.users.find((u) => u.id === session.userId)
  const expired = session?.expiresAt && session.expiresAt < Date.now()
  if (!user || !user.active || expired) {
    clear()
    return respond(null)
  }
  if (session.remember) write({ ...session, expiresAt: Date.now() + KEEP_MS }) // 슬라이딩 연장
  return respond(publicUser(user))
}
