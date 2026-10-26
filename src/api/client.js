const BASE_URL = import.meta.env.VITE_API_URL || '/api'

let redirecting = false // 401 중복 처리 방지

function toMessage(detail, fallback) {
  if (!detail) return fallback
  if (typeof detail === 'string') return detail
  // FastAPI 422: detail 배열 → 문장으로 합침
  if (Array.isArray(detail)) return detail.map((d) => d.msg || JSON.stringify(d)).join('\n')
  return fallback
}

async function handleResponse(res, errorMsg, authRedirect = true) {
  if (res.status === 401) {
    if (authRedirect && !redirecting && window.location.pathname !== '/login') {
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

// BE 에 올린 파일(/files/...)은 API 주소를 앞에 붙여야 열린다 — 외부 http(s) 주소는 그대로
export const fileUrl = (path) => (path?.startsWith('/files/') ? `${BASE_URL}${path}` : path || '')

// API 주소 그대로 (로그인 쿠키로 받는 파일 링크 등 — 예: /company-info/1/files/2)
export const apiUrl = (path) => `${BASE_URL}${path}`

// 파일 업로드 (multipart) — Content-Type 은 브라우저가 boundary 와 함께 정한다
export async function upload(path, file, { field = 'file', errorMsg } = {}) {
  const form = new FormData()
  form.append(field, file)
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  return handleResponse(res, errorMsg)
}

// 여러 칸·파일을 한 번에 (multipart) — form: FormData
export async function postForm(path, form, { errorMsg } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  return handleResponse(res, errorMsg)
}

// authRedirect: false — 401 이어도 로그인 화면으로 보내지 않는다 (/auth/check 처럼 로그인 여부 자체를 묻는 호출)
export async function request(path, { method = 'GET', body, errorMsg, authRedirect = true } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse(res, errorMsg, authRedirect)
}

// 페이지 넘김 목록 API 를 전부 받는다 (BE size 최대 100) — 첫 페이지의 total 을 보고 나머지 페이지는 한 번에.
//   목록이 100개를 넘으면 잘리던 문제 (2026-10-26: 제품 226개 중 최근 100개만 보임)
export async function requestAll(path, { size = 100, errorMsg } = {}) {
  const sep = path.includes('?') ? '&' : '?'
  const pageOf = (n) => request(`${path}${sep}size=${size}&page=${n}`, { errorMsg })
  const first = await pageOf(1)
  const pages = Math.ceil((first.total || 0) / size)
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) => pageOf(i + 2)),
  )
  return [first, ...rest].flatMap((d) => d.items)
}
