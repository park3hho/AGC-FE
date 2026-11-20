import { useEffect, useState } from 'react'

import { addAlipayTopup, deleteAlipayTopup, getAlipayLedger } from '@/api/alipay'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import SectionTabs, { useSectionTabs } from '@/components/common/SectionTabs'
import styles from './AlipayBalance.module.css'

const won = (n) => `${Math.round(Number(n) || 0).toLocaleString('ko-KR')}원`
const yuan = (s) =>
  `¥${Number(s || 0).toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const rate2 = (s) => (s == null ? '-' : Number(s).toFixed(2))
const kst = (iso) =>
  iso
    ? new Date(iso)
        .toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false })
        .slice(5, 16)
        .replace('T', ' ')
    : ''
// datetime-local 기본값 = 지금(KST)
const nowLocal = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16)

const KIND = { purchase: '구매', jiyun: '집운', other: '기타' }
const MOBILE_TABS = [
  { id: 'lots', name: '충전' },
  { id: 'spends', name: '잔액 결제' },
]

// 알리페이 잔액 — 즈푸바오에 위안을 충전할 때의 환율을 적어 두고, 잔액 결제는 오래된 충전부터(선입선출) 그 환율로 원화를 계산한다.
// 두 충전에 걸친 결제는 차감한 위안 비율대로 (예: ¥40 × 202 + ¥23 × 201). 계산한 원화는 구매·집운 기록과 FIN 지출에 자동으로 들어간다.
export default function AlipayBalancePage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ at: nowLocal(), cny: '', krw: '', memo: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ text: '', error: false })
  const tabs = useSectionTabs(MOBILE_TABS)

  const load = (fresh = false) => getAlipayLedger({ fresh }).then(setData)
  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [])
  useEffect(() => {
    if (!msg.text || msg.error) return undefined
    const t = setTimeout(() => setMsg({ text: '', error: false }), 3000)
    return () => clearTimeout(t)
  }, [msg])

  const cny = Number(form.cny)
  const krw = Number(form.krw)
  const preview = cny > 0 && krw > 0 ? (krw / cny).toFixed(2) : null
  const canSave = preview && form.at && !busy

  const save = async (e) => {
    e.preventDefault()
    if (!canSave) return
    setBusy(true)
    try {
      await addAlipayTopup({
        topped_at: new Date(`${form.at}:00+09:00`).toISOString(),
        cny: form.cny,
        krw: Math.round(krw),
        memo: form.memo || null,
      })
      await load(true)
      setForm({ at: nowLocal(), cny: '', krw: '', memo: '' })
      setMsg({ text: `충전 기록했어요 · 1위안 ${preview}원`, error: false })
    } catch (err) {
      setMsg({ text: err.message, error: true })
    } finally {
      setBusy(false)
    }
  }

  const remove = async (t) => {
    if (
      !window.confirm(
        `${kst(t.topped_at)} ${yuan(t.cny)} 충전 기록을 지울까요? 잔액 결제 원화가 다시 계산돼요.`,
      )
    )
      return
    try {
      await deleteAlipayTopup(t.id)
      await load(true)
    } catch (err) {
      setMsg({ text: err.message, error: true })
    }
  }

  if (error) {
    return (
      <main className="page-flat">
        <PageHeader title="알리페이 잔액" back />
        <p className="form-error">{error}</p>
      </main>
    )
  }
  if (!data) return null

  const lots = [...(data.lots || [])].reverse() // 최근 충전 위
  const items = data.items || []
  const shortAny = items.some((s) => Number(s.short_cny) > 0)

  return (
    <main className="page-flat">
      <PageHeader
        title="알리페이 잔액"
        sub="충전 환율로 선입선출 · 잔액 결제 원화 자동 계산"
        back
      />

      <Section name="잔액" id="now" title={false}>
        <div className={styles.top}>
          <div className={styles.now}>
            <span className={styles.value}>
              {yuan(data.balance_cny)} <small>≈ {won(data.balance_krw)}</small>
            </span>
            <span className={styles.label}>
              남은 위안의 평균 환율 {rate2(data.avg_rate)}원 · 장부 시작 {kst(data.start)}
              {shortAny && <b className={styles.warn}> · 충전 기록이 모자란 결제가 있어요</b>}
            </span>
          </div>
          <form className={styles.form} onSubmit={save} aria-label="충전 기록">
            <input
              className="form-input"
              type="datetime-local"
              aria-label="충전 시각"
              value={form.at}
              onChange={(e) => setForm({ ...form, at: e.target.value })}
            />
            <input
              className={`form-input ${styles.num}`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              placeholder="충전 위안"
              aria-label="충전 위안"
              value={form.cny}
              onChange={(e) => setForm({ ...form, cny: e.target.value })}
            />
            <input
              className={`form-input ${styles.num}`}
              type="number"
              inputMode="numeric"
              step="1"
              min={0}
              placeholder="낸 원화"
              aria-label="낸 원화"
              value={form.krw}
              onChange={(e) => setForm({ ...form, krw: e.target.value })}
            />
            <input
              className={`form-input ${styles.memo}`}
              placeholder="메모 (선택)"
              aria-label="메모"
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
            />
            <button className="btn-primary btn-sm" disabled={!canSave}>
              {busy ? '저장 중…' : '충전 기록'}
            </button>
            <span className={styles.label}>
              {preview ? `1위안 = ${preview}원` : '위안과 원화를 넣으면 환율이 나와요'}
            </span>
          </form>
        </div>
        {msg.text && <p className={msg.error ? 'form-error' : styles.label}>{msg.text}</p>}
      </Section>

      <SectionTabs {...tabs} />

      <div className={`fit-row ${styles.row}`}>
        <Section
          name="충전"
          id="lots"
          sub={`${lots.length}건 · 남은 위안`}
          flush
          fill
          className={tabs.hide('lots')}
        >
          <div className={styles.list}>
            <div className={`${styles.line} ${styles.head}`}>
              <span>충전 시각</span>
              <span>위안</span>
              <span>환율</span>
              <span>남음</span>
              <span />
            </div>
            {lots.map((t) => (
              <div key={t.id} className={styles.line} title={t.memo || ''}>
                <span>
                  {kst(t.topped_at)}
                  {t.is_opening && <em className={styles.tag}>기초 잔액</em>}
                </span>
                <span>
                  {yuan(t.cny)}
                  <small>{won(t.krw)}</small>
                </span>
                <span>{rate2(t.rate)}</span>
                <span className={Number(t.left_cny) > 0 ? '' : styles.dim}>{yuan(t.left_cny)}</span>
                <span>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => remove(t)}>
                    지우기
                  </button>
                </span>
              </div>
            ))}
            {lots.length === 0 && <p className={styles.empty}>충전 기록이 없어요</p>}
          </div>
        </Section>

        <Section
          name="잔액 결제"
          id="spends"
          sub={`${items.length}건 · 오래된 충전부터`}
          flush
          fill
          className={tabs.hide('spends')}
        >
          <div className={styles.list}>
            <div className={`${styles.line2} ${styles.head}`}>
              <span>결제 시각</span>
              <span>내용</span>
              <span>위안</span>
              <span>원화</span>
              <span>차감액 (위안 × 환율)</span>
            </div>
            {items.map((s) => (
              <div key={s.id} className={styles.line2}>
                <span>{kst(s.spent_at)}</span>
                <span>
                  <i className={styles.kind}>{KIND[s.kind] || s.kind}</i> {s.label}
                </span>
                <span>{yuan(s.cny)}</span>
                <span>{s.krw != null ? won(s.krw) : '-'}</span>
                <span className={styles.alloc}>
                  {(s.allocations || [])
                    .map((a) => `${yuan(a.cny)} × ${rate2(a.rate)}`)
                    .join(' + ') || '-'}
                  {Number(s.short_cny) > 0 && (
                    <b className={styles.warn}> · 충전 기록 부족 {yuan(s.short_cny)} (임시 환율)</b>
                  )}
                </span>
              </div>
            ))}
            {items.length === 0 && (
              <p className={styles.empty}>장부 시작 뒤 잔액 결제가 아직 없어요</p>
            )}
          </div>
        </Section>
      </div>
    </main>
  )
}
