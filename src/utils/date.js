// 오늘 날짜 (KST) — 'YYYY-MM-DD'
export const todayKst = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })

// BE 의 UTC 시각(ISO) → KST 날짜 'YYYY-MM-DD'
export const toKstDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) : ''

// BE 의 UTC 시각(ISO) → KST 'YYYY-MM-DD HH:mm'
export const toKstDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 16) : ''
