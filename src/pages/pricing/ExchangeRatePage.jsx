import { useEffect, useRef, useState } from 'react'

import { getExchangeRate, refreshExchangeRate, saveExchangeRate } from '@/api/exchangeRate'
import PageHeader from '@/components/common/PageHeader'
import Pager from '@/components/common/Pager'
import Section from '@/components/common/Section'
import { FX_AUTO_SOURCES, FX_SOURCE_LABEL } from '@/constants/pricingConst'
import { useFitRows } from '@/hooks/useFitRows'
import { formatFx, toNum } from '@/utils/pricing'
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

// 환율 — 가격 책정 · 배송비가 같이 쓰는 위안 환율.
// 자동: BE 가 매시간 하나은행 고시(안 되면 open.er-api)를 받아 오늘 값을 바꾼다.
// 직접 입력: 그날은 자동으로 바뀌지 않는다. '지금 받아오기'를 누르면 받은 값으로 바뀐다.
export default function ExchangeRatePage() {
  const [data, setData] = useState(null) // { current, history }
  const [error, setError] = useState('')
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState('') // '' | 'save' | 'refresh'
  const [msg, setMsg] = useState({ text: '', error: false })
  const [page, setPage] = useState(1)
  const historyRef = useRef(null)
  const pageSize = useFitRows(historyRef, { fallback: 41 })

  useEffect(() => {
    getExchangeRate()
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

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
      setData(await getExchangeRate())
      setValue('')
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
      setData({ current: r.current, history: r.history })
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

  const { current, history } = data
  const auto = FX_AUTO_SOURCES.includes(current.source)
  const pageCount = Math.max(1, Math.ceil(history.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const rows = history.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  let status = '아직 받은 환율이 없어 기본값을 쓰고 있어요'
  if (current.date && auto) {
    status = `${current.date} ${kstTime(current.updatedAt)} · ${sourceLabel(current.source)} · 매시간 자동`
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
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={refresh}
            disabled={!!busy}
          >
            {busy === 'refresh' ? '받는 중…' : '지금 받아오기'}
          </button>
        </div>
        {msg.text && <p className={msg.error ? 'form-error' : styles.hint}>{msg.text}</p>}
      </Section>

      <Section name="오늘 환율 입력" id="input" title={false}>
        <form className={styles.fxForm} onSubmit={save}>
          <label className={styles.fxLabel} htmlFor="fx-input">
            직접 입력 (원/위안)
          </label>
          <input
            id="fx-input"
            className={`form-input ${styles.fxInput} ${invalid ? 'form-input-error' : ''}`}
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            placeholder={formatFx(current.cnyKrw)}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button className="btn-primary btn-sm" disabled={!canSave}>
            {busy === 'save' ? '저장 중…' : '저장'}
          </button>
        </form>
        {invalid && <span className="form-error">0보다 크고 10,000 이하로 입력하세요</span>}
        <p className={styles.hint}>
          직접 입력하면 오늘은 자동으로 바뀌지 않아요. 원가·차익·배송비(원)는 바로 다시 계산되고
          판매가는 그대로예요.
        </p>
      </Section>

      <Section
        name="최근 기록"
        id="history"
        sub={`${history.length}일`}
        flush
        fill
        bodyRef={historyRef}
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
          {rows.map((h) => (
            <div key={h.date} className={styles.historyRow}>
              <span>{h.date}</span>
              <span className={styles.historyRate}>{formatFx(h.cnyKrw)}원</span>
              <span className={styles.hint}>{sourceLabel(h.source)}</span>
            </div>
          ))}
        </div>
      </Section>
    </main>
  )
}
