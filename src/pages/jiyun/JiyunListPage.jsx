import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { getJiyunList } from '@/api/jiyun'
import Badge from '@/components/Badge'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import {
  CHARGED_STATUS,
  JIYUN_STATUS,
  MARKETS,
  PAY_METHOD,
  TRANSPORTS,
} from '@/constants/orderConst'
import styles from '../purchases/Purchases.module.css'

// 'MM-DD HH:mm' (KST)
const kst = (iso) =>
  iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(5, 16) : '-'

// 판매 › 집운 기록 — 섹션: 검색·필터 · 집운 목록
// 집운(배대지)에 배송 요청하고 배송비를 낸 기록 전체 — 출고 · H B/L · 국내 송장까지. 추가는 주문 접수의 고객 주문 추적 기록에서 한다
export default function JiyunListPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  const status = params.get('status') || 'all'
  const q = params.get('q') || ''

  useEffect(() => {
    getJiyunList({ limit: 500 })
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
    for (const j of items || []) c[j.status] = (c[j.status] || 0) + 1
    return c
  }, [items])

  const rows = useMemo(() => {
    const word = q.trim().toLowerCase()
    return (items || []).filter(
      (j) =>
        (status === 'all' || j.status === status) &&
        (!word ||
          [
            j.jiyunNo,
            j.hbl,
            j.krTrackingNo,
            j.order.code,
            j.order.orderNo,
            j.order.productName,
            ...j.packages,
          ].some((v) => (v || '').toLowerCase().includes(word))),
    )
  }, [items, status, q])

  return (
    <main className="page-flat">
      <PageHeader
        title="집운 기록"
        sub="집운 배송 요청 · 배송비 결제 · 출고 · 국내 송장"
        action={
          <button className="btn-secondary btn-md" onClick={() => navigate('/orders')}>
            주문 접수에서 집운 기록 추가
          </button>
        }
      />

      <Section name="검색·필터" id="filters" title={false}>
        <div className={styles.filters}>
          <input
            className={`form-input ${styles.search}`}
            placeholder="집운 번호 · H B/L · 국내 송장 · 중국 운송장 · OR 코드 · 상품명"
            aria-label="집운 기록 검색"
            value={q}
            onChange={(e) => set({ q: e.target.value })}
          />
          <select
            className="form-input"
            value={status}
            onChange={(e) => set({ status: e.target.value })}
            aria-label="집운 상태로 거르기"
          >
            <option value="all">상태 전체 {counts.all}</option>
            {Object.entries(JIYUN_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label} {counts[k] || 0}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="form-error">{error}</p>}
      </Section>

      <Section name="집운 목록" id="list" sub={items && `${rows.length}건`} flush fill>
        {items && rows.length === 0 && (
          <p className={styles.empty}>
            {items.length === 0
              ? '아직 집운 기록이 없어요. 주문 접수 › 추적 기록에서 국제 발송 칸이나 "집운 기록하기"를 눌러 적어요.'
              : '조건에 맞는 집운 기록이 없어요'}
          </p>
        )}
        {rows.length > 0 && (
          <div className={styles.table} role="table" aria-label="집운 기록">
            <div className={`${styles.row} ${styles.head}`} role="row">
              <span role="columnheader">집운 번호 · 소포</span>
              <span role="columnheader">고객 주문</span>
              <span role="columnheader">상태 · 송장</span>
              <span role="columnheader">요청 · 출고</span>
              <span role="columnheader" className={styles.num}>
                배송비 · 실제 청구
              </span>
            </div>
            {rows.map((j) => (
              <button
                key={j.id}
                type="button"
                role="row"
                className={styles.row}
                onClick={() =>
                  navigate(`/orders/jiyun/${j.id}/edit?order=${j.order.id}&from=jiyun`)
                }
              >
                <span role="cell" className={styles.main}>
                  <b className={styles.mono}>{j.jiyunNo}</b>
                  <small>
                    {j.packages.length ? `소포 ${j.packages.length}개` : '소포 미입력'}
                    {j.weightKg && ` · ${j.weightKg}kg`}
                    {j.transport && ` · ${TRANSPORTS[j.transport]}`}
                  </small>
                </span>
                <span role="cell" className={styles.main}>
                  <b>
                    <span className={styles.mono}>{j.order.code}</span> ·{' '}
                    {MARKETS[j.order.market]?.label}
                  </b>
                  <small>
                    {j.order.productName} ×{j.order.quantity}
                  </small>
                </span>
                <span role="cell" className={styles.main}>
                  <Badge tone={JIYUN_STATUS[j.status]?.tone}>
                    {JIYUN_STATUS[j.status]?.label || j.status}
                  </Badge>
                  <small>
                    {j.krTrackingNo
                      ? `${j.krCourierName} ${j.krTrackingNo}`.trim()
                      : j.hbl
                        ? `H B/L ${j.hbl}`
                        : '송장 없음'}
                  </small>
                </span>
                <span role="cell" className={styles.main}>
                  <span>요청 {kst(j.requestedAt)}</span>
                  <small>출고 {kst(j.dispatchedAt)}</small>
                </span>
                <span role="cell" className={`${styles.num} ${styles.main} ${styles.payCell}`}>
                  <span>
                    {j.feeCny ? `¥${j.feeCny}` : '-'}
                    {j.payMethod && <small> · {PAY_METHOD[j.payMethod]}</small>}
                  </span>
                  <small className={j.chargedStatus === 'none' ? styles.warn : ''}>
                    {j.chargedKrw !== ''
                      ? `₩${Number(j.chargedKrw).toLocaleString('ko-KR')}`
                      : j.payAmount
                        ? `${j.payCurrency} ${j.payAmount}`
                        : '결제 미기록'}
                    {(j.chargedKrw !== '' || j.payAmount) &&
                      ` · ${CHARGED_STATUS[j.chargedStatus]?.label}`}
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
