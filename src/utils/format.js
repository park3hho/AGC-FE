export const formatKrw = (n) => `${Math.round(n || 0).toLocaleString('ko-KR')}원`

export const formatCny = (n) => `¥${Number(n || 0).toLocaleString('ko-KR')}`

export const formatPercent = (rate) => `${(rate * 100).toFixed(1)}%`

// UTC ISO → KST 날짜
export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })
