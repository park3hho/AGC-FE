import { request } from '@/api/client'

// 이슈 리포트 (2026-11-27) — AGC 전체 문제 목록. kind: cost_diff(매입가 차이) …  status: new · ack · resolved
export const getIssues = ({ kind, status, page = 1, size = 30 } = {}) => {
  const q = new URLSearchParams({ page, size })
  if (kind) q.set('kind', kind)
  if (status) q.set('status', status)
  return request(`/issues?${q}`, { errorMsg: '이슈 목록을 불러오지 못했어요' })
}

export const patchIssue = (id, body) =>
  request(`/issues/${id}`, { method: 'PATCH', body, errorMsg: '이슈를 저장하지 못했어요' })

// 옵션별 열린 매입가 차이 이슈 { [option_id]: { id, detail, status } } — 가격 책정 화면 표시용
export const getCostIssuesByOption = () =>
  request('/issues/by-option', { errorMsg: '' }).then((d) => d.items || {})
