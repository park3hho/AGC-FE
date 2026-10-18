// 오늘 날짜 (KST) — 'YYYY-MM-DD'
export const todayKst = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
