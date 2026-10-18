import { createContext, useCallback, useEffect, useMemo, useState } from 'react'

import { checkAuth, login as loginApi, logout as logoutApi } from '@/api/auth'

export const AuthContext = createContext(null)

// 앱 로드 시 /auth/check 로 세션 확인 (DESIGN.md §5)
export function AuthProvider({
  children, // ReactNode: 앱
}) {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkAuth()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false))
  }, [])

  const login = useCallback(async (form) => {
    const next = await loginApi(form)
    setUser(next)
    return next
  }, [])

  const logout = useCallback(async () => {
    await logoutApi()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, checking, login, logout }), [user, checking, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
