import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { getDomesticList } from '@/api/domestic'
import FilterBar from '@/components/common/FilterBar'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { DOMESTIC_STATUS, MARKETS } from '@/constants/orderConst'
import { useMobile } from '@/hooks/useMobile'
import styles from '../purchases/Purchases.module.css'

// 모바일 글자 탭 4개 — 나머지(발송처리 · 취소)는 필터 시트
const M_TABS = [
  ['all', '전체'],
  ['ready', '발송처리 전'],
  ['delivering', '배송 중'],
  ['delivered', '완료'],
]

// 'MM-DD HH:mm' (KST)
const kst = (iso) =>
  iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(5, 16) : '-'

function Status({ status }) {
  const s = DOMESTIC_STATUS[status]
  return (
    <span className={styles.st} data-tone={s?.tone}>
      <i />
      {s?.label || status}
    </span>
  )
}

// 판매 › 국내 배송 기록 (개발자 모드) — 섹션: 검색·필터 · 송장 목록
// 국내 택배 송장 1개 = 1줄. 집운 기록의 국내 송장 · 마켓 원본 송장에서 자동으로 생기고 5분 수집 때 배송 조회가 갱신된다
export default function DomesticListPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const mobile = useMobile()

  const status = params.get('status') || 'all'
  const q = params.get('q') || ''

  useEffect(() => {
    getDomesticList({ limit: 500 })
      .then(setItems)
      .catch((err) => setError(err.message))
  }, [])

  const set = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (!v || v === 'all' ? next.delete(k) : next.set(k, v)))
    setParams(next, { replace: true })
  }

  const counts = useMemo(() => {
    const c = { all: items?.length || 0 }
    for (const d of items || []) c[d.status] = (c[d.status] || 0) + 1
    return c
  }, [items])

  const rows = useMemo(() => {
    const word = q.trim().toLowerCase()
    return (items || []).filter(
      (d) =>
        (status === 'all' || d.status === status) &&
        (!word ||
          [d.trackingNo, d.courierName, d.order.code, d.order.orderNo, d.order.productName].some(
            (v) => (v || '').toLowerCase().includes(word),
          )),
    )
  }, [items, status, q])

  const statusSelect = (cls) => (
    <select
      className={`form-input ${cls || ''}`}
      aria-label="국내 배송 상태로 거르기"
      value={status}
      onChange={(e) => set({ status: e.target.value })}
    >
      <option value="all">상태 전체 {counts.all}</option>
      {Object.entries(DOMESTIC_STATUS).map(([k, v]) => (
        <option key={k} value={k}>
          {v.label} {counts[k] || 0}
        </option>
      ))}
    </select>
  )

  return (
    <main className="page-flat">
      <PageHeader title="국내 배송 기록" sub="국내 택배 송장 · 마켓 발송처리 · 배송 조회" />

      <Section name="검색·필터" id="filters" title={false}>
        {mobile ? (
          <div className={styles.mFilters}>
            <div className={styles.ttabs} role="tablist" aria-label="국내 배송 상태">
              {M_TABS.map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={status === k}
                  className={`${styles.ttab} ${status === k ? styles.ttabOn : ''}`}
                  onClick={() => set({ status: k })}
                >
                  {label} <small>{counts[k] || 0}</small>
                </button>
              ))}
            </div>
            <FilterBar
              active={['dispatched', 'problem', 'cancelled'].includes(status) ? 1 : 0}
              onReset={() => set({ status: 'all' })}
              count={`${rows.length}건 보기`}
              search={
                <input
                  className="form-input"
                  placeholder="송장 · OR 코드"
                  aria-label="국내 배송 기록 검색"
                  value={q}
                  onChange={(e) => set({ q: e.target.value })}
                />
              }
            >
              {statusSelect()}
            </FilterBar>
          </div>
        ) : (
          <div className={styles.filters}>
            <input
              className={`form-input ${styles.search}`}
              placeholder="송장 · 택배사 · OR 코드 · 마켓 주문번호 · 상품명"
              aria-label="국내 배송 기록 검색"
              value={q}
              onChange={(e) => set({ q: e.target.value })}
            />
            {statusSelect(styles.statusSel)}
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
      </Section>

      <Section name="송장 목록" id="list" sub={items && `${rows.length}건`} flush fill>
        {items && rows.length === 0 && (
          <p className={styles.empty}>
            {items.length === 0
              ? '아직 국내 배송 기록이 없어요. 집운 기록에 국내 송장이 들어가거나 마켓에서 발송처리하면 자동으로 생겨요.'
              : '조건에 맞는 국내 배송 기록이 없어요'}
          </p>
        )}
        {rows.length > 0 && (
          <div className={styles.table} role="table" aria-label="국내 배송 기록">
            <div className={`${styles.row} ${styles.head}`} role="row">
              <span role="columnheader">택배사 · 송장</span>
              <span role="columnheader">고객 주문</span>
              <span role="columnheader">상태 · 마지막 위치</span>
              <span role="columnheader">마켓 발송처리</span>
              <span role="columnheader" className={styles.num}>
                마지막 조회 · 완료
              </span>
            </div>
            {rows.map((d) => (
              <button
                key={d.id}
                type="button"
                role="row"
                className={styles.row}
                onClick={() => navigate(`/domestic/${d.id}`)}
              >
                <span role="cell" className={styles.main}>
                  <b className={styles.mono}>
                    {d.courierName || '택배사 모름'} {d.trackingNo}
                  </b>
                  <small>{d.sourceLabel}에서</small>
                </span>
                <span role="cell" className={styles.main}>
                  <b>
                    <span className={styles.mono}>{d.order.code}</span> ·{' '}
                    {MARKETS[d.order.market]?.label}
                  </b>
                  <small>
                    {d.order.productName} ×{d.order.quantity}
                  </small>
                </span>
                <span role="cell" className={styles.main}>
                  <Status status={d.status} />
                  <small className={d.trackError ? styles.warn : ''}>
                    {d.trackState
                      ? `${d.trackState}${d.trackLocation ? ` · ${d.trackLocation}` : ''} · ${kst(d.trackLastAt)}`
                      : d.trackError || '조회 전'}
                  </small>
                </span>
                <span role="cell" className={styles.main}>
                  {d.order.market === 'shop' ? (
                    <span>자사몰 — 발송처리 없음</span>
                  ) : d.marketMatch ? (
                    <span>{kst(d.marketSentAt)}</span>
                  ) : (
                    <span className={styles.warn}>안 됨</span>
                  )}
                  <small className={d.marketWrong ? styles.warn : ''}>
                    {d.marketWrong
                      ? '마켓이 잘못된 송장이래요'
                      : d.marketTrackingNo && !d.marketMatch
                        ? `마켓엔 다른 송장 ${d.marketTrackingNo}`
                        : d.marketCourier || ''}
                  </small>
                </span>
                <span role="cell" className={`${styles.num} ${styles.main} ${styles.payCell}`}>
                  <span>{kst(d.trackedAt)}</span>
                  <small>{d.deliveredAt ? `완료 ${kst(d.deliveredAt)}` : ''}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </Section>
    </main>
  )
}
