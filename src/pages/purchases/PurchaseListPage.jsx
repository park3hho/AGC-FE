import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { getPurchases } from '@/api/taobaoPurchase'
import Badge from '@/components/Badge'
import PageHeader from '@/components/common/PageHeader'
import FilterBar from '@/components/common/FilterBar'
import Section from '@/components/common/Section'
import { CHARGED_STATUS, CN_STATUS, MARKETS, PAY_METHOD } from '@/constants/orderConst'
import { useMobile } from '@/hooks/useMobile'
import styles from './Purchases.module.css'

// 'MM-DD HH:mm' (KST)
const kst = (iso) =>
  iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(5, 16) : '-'

const FILTERS = ['all', ...Object.keys(CN_STATUS)]
// 모바일 글자 탭 4개 — 나머지(문제 · 취소)는 필터 시트
const M_TABS = [
  ['all', '전체'],
  ['ordered', '주문함'],
  ['shipped', '발송'],
  ['arrived', '입고'],
]

// 판매 › 타오바오 구매기록 — 섹션: 검색·필터 · 구매 목록
// 우리가 타오바오에서 산 것 전체와 중국 내 배송(판매처 → 집운 창고) 상태. 구매 추가는 주문 접수의 고객 주문에서 한다
export default function PurchaseListPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const mobile = useMobile()

  const status = params.get('status') || 'all'
  const q = params.get('q') || ''

  useEffect(() => {
    getPurchases({ limit: 500 })
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
    for (const p of items || []) c[p.cnStatus] = (c[p.cnStatus] || 0) + 1
    return c
  }, [items])

  const rows = useMemo(() => {
    const word = q.trim().toLowerCase()
    return (items || []).filter(
      (p) =>
        (status === 'all' || p.cnStatus === status) &&
        (!word ||
          [
            p.taobaoOrderNo,
            p.shopName,
            p.cnTrackingNo,
            p.order.code,
            p.order.orderNo,
            p.order.productName,
          ].some((v) => (v || '').toLowerCase().includes(word))),
    )
  }, [items, status, q])

  return (
    <main className="page-flat">
      <PageHeader
        title="타오바오 구매기록"
        sub="타오바오에서 산 것과 판매처 → 집운 창고 배송 상태"
        action={
          <button className="btn-secondary btn-md" onClick={() => navigate('/orders')}>
            주문 접수에서 구매 추가
          </button>
        }
      />

      <Section name="검색·필터" id="filters" title={false}>
        {mobile ? (
          <div className={styles.mFilters}>
            <div className={styles.ttabs} role="tablist" aria-label="중국 내 배송 상태">
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
              active={['problem', 'cancelled'].includes(status) ? 1 : 0}
              onReset={() => set({ status: 'all' })}
              count={`${rows.length}건 보기`}
              search={
                <input
                  className="form-input"
                  placeholder="주문번호 · 판매처 · 운송장 · OR 코드"
                  aria-label="타오바오 구매 검색"
                  value={q}
                  onChange={(e) => set({ q: e.target.value })}
                />
              }
            >
              <select
                className="form-input"
                aria-label="중국 내 배송 상태"
                value={status}
                onChange={(e) => set({ status: e.target.value })}
              >
                {FILTERS.map((k) => (
                  <option key={k} value={k}>
                    {k === 'all' ? '상태 전체' : CN_STATUS[k].label} {counts[k] || 0}
                  </option>
                ))}
              </select>
            </FilterBar>
          </div>
        ) : (
        <div className={styles.filters}>
          <input
            className={`form-input ${styles.search}`}
            placeholder="타오바오 주문번호 · 판매처 · 운송장 · OR 코드 · 상품명"
            aria-label="타오바오 구매 검색"
            value={q}
            onChange={(e) => set({ q: e.target.value })}
          />
          <div className={styles.chips}>
            {FILTERS.map((k) => (
              <button
                key={k}
                type="button"
                className={`${styles.chip} ${status === k ? styles.chipOn : ''}`}
                onClick={() => set({ status: k })}
              >
                {k === 'all' ? '전체' : CN_STATUS[k].label} {counts[k] || 0}
              </button>
            ))}
          </div>
        </div>
        )}
        {error && <p className="form-error">{error}</p>}
      </Section>

      <Section name="구매 목록" id="list" sub={items && `${rows.length}건`} flush fill>
        {items && rows.length === 0 && (
          <p className={styles.empty}>
            {items.length === 0
              ? '아직 타오바오 구매가 없어요. 주문 접수에서 고객 주문을 고른 뒤 "구매 추가"로 적어요.'
              : '조건에 맞는 구매가 없어요'}
          </p>
        )}
        {rows.length > 0 && (
          <div className={styles.table} role="table" aria-label="타오바오 구매">
            <div className={`${styles.row} ${styles.head}`} role="row">
              <span role="columnheader">타오바오 주문 · 판매처</span>
              <span role="columnheader">고객 주문</span>
              <span role="columnheader">중국 내 배송</span>
              <span role="columnheader">구매 · 입고</span>
              <span role="columnheader" className={styles.num}>
                결제 · 실제 청구
              </span>
            </div>
            {rows.map((p) => (
              <button
                key={p.id}
                type="button"
                role="row"
                className={styles.row}
                onClick={() =>
                  navigate(`/orders/purchases/${p.id}/edit?order=${p.order.id}&from=purchases`)
                }
              >
                <span role="cell" className={styles.main}>
                  <b className={styles.mono}>{p.taobaoOrderNo}</b>
                  <small>{p.shopName || '판매처 미입력'}</small>
                </span>
                <span role="cell" className={styles.main}>
                  <b>
                    <span className={styles.mono}>{p.order.code}</span> ·{' '}
                    {MARKETS[p.order.market]?.label}
                  </b>
                  <small>
                    {p.order.productName} ×{p.order.quantity}
                  </small>
                </span>
                <span role="cell" className={styles.main}>
                  {mobile ? (
                    <span className={styles.st} data-tone={CN_STATUS[p.cnStatus]?.tone}>
                      <i />
                      {CN_STATUS[p.cnStatus]?.label || p.cnStatus}
                    </span>
                  ) : (
                    <Badge tone={CN_STATUS[p.cnStatus]?.tone}>
                      {CN_STATUS[p.cnStatus]?.label || p.cnStatus}
                    </Badge>
                  )}
                  <small>
                    {p.cnCourier || p.cnTrackingNo
                      ? `${p.cnCourier} ${p.cnTrackingNo}`.trim()
                      : '운송장 없음'}
                  </small>
                </span>
                <span role="cell" className={styles.main}>
                  <span>구매 {kst(p.purchasedAt)}</span>
                  <small>입고 {kst(p.arrivedAt)}</small>
                </span>
                <span role="cell" className={`${styles.num} ${styles.main} ${styles.payCell}`}>
                  <span>
                    {p.paidCny ? `¥${p.paidCny}` : '-'}
                    {p.payMethod && <small> · {PAY_METHOD[p.payMethod]}</small>}
                  </span>
                  <small className={p.chargedStatus === 'none' ? styles.warn : ''}>
                    {p.chargedKrw !== ''
                      ? `₩${Number(p.chargedKrw).toLocaleString('ko-KR')}`
                      : p.payAmount
                        ? `${p.payCurrency} ${p.payAmount}`
                        : '결제 미기록'}
                    {(p.chargedKrw !== '' || p.payAmount) &&
                      ` · ${CHARGED_STATUS[p.chargedStatus]?.label}`}
                  </small>
                </span>
              </button>
            ))}
          </div>
        )}
      </Section>
    </main>
  )
}
