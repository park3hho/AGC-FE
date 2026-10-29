import { request } from '@/api/client'

// 목록에는 비밀번호가 없다. 비밀번호는 revealPassword() 로 한 건씩만 받는다 (BE 가 열람 기록을 남김).
// 스펙: docs/api-contract.md
const toAccount = (a) => ({
  id: a.id,
  platform: a.platform,
  loginId: a.login_id,
  url: a.url || '', // 홈페이지 · 없으면 ''
  usages: a.usages,
  memo: a.memo || '', // 비고 · 없으면 ''
})

export const getCompanyAccounts = async () => {
  const data = await request('/company-accounts', { errorMsg: '회사 계정을 불러오지 못했어요' })
  return data.items.map(toAccount)
}

export const getCompanyAccount = async (id) => {
  const data = await request(`/company-accounts/${id}`, { errorMsg: '계정을 불러오지 못했어요' })
  return toAccount(data.account)
}

export const revealPassword = async (id) => {
  const data = await request(`/company-accounts/${id}/password`, {
    errorMsg: '비밀번호를 불러오지 못했어요',
  })
  return data.password
}

export const createCompanyAccount = async ({ platform, loginId, password, usages, url, memo }) => {
  const data = await request('/company-accounts', {
    method: 'POST',
    body: { platform, login_id: loginId, password, usages, url: url || null, memo: memo || null },
    errorMsg: '계정을 저장하지 못했어요',
  })
  return toAccount(data.account)
}

// 수정 — password 는 바꿀 때만 보낸다 (빈 값이면 그대로)
export const updateCompanyAccount = async (
  id,
  { platform, loginId, password, usages, url, memo },
) => {
  const body = { platform, login_id: loginId, usages, url: url || null, memo: memo || null }
  if (password) body.password = password
  const data = await request(`/company-accounts/${id}`, {
    method: 'PATCH',
    body,
    errorMsg: '계정을 수정하지 못했어요',
  })
  return toAccount(data.account)
}

export const deleteCompanyAccount = (id) =>
  request(`/company-accounts/${id}`, { method: 'DELETE', errorMsg: '계정을 삭제하지 못했어요' })
