import { request } from '@/api/client'

// 세션 쿠키는 BE 가 발급·연장한다. FE 는 저장하지 않는다. 스펙: docs/api-contract.md

export const login = async ({ username, password, remember }) => {
  const data = await request('/auth/login', {
    method: 'POST',
    body: { username, password, remember },
    errorMsg: '로그인하지 못했어요',
  })
  return data.user
}

export const logout = () => request('/auth/logout', { method: 'POST', authRedirect: false })

// 로그인 안 됨(401)이면 null
export const checkAuth = async () => {
  try {
    const data = await request('/auth/check', { authRedirect: false })
    return data.user
  } catch {
    return null
  }
}
