import { ROLE } from '@/constants/permissions'

// 목업 사용자 저장소 — auth.js · user.js 가 함께 쓴다. BE 연결 시 이 파일은 지운다.
// 가짜 계정만 둔다. 실제 비밀번호를 넣지 않는다.
export const mockDb = {
  users: [
    { id: 1, username: 'admin', name: '대표', role: ROLE.ADMIN, active: true, password: 'admin1234' },
    { id: 2, username: 'staff01', name: '직원1', role: ROLE.MEMBER, active: true, password: 'staff1234' },
  ],
  nextId: 3,
}

export const publicUser = ({ password, ...user }) => user // eslint-disable-line no-unused-vars

export const respond = (data) =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), 100))

export const fail = (message) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(message)), 100))
