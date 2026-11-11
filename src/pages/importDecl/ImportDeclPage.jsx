import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { getDeclarations, getPendingDeclarations, updateDeclaration } from '@/api/importDecl'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { MARKETS } from '@/constants/orderConst'
import { useMobile } from '@/hooks/useMobile'
import { DECL_TONE } from './DeclLine'
import styles from './ImportDecl.module.css'

const kst = (iso) =>
  iso
    ? new Date(iso).toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '-'

// 판매 › 수입신고 (2026-11-11) — 수입식품 구매대행 수입신고서를 주문마다 냈는지 확인
//   위: 신고해야 할 B/L (집운 출고 · 통관 전 · 신고서 없음) — 30분 점검이 유니패스에 내고 아래에 적는다
//   아래: 신고 기록 표 — 상태 · 신청번호 · B/L · 주문 · 품목. ?order=ID 면 그 주문 것만
export default function ImportDeclPage() {
  const [params, setParams] = useSearchParams()
  const orderId = Number(params.get('order')) || null
  const statusF = params.get('status') || ''
  const mobile = useMobile()
  const [pending, setPending] = useState(null)
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setError('')
    getPendingDeclarations()
      .then(setPending)
      .catch((err) => setError(err.message))
    getDeclarations({ orderId, status: statusF || undefined })
      .then(setData)
      .catch((err) => setError(err.message))
  }, [orderId, statusF])
  useEffect(load, [load])

  const setStatus = async (d, status) => {
    try {
      await updateDeclaration(d.id, { status })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="page-flat">
      <PageHeader
        title="수입신고"
        sub="구매대행 식품은 받는 사람 · B/L 마다 통관 전에 유니패스로 신고해요"
      />
      {error && <p className={`form-error ${styles.pad}`}>{error}</p>}

      {!orderId && (
        <Section name="신고해야 할 것" id="pending" sub={pending && `${pending.length}건`}>
          {pending && pending.length === 0 && (
            <p className={styles.empty}>통관 전인데 신고 안 된 B/L 이 없어요.</p>
          )}
          {(pending || []).map((g) => (
            <div key={g.blNo} className={styles.pRow}>
              <span className={styles.pBl}>B/L {g.blNo}</span>
              <span>{g.consignee}</span>
              <span className={styles.pCodes}>
                {g.orders.map((o) => (
                  <Link key={o.id} to={`/orders?id=${o.id}`}>
                    {o.code}
                    {o.stage === 'cancelled' && ' (취소)'}
                  </Link>
                ))}
              </span>
              <span className={styles.weak}>
                출고 {kst(g.dispatchedAt)} · {g.customsStatus || '관세청 화물 조회 전'}
              </span>
            </div>
          ))}
          <p className={styles.hint}>
            관세청에 화물이 잡히면(보통 출고 다음 날 밤) 30분 점검이 사전신고를 내요. 통관되면 낼 수
            없어요.
          </p>
        </Section>
      )}

      <Section
        name="신고 기록"
        id="list"
        sub={data && `${data.items.length}건`}
        action={
          <span className={styles.filters}>
            {orderId && (
              <button type="button" className="btn-ghost btn-sm" onClick={() => setParams({})}>
                주문 필터 지우기
              </button>
            )}
            <select
              className={styles.select}
              value={statusF}
              aria-label="상태로 거르기"
              onChange={(e) => {
                const p = new URLSearchParams(params)
                e.target.value ? p.set('status', e.target.value) : p.delete('status')
                setParams(p, { replace: true })
              }}
            >
              <option value="">상태 전체</option>
              {data &&
                Object.entries(data.status).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
            </select>
          </span>
        }
        flush
      >
        {data && data.items.length === 0 && <p className={styles.empty}>기록이 없어요.</p>}
        {data && data.items.length > 0 && (
          <div className={styles.table} role="table">
            {!mobile && (
              <div className={`${styles.tr} ${styles.th}`} role="row">
                <span>상태</span>
                <span>신청번호</span>
                <span>구분</span>
                <span>B/L</span>
                <span>주문</span>
                <span>수하인</span>
                <span>전송</span>
              </div>
            )}
            {data.items.map((d) => (
              <div key={d.id} className={styles.rowWrap}>
                <button
                  type="button"
                  className={styles.tr}
                  role="row"
                  aria-expanded={open === d.id}
                  onClick={() => setOpen(open === d.id ? null : d.id)}
                >
                  <span>
                    <b className={styles[DECL_TONE[d.status]]}>{d.statusLabel}</b>
                  </span>
                  <span className={styles.mono}>{d.declNo || '-'}</span>
                  <span>{d.kind === 'pre' ? '사전' : '본'}</span>
                  <span className={styles.mono}>{d.blNo || '-'}</span>
                  <span>{d.orders.map((o) => o.code).join(', ')}</span>
                  <span>{d.consignee || '-'}</span>
                  <span className={styles.weak}>{kst(d.sentAt)}</span>
                </button>
                {open === d.id && (
                  <div className={styles.more}>
                    <dl>
                      <dt>주문</dt>
                      <dd>
                        {d.orders.map((o) => (
                          <Link key={o.id} to={`/orders?id=${o.id}`} className={styles.oLink}>
                            {MARKETS[o.market]?.short} {o.code} · {o.productName}
                            {o.optionName && ` (${o.optionName})`} ×{o.quantity}
                          </Link>
                        ))}
                      </dd>
                      <dt>품목</dt>
                      <dd>
                        {d.items.length
                          ? d.items.map((i, k) => (
                              <div key={k}>
                                {i.nameEn} · {i.makerEn || '-'} · {i.country} · {i.qty}
                                {i.unit}
                              </div>
                            ))
                          : '-'}
                      </dd>
                      <dt>신고기관 · 창고</dt>
                      <dd>
                        {d.agencyCode || '-'} · {d.warehouseCode || '-'}
                      </dd>
                      <dt>선명 · 입항일</dt>
                      <dd>
                        {d.vessel || '-'} · {d.arrivalDate || '-'}
                      </dd>
                      <dt>접수 · 수리</dt>
                      <dd>
                        {d.receiptNo || '접수번호 없음'} · 접수 {kst(d.acceptedAt)} · 수리{' '}
                        {kst(d.approvedAt)}
                      </dd>
                      {(d.result || d.memo) && (
                        <>
                          <dt>메모</dt>
                          <dd>{[d.result, d.memo].filter(Boolean).join(' / ')}</dd>
                        </>
                      )}
                    </dl>
                    {['sent', 'accepted', 'fix'].includes(d.status) && (
                      <div className={styles.acts}>
                        {d.status !== 'accepted' && (
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => setStatus(d, 'accepted')}
                          >
                            접수됨
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={() => setStatus(d, 'approved')}
                        >
                          수리됨
                        </button>
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={() => setStatus(d, 'fix')}
                        >
                          보완요청
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </main>
  )
}
