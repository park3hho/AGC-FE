import { request } from '@/api/client'

// 30분 점검 규칙화 (2026-11-19) — 서버가 DB 로 계산한 할 일 · AI·서버가 남긴 알림
// 할 일: GET /ops/tasks (BE services/ops/tasks.py) · 알림: GET/PATCH /ops/alerts (services/ops/alerts.py)

const toTask = (t) => ({
  type: t.type,
  label: t.label,
  group: t.group, // action 지금 할 일 · wait 기다림
  priority: t.priority,
  orderIds: t.order_ids || [],
  orderCodes: t.order_codes || [],
  target: t.target || null, // {kind: order|purchase|bundle|jiyun|decl|stock, id, code}
  reason: t.reason || '',
  detail: t.detail || '',
  since: t.since || null,
  dueOn: t.due_on || null,
  stage: t.stage || null,
  alerted: t.alerted ?? null,
})

export const getOpsTasks = async (includeTest = false) => {
  const data = await request(`/ops/tasks?include_test=${includeTest}`, {
    errorMsg: '할 일을 불러오지 못했어요',
  })
  return {
    generatedAt: data.generated_at,
    total: data.total,
    counts: data.counts || {},
    types: data.types || {},
    items: (data.items || []).map(toTask),
  }
}

const toAlert = (a) => ({
  id: a.id,
  key: a.key,
  kind: a.kind,
  kindLabel: a.kind_label || a.kind,
  level: a.level, // info · action · blocked
  levelLabel: a.level_label || a.level,
  title: a.title || '',
  body: a.body || '',
  orderCodes: a.order_codes || [],
  target: a.target || '',
  source: a.source || '', // routine:… (AI 점검) · auto:… (서버 자동)
  count: a.count || 1,
  firstAt: a.first_at,
  lastAt: a.last_at,
  resolvedAt: a.resolved_at || null,
  reportedAt: a.reported_at || null,
})

export const getOpsAlerts = async ({ open = true, kind = '', limit = 200 } = {}) => {
  const qs = new URLSearchParams({ open: String(open), limit: String(limit) })
  if (kind) qs.set('kind', kind)
  const data = await request(`/ops/alerts?${qs}`, { errorMsg: 'AI 알림을 불러오지 못했어요' })
  return {
    total: data.total,
    kinds: data.kinds || {},
    levels: data.levels || {},
    items: (data.items || []).map(toAlert),
  }
}

export const resolveOpsAlert = async (id, resolved = true) => {
  const data = await request(`/ops/alerts/${id}`, {
    method: 'PATCH',
    body: { resolved },
    errorMsg: '알림을 바꾸지 못했어요',
  })
  return data.alert ? toAlert(data.alert) : null
}
