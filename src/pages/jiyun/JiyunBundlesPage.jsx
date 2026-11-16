import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  BUNDLE_STATUS,
  confirmJiyunBundle,
  getJiyunBundle,
  getJiyunBundles,
  moveToJiyunBundle,
} from '@/api/jiyunBundle'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { MARKETS } from '@/constants/orderConst'
import { useMobile } from '@/hooks/useMobile'
import styles from './JiyunBundles.module.css'

const kg = (g) => (g == null ? '-' : `${(g / 1000).toFixed(1)}kg`)
const CN = { ordered: '주문함', shipped: '판매처 발송', arrived: '창고 입고', problem: '문제' }
const TABS = [
  { key: 'active', label: '진행 중' },
  { key: 'open', label: '모으는 중' },
  { key: 'confirmed', label: '결제 대기' },
  { key: 'done', label: '끝남' },
]

function Dot({ status }) {
  const s = BUNDLE_STATUS[status] || { label: status, tone: 'weak' }
  return (
    <span className={`${styles.st} ${styles['t_' + s.tone]}`}>
      <i />
      {s.label}
    </span>
  )
}

// 판매 › 집운 묶음 (2026-11-16) — 묶음 번호 PRE_LP… 별로 구성 주문 · 소포 입고 · 예상 무게 · 상태 · LP 번호.
//   같은 받는 사람 주문은 날짜 상관없이 '모으는 중' 묶음에 자동 합류 → 확정 → 집운 결제(묶어서 보내기) → 출고
export default function JiyunBundlesPage() {
  const mobile = useMobile()
  const [params, setParams] = useSearchParams()
  const tab = params.get('status') || 'active'
  const code = params.get('code')
  const [list, setList] = useState(null)
  const [b, setB] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    getJiyunBundles(tab)
      .then(setList)
      .catch((e) => setError(e.message))
  }, [tab])
  useEffect(load, [load])
  useEffect(() => {
    if (!code) return setB(null)
    getJiyunBundle(code)
      .then(setB)
      .catch((e) => setError(e.message))
  }, [code])

  const set = (patch) => {
    const p = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v == null ? p.delete(k) : p.set(k, v)))
    setParams(p)
  }
  const act = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      if (code) setB(await getJiyunBundle(code))
      load()
    } catch (e) {
      setError(e.message)
    }
    setBusy(false)
  }
  const moveOut = (o) =>
    act(async () => {
      if (!window.confirm(`${o.code} 를 이 묶음에서 빼서 따로 보낼까요? (새 묶음이 생겨요)`)) return
      await moveToJiyunBundle(o.id, null)
    })
  const moveTo = (o) =>
    act(async () => {
      const t = window.prompt(`${o.code} 를 옮길 묶음 번호(PRE_LP…) 또는 그 묶음의 주문 코드(OR-…)`)
      if (!t) return
      await moveToJiyunBundle(o.id, t.trim())
    })

  const showList = !mobile || !code
  const showDetail = !mobile || !!code
  const editable = b && ['open', 'confirmed'].includes(b.status)

  return (
    <main className="page-flat">
      {mobile && code ? (
        <PageHeader title={code} back />
      ) : (
        <PageHeader title="집운 묶음" sub="받는 사람별 한 상자 — 결제하면 LP 번호가 붙어요" />
      )}
      {error && <p className={`form-error ${styles.pad}`}>{error}</p>}
      <div className={`fit-row ${styles.layout}`}>
        {showList && (
          <Section name="묶음 목록" id="list" sub={list ? `${list.length}개` : ''} flush fill>
            <div className={styles.tabs}>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={tab === t.key ? styles.tabOn : ''}
                  onClick={() => set({ status: t.key === 'active' ? null : t.key, code: null })}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {list && !list.length && <p className={styles.empty}>묶음이 없어요</p>}
            <div role="list">
              {(list || []).map((x) => (
                <button
                  key={x.code}
                  type="button"
                  role="listitem"
                  className={`${styles.row} ${x.code === code ? styles.rowOn : ''}`}
                  onClick={() => set({ code: x.code })}
                >
                  <span className={styles.rowMain}>
                    <b className={styles.code}>{x.code}</b>
                    <small>
                      {x.size}건 · {x.codes.join(', ')}
                    </small>
                  </span>
                  <span className={styles.rowSide}>
                    <Dot status={x.status} />
                    <small>
                      입고 {x.arrived}/{x.total} · {kg(x.estWeightG)}
                      {x.lpNo && ` · ${x.lpNo}`}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </Section>
        )}
        {showDetail && (
          <Section
            name="묶음 상세"
            id="detail"
            sub={b ? `${b.code} · ${b.receiver}` : '왼쪽에서 묶음을 고르세요'}
            fill
            action={
              b &&
              editable && (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  disabled={busy}
                  onClick={() => act(() => confirmJiyunBundle(b.code, b.status === 'open'))}
                >
                  {b.status === 'open' ? '묶음 확정 (결제 대기)' : '확정 풀기'}
                </button>
              )
            }
          >
            {b && (
              <>
                <dl className={styles.kv}>
                  <dt>상태</dt>
                  <dd>
                    <Dot status={b.status} />
                  </dd>
                  <dt>LP 번호</dt>
                  <dd>{b.lpNo || <span className={styles.weak}>결제하면 붙어요</span>}</dd>
                  <dt>소포 입고</dt>
                  <dd>
                    {b.arrived}/{b.total} {b.ready && <span className={styles.ok}>· 다 들어옴</span>}
                  </dd>
                  <dt>예상 무게</dt>
                  <dd>
                    {kg(b.estWeightG)} <span className={styles.weak}>(새 주문 합류 한도 {kg(b.maxWeightG)})</span>
                  </dd>
                  {b.memo && (
                    <>
                      <dt>메모</dt>
                      <dd className={styles.weak}>{b.memo}</dd>
                    </>
                  )}
                </dl>
                {['open', 'confirmed'].includes(b.status) && b.ready && (
                  <p className={styles.hint}>
                    소포가 다 들어왔어요 —{' '}
                    <Link to="/jiyun/bundle">집운 결제(묶어서 보내기)</Link> 하면 LP 번호가 이 묶음에 붙어요.
                  </p>
                )}
                <div className={styles.subHead}>구성 주문 {b.orders.length}건</div>
                {b.orders.map((o) => (
                  <div key={o.id} className={styles.member}>
                    <div className={styles.memberHead}>
                      <Link to={`/orders?stage=all&id=${o.id}`} className={styles.code}>
                        {o.code}
                      </Link>{' '}
                      <span className={styles.weak}>{MARKETS[o.market]?.label}</span>{' '}
                      {o.stage === 'cancelled' && <span className={styles.bad}>● 취소</span>}
                      <span className={styles.memberAct}>
                        {editable && (
                          <>
                            <button type="button" className="btn-text" disabled={busy} onClick={() => moveTo(o)}>
                              다른 묶음으로
                            </button>
                            {b.orders.length > 1 && (
                              <button type="button" className="btn-text" disabled={busy} onClick={() => moveOut(o)}>
                                따로 보내기
                              </button>
                            )}
                          </>
                        )}
                      </span>
                    </div>
                    <div className={styles.memberName}>
                      {o.productName} {o.optionName && `· ${o.optionName}`} ×{o.quantity}{' '}
                      <span className={styles.weak}>· {kg(o.weightG)}</span>
                    </div>
                    <div className={styles.parcels}>
                      {o.parcels.length === 0 && <span className={styles.weak}>타오바오 구매 기록 없음</span>}
                      {o.parcels.map((p) => (
                        <span key={p.purchaseId} className={p.cnStatus === 'arrived' ? styles.ok : styles.weak}>
                          ● {CN[p.cnStatus] || p.cnStatus}
                          {p.cnTrackingNo && ` ${p.cnTrackingNo}`}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {b.shipments.length > 0 && (
                  <>
                    <div className={styles.subHead}>집운 결제 기록 {b.shipments.length}건</div>
                    {b.shipments.map((j) => (
                      <div key={j.id} className={styles.ship}>
                        <Link to={`/orders/jiyun/${j.id}/edit`}>{j.jiyunNo}</Link>{' '}
                        <span className={styles.weak}>
                          {j.status === 'dispatched' ? '출고' : '결제'}
                          {j.feeCny && ` · ¥${j.feeCny}`}
                          {j.chargedKrw != null && ` · ${j.chargedKrw.toLocaleString()}원`}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </Section>
        )}
      </div>
    </main>
  )
}
