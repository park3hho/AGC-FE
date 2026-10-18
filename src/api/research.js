import { RESEARCH_STATUS } from '@/constants/researchConst'

// 목업 — BE 연결 전까지 메모리에 보관한다. 연결 시 각 함수를 request() 호출로 바꾼다.
let candidates = [
  {
    id: 3,
    name: '접이식 캠핑 의자 (경량)',
    taobaoUrl: 'https://item.taobao.com/item.htm?id=000000000003',
    costCny: 58,
    category: '캠핑',
    competitorPrice: 39900,
    memo: '네이버 상위 판매자 리뷰 2천 개 이상',
    status: RESEARCH_STATUS.REVIEW,
    createdAt: '2026-10-18T05:20:00Z',
  },
  {
    id: 2,
    name: '실리콘 주방 조리도구 5종 세트',
    taobaoUrl: 'https://item.taobao.com/item.htm?id=000000000002',
    costCny: 32,
    category: '주방',
    competitorPrice: 24900,
    memo: '',
    status: RESEARCH_STATUS.ADOPTED,
    createdAt: '2026-10-17T09:10:00Z',
  },
  {
    id: 1,
    name: '차량용 무선 충전 거치대',
    taobaoUrl: 'https://item.taobao.com/item.htm?id=000000000001',
    costCny: 45,
    category: '자동차용품',
    competitorPrice: 19900,
    memo: 'KC 인증 필요 여부 확인',
    status: RESEARCH_STATUS.HOLD,
    createdAt: '2026-10-16T02:00:00Z',
  },
]
let nextId = 4

const respond = (data) =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), 150))

export const getCandidates = () => respond(candidates)

export const getCandidate = (id) => {
  const item = candidates.find((c) => c.id === Number(id))
  return item ? respond(item) : Promise.reject(new Error('후보를 찾지 못했어요'))
}

export const createCandidate = (data) => {
  const item = {
    id: nextId++,
    status: RESEARCH_STATUS.REVIEW,
    createdAt: new Date().toISOString(),
    ...data,
  }
  candidates = [item, ...candidates]
  return respond(item)
}

export const updateCandidate = (id, data) => {
  candidates = candidates.map((c) => (c.id === Number(id) ? { ...c, ...data } : c))
  return getCandidate(id)
}
