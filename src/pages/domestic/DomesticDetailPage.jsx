import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { deleteDomestic, getDomestic, refreshDomestic, updateDomestic } from '@/api/domestic'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { DOMESTIC_STATUS, KR_COURIERS, MARKETS } from '@/constants/orderConst'
import styles from './Domestic.module.css'

// 'YYYY-MM-DD HH:mm' (KST)
const kst = (iso) =>
  iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 16) : '-'

const toForm = (d) => ({
  courier: d.courier,
  trackingNo: d.trackingNo,
  // 사람이 고르는 건 문제 · 취소뿐 — 나머지는 '자동'
  status: ['problem', 'cancelled'].includes(d.status) ? d.status : 'auto',
  memo: d.memo,
})

// 판매 › 국내 배송 기록 › 상세 (개발자 모드) — 섹션: 송장 · 배송 조회
// 송장 칸은 고칠 수 있고, 마켓 발송처리 · 배송 조회는 자동으로 채워진 값을 보여준다
export default function DomesticDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [d, setD] = useState(null)
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = (x) => {
    setD(x)
    setForm(toForm(x))
  }

  useEffect(() => {
    getDomestic(id)
      .then(load)
      .catch((err) => setError(err.message))
  }, [id])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const dirty = d && form && JSON.stringify(toForm(d)) !== JSON.stringify(form)

  const run = async (what, fn) => {
    setBusy(what)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  const save = (e) => {
    e.preventDefault()
    run('save', async () =>
      load(
        await updateDomestic(id, {
          ...form,
          status: form.status === 'auto' ? 'ready' : form.status,
        }),
      ),
    )
  }
  const refresh = () => run('refresh', async () => load(await refreshDomestic(id)))
  const remove = () => {
    if (
      !window.confirm(
        '이 국내 배송 기록을 삭제할까요? (추적 기록은 남고, 자동으로 다시 생기지 않아요)',
      )
    )
      return
    run('delete', async () => {
      await deleteDomestic(id)
      navigate('/domestic')
    })
  }

  const st = d && DOMESTIC_STATUS[d.status]
  const events = d ? [...d.trackEvents].reverse() : []

  return (
    <main className="page-flat">
      <PageHeader
        title="국내 배송 기록"
        sub="저장하면 이 고객 주문의 추적 기록에 남아요"
        back
        action={
          d && (
            <button type="button" className={`btn-ghost btn-md ${styles.bad}`} onClick={remove}>
              삭제
            </button>
          )
        }
      />
      {error && <p className="form-error">{error}</p>}
      {d && form && (
        <div className={`fit-row ${styles.split}`}>
          <Section name="송장" id="shipment" sub={d.sourceLabel + '에서 생김'} fill>
            <form onSubmit={save} className={styles.form}>
              <dl className={styles.facts}>
                <dt>고객 주문</dt>
                <dd>
                  <button
                    type="button"
                    className={styles.link}
                    onClick={() => navigate(`/orders?stage=all&q=${d.order.code}&id=${d.order.id}`)}
                  >
                    {d.order.code}
                  </button>{' '}
                  · {MARKETS[d.order.market]?.label} · {d.order.productName} ×{d.order.quantity}
                </dd>
                <dt>상태</dt>
                <dd>
                  <span className={styles.st} data-tone={st?.tone}>
                    <i />
                    {st?.label || d.status}
                  </span>{' '}
                  <small>{st?.hint}</small>
                </dd>
                <dt>마켓 발송처리</dt>
                <dd>
                  {d.order.market === 'shop' ? (
                    '자사몰 — 마켓 발송처리 없음'
                  ) : d.marketMatch ? (
                    <>
                      {kst(d.marketSentAt)} · {d.marketCourierName || d.marketCourier}{' '}
                      {d.marketTrackingNo}
                      {d.marketWrong && <b className={styles.warn}> · 마켓이 잘못된 송장이래요</b>}
                    </>
                  ) : d.marketTrackingNo ? (
                    <b className={styles.warn}>마켓엔 다른 송장 {d.marketTrackingNo}</b>
                  ) : (
                    <b className={styles.warn}>안 됨 — 마켓에 아직 송장이 없어요</b>
                  )}
                </dd>
                <dt>배송 완료</dt>
                <dd>{d.deliveredAt ? kst(d.deliveredAt) : '-'}</dd>
              </dl>

              <div className={styles.grid}>
                <div className="form-group">
                  <label className="form-label" htmlFor="courier">
                    택배사
                  </label>
                  <select
                    id="courier"
                    className="form-input"
                    value={form.courier}
                    onChange={set('courier')}
                  >
                    <option value="">모름</option>
                    {Object.entries(KR_COURIERS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="trackingNo">
                    송장
                  </label>
                  <input
                    id="trackingNo"
                    className="form-input"
                    inputMode="numeric"
                    autoComplete="off"
                    value={form.trackingNo}
                    onChange={set('trackingNo')}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="status">
                    상태 정하기
                  </label>
                  <select
                    id="status"
                    className="form-input"
                    value={form.status}
                    onChange={set('status')}
                  >
                    <option value="auto">자동</option>
                    <option value="problem">문제 (오배송·분실·반송)</option>
                    <option value="cancelled">취소</option>
                  </select>
                </div>
                <div className={`form-group ${styles.wide}`}>
                  <label className="form-label" htmlFor="memo">
                    메모
                  </label>
                  <input
                    id="memo"
                    className="form-input"
                    value={form.memo}
                    onChange={set('memo')}
                  />
                </div>
              </div>
              <div className={styles.foot}>
                <button className="btn-primary btn-md" type="submit" disabled={!dirty || !!busy}>
                  {busy === 'save' ? '저장 중…' : '수정 저장'}
                </button>
              </div>
            </form>
          </Section>

          <Section
            name="배송 조회"
            id="tracking"
            sub={`마지막 조회 ${kst(d.trackedAt)}`}
            flush
            fill
            action={
              <span className={styles.actions}>
                {d.trackingUrl && (
                  <a
                    className="btn-ghost btn-sm"
                    href={d.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    tracker.delivery ↗
                  </a>
                )}
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={refresh}
                  disabled={!!busy}
                >
                  {busy === 'refresh' ? '조회 중…' : '지금 조회'}
                </button>
              </span>
            }
          >
            {d.trackError && <p className={`${styles.empty} ${styles.warn}`}>{d.trackError}</p>}
            {!d.trackError && events.length === 0 && (
              <p className={styles.empty}>아직 조회한 단계가 없어요</p>
            )}
            {events.length > 0 && (
              <ol className={styles.events}>
                {events.map((e, i) => (
                  <li key={`${e.time}-${i}`} className={i === 0 ? styles.now : ''}>
                    <time>{kst(e.time)}</time>
                    <b>{e.status || '-'}</b>
                    <span>{e.location || ''}</span>
                    {e.description && e.description !== e.status && <small>{e.description}</small>}
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>
      )}
    </main>
  )
}
