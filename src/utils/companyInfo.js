// 회사 정보 › 기본 정보 — 분류 순서 · 만료 상태. 목록 배지와 홈 할 일에서 같이 쓴다
import { KEY_DANGER_DAYS, KEY_WARN_DAYS } from '@/utils/apiKey'
import { todayKst } from '@/utils/date'

// 추천 분류 — 이 순서로 보여주고, 그 밖의 분류는 뒤에 가나다순
export const INFO_CATEGORIES = ['사업자', '인허가·신고', '계좌', '연락처', '서류']

const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)

// 분류별로 묶기 — [{ category, items }]
export const groupByCategory = (items) => {
  const map = new Map()
  for (const i of items) {
    if (!map.has(i.category)) map.set(i.category, [])
    map.get(i.category).push(i)
  }
  const rank = (c) => {
    const k = INFO_CATEGORIES.indexOf(c)
    return k < 0 ? INFO_CATEGORIES.length : k
  }
  return [...map.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, 'ko'))
    .map(([category, list]) => ({ category, items: list }))
}

// 만료 상태 — null | { tone: 'danger'|'warning'|'neutral', text, alert }
//   API 키와 같은 기준(D-30 주의, D-14 위험). alert = 홈 할 일에 띄울지 (remind 가 꺼져 있으면 띄우지 않음)
export const infoStatus = (i, today = todayKst()) => {
  if (!i.expiresOn) return null
  const d = daysBetween(today, i.expiresOn)
  if (d < 0) return { tone: 'danger', text: `만료됨 (${i.expiresOn})`, alert: i.remind }
  const tone = d <= KEY_DANGER_DAYS ? 'danger' : d <= KEY_WARN_DAYS ? 'warning' : 'neutral'
  return { tone, text: `만료 D-${d} (${i.expiresOn})`, alert: i.remind && tone !== 'neutral' }
}
