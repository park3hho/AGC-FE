import { request } from '@/api/client'

// 목록에는 비밀번호가 없다. 비밀번호는 revealPassword() 로 한 건씩만 받는다 (BE 가 열람 기록을 남김).
// 스펙: docs/api-contract.md
const toAccount = (a) => ({
  id: a.id,
  platform: a.platform,
  loginId: a.login_id,
  usages: a.usages,
})

export const getCompanyAccounts = async () => {
  const data = await request('/company-accounts', { errorMsg: '회사 계정을 불러오지 못했어요' })
  return data.items.map(toAccount)
}

export const revealPassword = async (id) => {
  const data = await request(`/company-accounts/${id}/password`, { errorMsg: '비밀번호를 불러오지 못했어요' })
  return data.password
}

export const createCompanyAccount = async ({ platform, loginId, password, usages }) => {
  const data = await request('/company-accounts', {
    method: 'POST',
    body: { platform, login_id: loginId, password, usages },
    errorMsg: '계정을 저장하지 못했어요',
  })
  return toAccount(data.account)
}
