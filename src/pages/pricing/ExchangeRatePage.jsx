import { useEffect, useState } from 'react'

import { getExchangeRate, saveExchangeRate } from '@/api/exchangeRate'
import PageHeader from '@/components/common/PageHeader'
import { FX_SOURCE_LABEL } from '@/constants/pricingConst'
import { formatFx, toNum } from '@/utils/pricing'
import styles from './Shipping.module.css'

// 환율 설정 — 가격 책정 · 배송비가 같이 쓰는 위안 환율. 오늘 날짜로 저장 (같은 날 다시 넣으면 덮어씀)
export default function ExchangeRatePage() {
  const [data, setData] = useState(null) // { current, history }
  const [error, setError] = useState('')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [done, setDone] = useState(false)

  const load = () =>
    getExchangeRate()
      .then(setData)
      .catch((err) => setError(err.message))

  useEffect(() => {
    load()
  }, [])

  // 성공 표시는 잠깐만 (DESIGN.md §3.3 자동 리셋)
  useEffect(() => {
    if (!done) return undefined
    const t = setTimeout(() => setDone(false), 1200)
    return () => clearTimeout(t)
  }, [done])

  const rate = toNum(value)
  const invalid = value !== '' && !(rate > 0 && rate <= 10000)
  const canSave = value !== '' && !invalid && !saving

  const save = async (e) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setSaveError('')
    try {
      await saveExchangeRate(value)
      setValue('')
      setDone(true)
      await load()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return (
      <main className="page-flat">
        <PageHeader title="환율 설정" back />
        <p className="form-error">{error}</p>
      </main>
    )
  }
  if (!data) return null

  const { current, history } = data

  return (
    <main className="page-flat">
      <PageHeader title="환율 설정" back />

      <div className={styles.fxNow}>
        <span className={styles.fxLabel}>지금 쓰는 환율</span>
        <span className={styles.fxValue}>1위안 = {formatFx(current.cnyKrw)}원</span>
        <span className={styles.fxLabel}>
          {current.date
            ? `${current.date} · ${FX_SOURCE_LABEL[current.source] || current.source}`
            : '아직 저장한 환율이 없어 기본값을 쓰고 있어요'}
        </span>
      </div>

      <form className="form-group" onSubmit={save}>
        <label className="form-label" htmlFor="fx-input">
          오늘 환율을 얼마로 할까요? (원/위안)
        </label>
        <input
          id="fx-input"
          className={`form-input ${invalid ? 'form-input-error' : ''}`}
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          placeholder={formatFx(current.cnyKrw)}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setSaveError('')
          }}
        />
        {invalid && <span className="form-error">0보다 크고 10,000 이하로 입력하세요</span>}
        {saveError && <span className="form-error">{saveError}</span>}
        <p className={styles.hint}>
          저장하면 가격 책정의 원가·차익과 배송비(원)에 바로 반영돼요. 판매가는 바뀌지 않아요.
        </p>
        <button className="btn-primary btn-lg btn-full" disabled={!canSave}>
          {saving ? '저장 중…' : done ? '저장했어요' : '저장'}
        </button>
      </form>

      <section className={styles.history}>
        <h2 className={styles.sectionTitle}>최근 기록</h2>
        {history.length === 0 && <p className={styles.hint}>아직 기록이 없어요</p>}
        {history.map((h) => (
          <div key={h.date} className={styles.historyRow}>
            <span>{h.date}</span>
            <span className={styles.historyRate}>{formatFx(h.cnyKrw)}원</span>
            <span className={styles.hint}>{FX_SOURCE_LABEL[h.source] || h.source}</span>
          </div>
        ))}
      </section>
    </main>
  )
}
