import { createContext, useCallback, useEffect, useMemo, useState } from 'react'

import { request } from '@/api/client'
import { login as loginApi, logout as logoutApi } from '@/api/auth'

export const AuthContext = createContext(null)

// 지난번 로그인 사용자 — 앱을 열자마자 화면을 그리려고 (2026-11-09 로딩 속도).
//   /auth/check 왕복(0.3초 안팎)을 기다리지 않고 바로 그린 뒤, 확인 결과로 바꾼다. 권한 확인은 BE 가 매 요청 한다
const KEY = 'agc.lastUser'
const readCached = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}
const remember = (u) => {
  try {
    if (u) localStorage.setItem(KEY, JSON.stringify(u))
    else localStorage.removeItem(KEY)
  } catch {
    /* 저장 못 해도 된다 */
  }
}

// 앱 로드 시 /auth/check 로 세션 확인 (DESIGN.md §5)
export function AuthProvider({
  children, // ReactNode: 앱
}) {
  const [user, setUser] = useState(readCached)
  const [checking, setChecking] = useState(() => !readCached())

  useEffect(() => {
    request('/auth/check', { authRedirect: false, fresh: true })
      .then((d) => {
        setUser(d.user)
        remember(d.user)
      })
      .catch((err) => {
        // 로그인 안 됨이면 비운다. 네트워크 오류면 지난 사용자 그대로 (다음 요청이 401 이면 로그인 화면으로 간다)
        if (err.message === '로그인이 필요해요' || !readCached()) {
          setUser(null)
          remember(null)
        }
      })
      .finally(() => setChecking(false))
  }, [])

  const login = useCallback(async (form) => {
    const next = await loginApi(form)
    setUser(next)
    remember(next)
    return next
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } finally {
      setUser(null)
      remember(null)
    }
  }, [])

  const value = useMemo(() => ({ user, checking, login, logout }), [user, checking, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
