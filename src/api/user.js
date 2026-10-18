import { request } from '@/api/client'

// 관리자(user_manage) 전용. 스펙: docs/api-contract.md

export const getUsers = async () => {
  const data = await request('/users', { errorMsg: '사용자 목록을 불러오지 못했어요' })
  return data.items
}

export const createUser = async ({ username, name, password, role }) => {
  const data = await request('/users', {
    method: 'POST',
    body: { username, name, password, role },
    errorMsg: '사용자를 추가하지 못했어요',
  })
  return data.user
}

export const setUserActive = async (id, active) => {
  const data = await request(`/users/${id}`, {
    method: 'PATCH',
    body: { active },
    errorMsg: '사용자 상태를 바꾸지 못했어요',
  })
  return data.user
}
