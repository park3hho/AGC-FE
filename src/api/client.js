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

// 목록용 작은 사진 — /files/photos/… 를 BE /thumbs/{w}/… 로 (webp, 원본 평균 140KB → 3~10KB · 1년 캐시, 2026-11-09)
//   px = 화면에 보이는 크기(CSS px). 고해상도 화면을 생각해 2배 이상 크기를 고른다. 업로드 사진이 아니면 그대로
const THUMB_W = [96, 160, 320, 640]
export const thumbUrl = (src, px = 52) => {
  const prefix = `${BASE_URL}/files/photos/`
  if (!src?.startsWith(prefix)) return src
  const need = px * Math.max(2, Math.ceil(window.devicePixelRatio || 1))
  const w = THUMB_W.find((x) => x >= need) || THUMB_W.at(-1)
  return `${BASE_URL}/thumbs/${w}/photos/${src.slice(prefix.length)}`
}

// API 주소 그대로 (로그인 쿠키로 받는 파일 링크 등 — 예: /company-info/1/files/2)
export const apiUrl = (path) => `${BASE_URL}${path}`

// 파일 업로드 (multipart) — Content-Type 은 브라우저가 boundary 와 함께 정한다
export async function upload(path, file, { field = 'file', errorMsg } = {}) {
  getCache.clear()
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
  getCache.clear()
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  return handleResponse(res, errorMsg)
}

// authRedirect: false — 401 이어도 로그인 화면으로 보내지 않는다 (/auth/check 처럼 로그인 여부 자체를 묻는 호출)
// GET 응답 잠깐 기억 (2026-11-09 로딩 속도) — 요청마다 Vercel → Cloudflare → 이 PC 를 왕복해 0.2~0.4초씩 걸린다.
//   · 같은 GET 이 동시에 여러 번이면 한 번만 보낸다 (예: 환율을 위쪽 바와 화면이 따로 부름)
//   · 받은 지 GET_TTL_MS 안이면 다시 안 묻는다 → 화면을 오가도 바로 뜬다
//   · GET 이 아닌 요청(저장·삭제 등)을 보내면 기억을 전부 지운다 → 고친 뒤 목록이 옛 값으로 보이지 않게
//   · 늘 새로 받아야 하면 { fresh: true }
const GET_TTL_MS = 30 * 1000
const getCache = new Map() // path → { at, promise }
export const clearRequestCache = () => getCache.clear()

export async function request(
  path,
  { method = 'GET', body, errorMsg, authRedirect = true, fresh = false } = {},
) {
  const send = async () => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    return handleResponse(res, errorMsg, authRedirect)
  }
  if (method !== 'GET') {
    getCache.clear()
    try {
      return await send()
    } finally {
      getCache.clear() // 보내는 동안 다른 화면이 받아 간 옛 값도 버린다
    }
  }
  const hit = getCache.get(path)
  if (!fresh && hit && Date.now() - hit.at < GET_TTL_MS) return hit.promise
  const promise = send()
  getCache.set(path, { at: Date.now(), promise })
  promise.catch(() => getCache.get(path)?.promise === promise && getCache.delete(path)) // 실패는 기억하지 않는다
  return promise
}

// 페이지 넘김 목록 API 를 전부 받는다 (BE size 최대 500 — 보통 한 번에 끝난다, 2026-11-09. 전엔 100씩 2번 왕복) — 첫 페이지의 total 을 보고 나머지 페이지는 한 번에.
//   목록이 100개를 넘으면 잘리던 문제 (2026-10-26: 제품 226개 중 최근 100개만 보임)
export async function requestAll(path, { size = 500, errorMsg } = {}) {
  const sep = path.includes('?') ? '&' : '?'
  const pageOf = (n) => request(`${path}${sep}size=${size}&page=${n}`, { errorMsg })
  const first = await pageOf(1)
  const pages = Math.ceil((first.total || 0) / size)
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) => pageOf(i + 2)),
  )
  return [first, ...rest].flatMap((d) => d.items)
}
