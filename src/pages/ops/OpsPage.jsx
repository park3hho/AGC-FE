import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { getOpsAlerts, getOpsTasks, resolveOpsAlert } from '@/api/ops'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import styles from './Ops.module.css'

// 할 일 묶음 · 알림 등급 — 색 점 + 글자 (DESIGN §4.2-9)
const GROUP = {
  action: { label: '할 일', tone: 'warning' },
  wait: { label: '기다림', tone: 'muted' },
}
const LEVEL_TONE = { blocked: 'danger', action: 'warning', info: 'primary' }

const kst = (iso) =>
  iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(5, 16) : ''

// 얼마나 됐는지 — "3시간", "2일"
const ago = (iso) => {
  if (!iso) return ''
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 60) return `${m}분`
  if (m < 60 * 24) return `${Math.round(m / 60)}시간`
  return `${Math.round(m / 1440)}일`
}

const sourceLabel = (s) =>
  !s ? '' : s.startsWith('auto:') ? '서버 자동' : s.startsWith('routine:') ? 'AI 점검' : s

function Dot({ tone, children, title }) {
  return (
    <span className={styles.st} data-tone={tone} title={title}>
      <i />
      {children}
    </span>
  )
}

function TextTabs({ items, value, onChange, label }) {
  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {items.map(([k, text, n]) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={value === k}
          className={`${styles.tab} ${value === k ? styles.tabOn : ''}`}
          onClick={() => onChange(k)}
        >
          {text}
          {n != null && <small>{n}</small>}
        </button>
      ))}
    </div>
  )
}

function OrderLinks({ codes, onOpen }) {
  if (!codes?.length) return null
  return (
    <span className={styles.codes}>
      {codes.map((c) => (
        <button
          key={c}
          type="button"
          className={styles.code}
          onClick={(e) => {
            e.stopPropagation()
            onOpen(c)
          }}
        >
          {c}
        </button>
      ))}
    </span>
  )
}

// 운영 › 오늘 할 일 — 섹션: 할 일 · AI 알림 (2026-11-19, 30분 점검 규칙화)
// 할 일은 서버가 DB 로 계산한 것(GET /ops/tasks), 알림은 AI 점검·서버 자동 처리가 남긴 것(GET /ops/alerts).
// AI 는 이 두 목록을 읽고 일한다 — 사람도 같은 목록을 본다.
export default function OpsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [tasks, setTasks] = useState(null)
  const [alerts, setAlerts] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(0)

  const tg = params.get('tg') || 'action'
  const ttype = params.get('type') || ''
  const ao = params.get('alerts') === 'all' ? 'all' : 'open'
  const akind = params.get('kind') || ''

  const set = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next, { replace: true })
  }

  const loadTasks = useCallback(() => {
    getOpsTasks()
      .then(setTasks)
      .catch((err) => setError(err.message))
  }, [])
  const loadAlerts = useCallback(() => {
    getOpsAlerts({ open: ao === 'open', kind: akind })
      .then(setAlerts)
      .catch((err) => setError(err.message))
  }, [ao, akind])

  useEffect(loadTasks, [loadTasks])
  useEffect(loadAlerts, [loadAlerts])

  const openOrder = (code) => navigate(`/orders?stage=all&q=${encodeURIComponent(code)}`)

  const taskCounts = useMemo(() => {
    const c = { action: 0, wait: 0, all: 0 }
    for (const t of tasks?.items || []) {
      c[t.group] = (c[t.group] || 0) + 1
      c.all += 1
    }
    return c
  }, [tasks])

  const typeOptions = useMemo(() => {
    const m = new Map()
    for (const t of tasks?.items || [])
      if (tg === 'all' || t.group === tg)
        m.set(t.type, { label: t.label, n: (m.get(t.type)?.n || 0) + 1 })
    return [...m.entries()]
  }, [tasks, tg])

  const taskRows = useMemo(
    () =>
      (tasks?.items || [])
        .filter((t) => (tg === 'all' || t.group === tg) && (!ttype || t.type === ttype))
        .sort((a, b) => a.priority - b.priority || (a.since || '').localeCompare(b.since || '')),
    [tasks, tg, ttype],
  )

  const toggleResolve = async (a) => {
    setBusy(a.id)
    try {
      await resolveOpsAlert(a.id, !a.resolvedAt)
      loadAlerts()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(0)
    }
  }

  const refresh = () => {
    setError('')
    loadTasks()
    loadAlerts()
  }

  return (
    <main className="page-flat">
      <PageHeader
        title="오늘 할 일"
        sub="서버가 주문·구매·집운·신고 기록으로 계산한 할 일과 AI 점검·서버 자동 처리가 남긴 알림 · AI 도 이 목록을 읽고 일해요"
        action={
          <button type="button" className="btn-secondary btn-sm" onClick={refresh}>
            새로고침
          </button>
        }
      />
      {error && <p className="form-error">{error}</p>}

      <div className={`fit-row ${styles.split}`}>
        <Section
          name="할 일"
          id="tasks"
          sub={
            tasks &&
            `${taskRows.length}건${tasks.generatedAt ? ` · ${kst(tasks.generatedAt)} 계산` : ''}`
          }
          flush
          fill
        >
          <div className={styles.bar}>
            <TextTabs
              label="할 일 묶음"
              value={tg}
              onChange={(k) => set({ tg: k === 'action' ? '' : k, type: '' })}
              items={[
                ['action', '할 일', taskCounts.action],
                ['wait', '기다림', taskCounts.wait],
                ['all', '전체', taskCounts.all],
              ]}
            />
            <select
              className={`form-input ${styles.select}`}
              aria-label="할 일 종류"
              value={ttype}
              onChange={(e) => set({ type: e.target.value })}
            >
              <option value="">종류 전체</option>
              {typeOptions.map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label} ({v.n})
                </option>
              ))}
            </select>
          </div>
          {!tasks && !error && <p className={styles.empty}>불러오는 중…</p>}
          {tasks && taskRows.length === 0 && (
            <p className={styles.empty}>
              {tg === 'action' ? '지금 할 일이 없어요' : '목록이 비었어요'}
            </p>
          )}
          <ul className={styles.list} aria-label="할 일 목록">
            {taskRows.map((t, i) => (
              <li
                key={`${t.type}-${t.target?.kind}-${t.target?.id ?? i}-${t.orderIds.join(',')}`}
                className={styles.row}
              >
                <div className={styles.head}>
                  <Dot tone={GROUP[t.group]?.tone} title={GROUP[t.group]?.label}>
                    {t.label}
                  </Dot>
                  <OrderLinks codes={t.orderCodes} onOpen={openOrder} />
                  <span className={styles.when} title={t.since ? `${kst(t.since)} 부터` : ''}>
                    {t.dueOn ? `기한 ${t.dueOn.slice(5)}` : t.since ? `${ago(t.since)} 째` : ''}
                  </span>
                </div>
                <p className={styles.text}>
                  {t.reason}
                  {t.detail ? <span className={styles.weak}> · {t.detail}</span> : null}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          name="AI 알림"
          id="alerts"
          sub={alerts && `${alerts.items.length}건 · AI 점검·서버 자동 처리가 남긴 것`}
          flush
          fill
        >
          <div className={styles.bar}>
            <TextTabs
              label="알림 상태"
              value={ao}
              onChange={(k) => set({ alerts: k === 'open' ? '' : k })}
              items={[
                ['open', '안 끝난 것', null],
                ['all', '전체', null],
              ]}
            />
            <select
              className={`form-input ${styles.select}`}
              aria-label="알림 종류"
              value={akind}
              onChange={(e) => set({ kind: e.target.value })}
            >
              <option value="">종류 전체</option>
              {Object.entries(alerts?.kinds || {}).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {!alerts && !error && <p className={styles.empty}>불러오는 중…</p>}
          {alerts && alerts.items.length === 0 && (
            <p className={styles.empty}>
              {ao === 'open' ? '처리할 알림이 없어요' : '알림이 없어요'}
            </p>
          )}
          <ul className={styles.list} aria-label="AI 알림 목록">
            {alerts?.items.map((a) => (
              <li key={a.id} className={`${styles.row} ${a.resolvedAt ? styles.done : ''}`}>
                <div className={styles.head}>
                  <Dot tone={LEVEL_TONE[a.level]} title={a.levelLabel}>
                    {a.kindLabel}
                  </Dot>
                  <OrderLinks codes={a.orderCodes} onOpen={openOrder} />
                  <span
                    className={styles.when}
                    title={`처음 ${kst(a.firstAt)} · 마지막 ${kst(a.lastAt)}`}
                  >
                    {kst(a.lastAt)}
                    {a.count > 1 ? ` · ${a.count}번` : ''}
                  </span>
                </div>
                <p className={styles.title}>{a.title}</p>
                {a.body && <p className={styles.text}>{a.body}</p>}
                <div className={styles.foot}>
                  <span className={styles.weak}>
                    {[
                      sourceLabel(a.source),
                      a.reportedAt ? `사용자에게 전함 ${kst(a.reportedAt)}` : '아직 안 전함',
                      a.resolvedAt ? `끝남 ${kst(a.resolvedAt)}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  <button
                    type="button"
                    className={styles.linkBtn}
                    disabled={busy === a.id}
                    onClick={() => toggleResolve(a)}
                  >
                    {a.resolvedAt ? '다시 열기' : '끝남으로'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </main>
  )
}
