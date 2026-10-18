const BASE_URL = import.meta.env.VITE_API_URL || '/api'

let redirecting = false // 401 중복 처리 방지

function toMessage(detail, fallback) {
  if (!detail) return fallback
  if (typeof detail === 'string') return detail
  // FastAPI 422: detail 배열 → 문장으로 합침
  if (Array.isArray(detail)) return detail.map((d) => d.msg || JSON.stringify(d)).join('\n')
  return fallback
}

async function handleResponse(res, errorMsg) {
  if (res.status === 401) {
    localStorage.removeItem('user')
    if (!redirecting && window.location.pathname !== '/login') {
      redirecting = true
      window.location.href = '/login'
    }
    throw new Error('로그인이 필요해요')
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(toMessage(data?.detail, errorMsg || '요청을 처리하지 못했어요'))
  }
  return data
}

export async function request(path, { method = 'GET', body, errorMsg } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse(res, errorMsg)
}
