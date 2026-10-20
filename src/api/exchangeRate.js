import { request } from '@/api/client'

// BE FxRate(snake_case) → 화면 모양. 스펙: docs/api-contract.md
// 환율은 소수 오차를 막으려고 문자열 그대로 둔다 ("200.0000")
export const toFx = (f) => ({
  cnyKrw: f.cny_krw,
  date: f.date ?? null, // 'YYYY-MM-DD' · 기본값이면 null
  source: f.source, // 'manual' | 'default' (FX_SOURCE_LABEL)
  updatedAt: f.updated_at ?? null,
})

// 현재 환율 + 최근 기록 (최대 30건)
export const getExchangeRate = async () => {
  const data = await request('/exchange-rate', { errorMsg: '환율을 불러오지 못했어요' })
  return { current: toFx(data.current), history: data.history.map(toFx) }
}

// 지금 받아오기 — 하나은행 고시(안 되면 open.er-api)를 바로 받아 오늘 값으로 (직접 입력값도 바뀜)
export const refreshExchangeRate = async () => {
  const data = await request('/exchange-rate/refresh', {
    method: 'POST',
    errorMsg: '환율을 받아오지 못했어요',
  })
  return {
    current: toFx(data.current),
    history: data.history.map(toFx),
    observedAt: data.fetched?.observed_at ?? null, // 출처가 알려준 기준 시각
  }
}

// 오늘 환율 직접 입력 — 같은 날 다시 넣으면 덮어쓴다 (그날은 자동으로 안 바뀜)
export const saveExchangeRate = async (cnyKrw) => {
  const data = await request('/exchange-rate', {
    method: 'PUT',
    body: { cny_krw: String(cnyKrw) },
    errorMsg: '환율을 저장하지 못했어요',
  })
  return toFx(data.current)
}
