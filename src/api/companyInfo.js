import { apiUrl, request, upload } from '@/api/client'

// 회사 정보 › 기본 정보 — 번호·계좌·연락처·서류. 값은 숨기지 않는다 (비밀값은 API 키).
// 서류 파일은 공개 /files 가 아니라 로그인 쿠키로 받는 주소다. 스펙: docs/api-contract.md
const toFile = (infoId) => (f) => ({
  id: f.id,
  name: f.name,
  size: f.size,
  contentType: f.content_type,
  url: apiUrl(`/company-info/${infoId}/files/${f.id}`),
})

const toInfo = (i) => ({
  id: i.id,
  category: i.category,
  name: i.name,
  value: i.value || '',
  details: i.details || [], // [{ label, value }]
  issuer: i.issuer || '',
  issuedOn: i.issued_on, // 'YYYY-MM-DD' | null
  expiresOn: i.expires_on,
  remind: i.remind !== false,
  url: i.url || '',
  link: i.link || '', // 앱에서 쓰는 곳 (links 의 key)
  sort: i.sort ?? 0,
  memo: i.memo || '',
  files: (i.files || []).map(toFile(i.id)),
})

// links: [{ key, label, usedBy }]
const toLink = (l) => ({ key: l.key, label: l.label, usedBy: l.used_by })

export const getCompanyInfo = async () => {
  const data = await request('/company-info', { errorMsg: '기본 정보를 불러오지 못했어요' })
  return { items: data.items.map(toInfo), links: (data.links || []).map(toLink) }
}

export const getCompanyInfoItem = async (id) => {
  const data = await request(`/company-info/${id}`, { errorMsg: '기본 정보를 불러오지 못했어요' })
  return toInfo(data.item)
}

const orNull = (v) => (v === '' || v == null ? null : v)

const toBody = (f) => ({
  category: f.category,
  name: f.name,
  value: orNull(f.value),
  details: f.details,
  issuer: orNull(f.issuer),
  issued_on: orNull(f.issuedOn),
  expires_on: orNull(f.expiresOn),
  remind: f.remind,
  url: orNull(f.url),
  link: orNull(f.link),
  sort: Number(f.sort) || 0,
  memo: orNull(f.memo),
})

export const createCompanyInfo = async (form) => {
  const data = await request('/company-info', {
    method: 'POST',
    body: toBody(form),
    errorMsg: '기본 정보를 저장하지 못했어요',
  })
  return toInfo(data.item)
}

export const updateCompanyInfo = async (id, form) => {
  const data = await request(`/company-info/${id}`, {
    method: 'PATCH',
    body: toBody(form),
    errorMsg: '기본 정보를 수정하지 못했어요',
  })
  return toInfo(data.item)
}

export const deleteCompanyInfo = (id) =>
  request(`/company-info/${id}`, { method: 'DELETE', errorMsg: '기본 정보를 삭제하지 못했어요' })

export const uploadCompanyInfoFile = async (id, file) => {
  const data = await upload(`/company-info/${id}/files`, file, {
    errorMsg: `${file.name} 을(를) 올리지 못했어요`,
  })
  return toFile(id)(data.file)
}

export const deleteCompanyInfoFile = (id, fileId) =>
  request(`/company-info/${id}/files/${fileId}`, {
    method: 'DELETE',
    errorMsg: '파일을 삭제하지 못했어요',
  })
