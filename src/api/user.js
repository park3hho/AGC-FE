import { fail, mockDb, publicUser, respond } from '@/api/mockUsers'

// 목업 — BE 연결 시 request('/users') 등으로 바꾼다. 관리자(user_manage)만 호출한다.

export const getUsers = () => respond(mockDb.users.map(publicUser))

export const createUser = ({ username, name, password, role }) => {
  if (mockDb.users.some((u) => u.username === username)) return fail('이미 있는 아이디예요')
  const user = { id: mockDb.nextId++, username, name, password, role, active: true }
  mockDb.users.push(user)
  return respond(publicUser(user))
}

export const setUserActive = (id, active) => {
  const user = mockDb.users.find((u) => u.id === id)
  if (!user) return fail('사용자를 찾지 못했어요')
  user.active = active
  return respond(publicUser(user))
}
