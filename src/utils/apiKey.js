// API 키 만료·재인증 상태 — 목록 배지와 홈 할 일에서 같이 쓴다
import { todayKst } from '@/utils/date'

// 'YYYY-MM-DD' 두 날짜 사이 일수 (b − a)
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)

// 이 안으로 들어오면 미리 알린다 (일)
export const KEY_WARN_DAYS = 30
export const KEY_DANGER_DAYS = 14

// 반환: [{ kind: 'expire' | 'reauth', tone: 'danger' | 'warning' | 'neutral', text, alert }]
//   alert = 홈 할 일에 띄울 만큼 급한지
export const keyStatuses = (c, today = todayKst()) => {
  const out = []
  if (c.expiresOn) {
    const d = daysBetween(today, c.expiresOn)
    if (d < 0)
      out.push({ kind: 'expire', tone: 'danger', text: `만료됨 (${c.expiresOn})`, alert: true })
    else {
      const tone = d <= KEY_DANGER_DAYS ? 'danger' : d <= KEY_WARN_DAYS ? 'warning' : 'neutral'
      out.push({
        kind: 'expire',
        tone,
        text: `만료 D-${d} (${c.expiresOn})`,
        alert: tone !== 'neutral',
      })
    }
  }
  if (c.reauthFrom && c.reauthTo) {
    const range = `${c.reauthFrom} ~ ${c.reauthTo}`
    if (today > c.reauthTo) {
      out.push({ kind: 'reauth', tone: 'danger', text: `재인증 기간 지남 (${range})`, alert: true })
    } else if (today >= c.reauthFrom) {
      const left = daysBetween(today, c.reauthTo)
      out.push({
        kind: 'reauth',
        tone: 'danger',
        text: `지금 재인증 — ${left}일 남음 (${range})`,
        alert: true,
      })
    } else {
      const d = daysBetween(today, c.reauthFrom)
      const tone = d <= KEY_WARN_DAYS ? 'warning' : 'neutral'
      out.push({
        kind: 'reauth',
        tone,
        text: `재인증 D-${d} (${range})`,
        alert: tone !== 'neutral',
      })
    }
  }
  return out
}
