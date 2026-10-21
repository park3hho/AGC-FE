import { useEffect, useRef, useState } from 'react'

import { getExchangeRate, refreshExchangeRate, saveExchangeRate } from '@/api/exchangeRate'
import PageHeader from '@/components/common/PageHeader'
import Pager from '@/components/common/Pager'
import Section from '@/components/common/Section'
import SectionTabs, { useSectionTabs } from '@/components/common/SectionTabs'
import {
  FX_AUTO_SOURCES,
  FX_SOURCE_LABEL,
  FX_TREND_DEFAULT,
  FX_TREND_RANGES,
} from '@/constants/pricingConst'
import { useFitRows } from '@/hooks/useFitRows'
import { formatFx, toNum } from '@/utils/pricing'
import FxTrendChart from './FxTrendChart'
import styles from './Shipping.module.css'

const sourceLabel = (s) => FX_SOURCE_LABEL[s] || s

// 저장·받은 시각 → KST 'HH:MM'
const kstTime = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : ''

// 모바일은 한 번에 한 섹션 (DESIGN.md §4.4) — 지금 환율은 항상 보이고 아래만 탭
const MOBILE_TABS = [
  { id: 'trend', name: '추이' },
  { id: 'history', name: '최근 기록' },
]

// 환율 — 가격 책정 · 배송비가 같이 쓰는 위안 환율.
// 자동: BE 가 매시간 하나은행 고시(안 되면 open.er-api)를 받아 저장한다 — 저장 버튼 없이 알아서.
// 추이: 서버가 저장한 기록만 그린다 (외부 과거 데이터는 안 받음).
// 직접 입력은 평소엔 접어 둔다 — 넣으면 그날은 자동으로 바뀌지 않고, '지금 받아오기'를 누르면 다시 자동 값.
export default function ExchangeRatePage() {
  const [data, setData] = useState(null) // { current, history(최근 → 과거), trend(오래된 → 최근) }
  const [error, setError] = useState('')
  const [range, setRange] = useState(FX_TREND_DEFAULT)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState('') // '' | 'save' | 'refresh'
  const [msg, setMsg] = useState({ text: '', error: false })
  const [page, setPage] = useState(1)
  const historyRef = useRef(null)
  const pageSize = useFitRows(historyRef, { fallback: 37 })
  const tabs = useSectionTabs(MOBILE_TABS)

  const rangeDays = FX_TREND_RANGES.find((r) => r.key === range).days
  const load = () => getExchangeRate({ days: rangeDays }).then(setData)

  useEffect(() => {
    load().catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays])

  // 안내 문구는 잠깐만 (DESIGN.md §3.3 자동 리셋)
  useEffect(() => {
    if (!msg.text || msg.error) return undefined
    const t = setTimeout(() => setMsg({ text: '', error: false }), 2500)
    return () => clearTimeout(t)
  }, [msg])

  const rate = toNum(value)
  const invalid = value !== '' && !(rate > 0 && rate <= 10000)
  const canSave = value !== '' && !invalid && !busy

  const save = async (e) => {
    e.preventDefault()
    if (!canSave) return
    setBusy('save')
    try {
      await saveExchangeRate(value)
      await load()
      setValue('')
      setEditing(false)
      setMsg({ text: '저장했어요. 오늘은 자동으로 바뀌지 않아요', error: false })
    } catch (err) {
      setMsg({ text: err.message, error: true })
    } finally {
      setBusy('')
    }
  }

  const refresh = async () => {
    setBusy('refresh')
    try {
      const r = await refreshExchangeRate()
      await load()
      setMsg({
        text: `${sourceLabel(r.current.source)} ${formatFx(r.current.cnyKrw)}원을 받아왔어요`,
        error: false,
      })
    } catch (err) {
      setMsg({ text: err.message, error: true })
    } finally {
      setBusy('')
    }
  }

  if (error) {
    return (
      <main className="page-flat">
        <PageHeader title="환율" back />
        <p className="form-error">{error}</p>
      </main>
    )
  }
  if (!data) return null

  const { current, history, trend } = data
  const auto = FX_AUTO_SOURCES.includes(current.source)

  // 추이 — 고른 기간 동안 서버가 저장한 기록
  const points = trend.map((p) => ({ at: p.at, rate: Number(p.cnyKrw) }))
  const rates = points.map((p) => p.rate)
  // 기간 처음 → 끝 변화율 (소수 1자리, -0.0 은 0.0)
  const change =
    points.length > 1
      ? Number((((rates[rates.length - 1] - rates[0]) / rates[0]) * 100).toFixed(1)) || 0
      : null

  // 최근 기록 — 전날 대비
  const pageCount = Math.max(1, Math.ceil(history.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * pageSize
  const rows = history.slice(start, start + pageSize)

  let status = '아직 받은 환율이 없어 기본값을 쓰고 있어요'
  if (current.date && auto) {
    status = `${current.date} ${kstTime(current.updatedAt)} · ${sourceLabel(current.source)} · 매시간 자동 저장`
  } else if (current.date) {
    status = `${current.date} · 직접 입력 · 오늘은 자동으로 바뀌지 않아요`
  }

  return (
    <main className="page-flat">
      <PageHeader title="환율" sub="가격 책정·배송비가 같이 써요" back />

      <Section name="지금 환율" id="now" title={false}>
        <div className={styles.fxTop}>
          <div className={styles.fxNow}>
            <span className={styles.fxValue}>1위안 = {formatFx(current.cnyKrw)}원</span>
            <span className={styles.fxLabel}>{status}</span>
          </div>
          <div className={styles.fxActions}>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setEditing((v) => !v)}
              aria-expanded={editing}
            >
              {editing ? '닫기' : '직접 입력'}
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={refresh}
              disabled={!!busy}
            >
              {busy === 'refresh' ? '받는 중…' : '지금 받아오기'}
            </button>
          </div>
        </div>
        {editing && (
          <form className={styles.fxForm} onSubmit={save}>
            <input
              className={`form-input ${styles.fxInput} ${invalid ? 'form-input-error' : ''}`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              aria-label="직접 입력 (원/위안)"
              placeholder={formatFx(current.cnyKrw)}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
            <button className="btn-primary btn-sm" disabled={!canSave}>
              {busy === 'save' ? '저장 중…' : '이 값으로'}
            </button>
            <span className={styles.hint}>
              {invalid
                ? '0보다 크고 10,000 이하로'
                : '오늘만 이 값을 써요 · 다시 자동으로 하려면 지금 받아오기'}
            </span>
          </form>
        )}
        {msg.text && <p className={msg.error ? 'form-error' : styles.hint}>{msg.text}</p>}
      </Section>

      <SectionTabs {...tabs} />

      <div className={`fit-row ${styles.fxRow}`}>
        <Section
          name="추이"
          id="trend"
          sub={
            change == null
              ? null
              : `최저 ${Math.min(...rates).toFixed(2)} · 최고 ${Math.max(...rates).toFixed(2)} · ${
                  change > 0 ? '+' : ''
                }${change.toFixed(1)}%`
          }
          action={
            <div className={styles.seg} role="group" aria-label="기간">
              {FX_TREND_RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  className={`${styles.segItem} ${range === r.key ? styles.segOn : ''}`}
                  aria-pressed={range === r.key}
                  onClick={() => setRange(r.key)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          }
          fill="stretch"
          className={tabs.hide('trend')}
        >
          <FxTrendChart
            points={points}
            emptyText={
              points.length === 1
                ? '매시간 1개씩 쌓여요 · 기록이 2개 이상이면 선이 보여요'
                : '이 기간에 저장한 기록이 없어요'
            }
          />
        </Section>

        <Section
          name="최근 기록"
          id="history"
          sub={`${history.length}일`}
          flush
          fill
          bodyRef={historyRef}
          className={tabs.hide('history')}
          footer={
            history.length > 0 && (
              <Pager
                page={currentPage}
                pageCount={pageCount}
                total={history.length}
                unit="일"
                onChange={setPage}
              />
            )
          }
        >
          {history.length === 0 && <p className={styles.historyEmpty}>아직 기록이 없어요</p>}
          <div className={styles.historyList} data-fit-list>
            {rows.map((h, j) => {
              const prev = history[start + j + 1]
              const diff = prev ? Number(h.cnyKrw) - Number(prev.cnyKrw) : null
              return (
                <div key={h.date} className={styles.historyRow}>
                  <span>{h.date}</span>
                  <span className={styles.historyRate}>{formatFx(h.cnyKrw)}원</span>
                  <span
                    className={
                      diff == null || diff === 0 ? styles.hint : diff > 0 ? styles.up : styles.down
                    }
                  >
                    {diff == null || diff === 0
                      ? '-'
                      : `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(2)}`}
                  </span>
                </div>
              )
            })}
          </div>
        </Section>
      </div>
    </main>
  )
}
