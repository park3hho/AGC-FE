import { request } from '@/api/client'

// API 키 — 목록에는 비밀값 이름만 있다. 값은 revealApiSecret() 로 한 개씩만 받는다 (BE 가 열람 기록을 남김).
// 스펙: docs/api-contract.md
const toCredential = (c) => ({
  id: c.id,
  service: c.service,
  url: c.url || '',
  publicValues: c.public_values || [], // [{ label, value }]
  secrets: c.secrets || [], // [{ id, label }]
  issuedOn: c.issued_on, // 'YYYY-MM-DD' | null
  expiresOn: c.expires_on,
  reauthFrom: c.reauth_from,
  reauthTo: c.reauth_to,
  allowedIps: c.allowed_ips || [],
  memo: c.memo || '',
})

export const getApiCredentials = async () => {
  const data = await request('/api-credentials', { errorMsg: 'API 키를 불러오지 못했어요' })
  return data.items.map(toCredential)
}

export const getApiCredential = async (id) => {
  const data = await request(`/api-credentials/${id}`, { errorMsg: 'API 키를 불러오지 못했어요' })
  return toCredential(data.credential)
}

export const revealApiSecret = async (credentialId, secretId) => {
  const data = await request(`/api-credentials/${credentialId}/secrets/${secretId}`, {
    errorMsg: '비밀값을 불러오지 못했어요',
  })
  return data.value
}

const orNull = (v) => (v === '' || v == null ? null : v)

// 화면 값 → BE 본문. secrets 의 value 가 '' 이면(수정 화면) 기존 값을 그대로 둔다
const toBody = (f) => ({
  service: f.service,
  url: orNull(f.url),
  public_values: f.publicValues,
  secrets: f.secrets.map((s) => ({ label: s.label, value: orNull(s.value) })),
  issued_on: orNull(f.issuedOn),
  expires_on: orNull(f.expiresOn),
  reauth_from: orNull(f.reauthFrom),
  reauth_to: orNull(f.reauthTo),
  allowed_ips: f.allowedIps,
  memo: orNull(f.memo),
})

export const createApiCredential = async (form) => {
  const data = await request('/api-credentials', {
    method: 'POST',
    body: toBody(form),
    errorMsg: 'API 키를 저장하지 못했어요',
  })
  return toCredential(data.credential)
}

export const updateApiCredential = async (id, form) => {
  const data = await request(`/api-credentials/${id}`, {
    method: 'PATCH',
    body: toBody(form),
    errorMsg: 'API 키를 수정하지 못했어요',
  })
  return toCredential(data.credential)
}

export const deleteApiCredential = (id) =>
  request(`/api-credentials/${id}`, { method: 'DELETE', errorMsg: 'API 키를 삭제하지 못했어요' })
