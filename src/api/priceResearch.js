// 목업 — BE 연결 전까지 메모리에 보관한다. 연결 시 각 함수를 request() 호출로 바꾼다.
// 새로고침하면 처음 상태로 돌아간다.
let researches = [
  {
    code: 'R-20261017-001',
    productCode: 'P-0002',
    researchedAt: '2026-10-17',
    taobaoUrl: 'https://item.taobao.com/item.htm?id=000000000002',
    options: [
      { option1: '레드', option2: '5종', priceCny: 32 },
      { option1: '그레이', option2: '5종', priceCny: 32 },
    ],
    lowestPrice: 24900,
    lowestUrl: '',
  },
]

const respond = (data) =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), 100))

// 조사 코드: R-조사일-순번
const codeOf = (date) => {
  const day = date.replaceAll('-', '')
  const n = researches.filter((r) => r.code.startsWith(`R-${day}-`)).length + 1
  return `R-${day}-${String(n).padStart(3, '0')}`
}

export const getPriceResearches = () => respond(researches)

// 다음 조사 코드 미리보기 (실제 발급은 BE)
export const getNextResearchCode = (date) => respond(codeOf(date))

export const createPriceResearch = (data) => {
  const item = { ...data, code: codeOf(data.researchedAt) }
  researches = [item, ...researches]
  return respond(item)
}
