import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'

import {
  collectOrders,
  getOrder,
  getOrders,
  ORDERS_COLLECTED_EVENT,
  recheckPccc,
} from '@/api/order'
import { getPurchases } from '@/api/taobaoPurchase'
import Badge from '@/components/Badge'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import {
  ACTOR,
  CN_STATUS,
  EVENT_KIND,
  MARKET_STATUS,
  MARKETS,
  KIND_STEP,
  ORDER_STAGES,
  PCCC_FILTERS,
  TRACE_REF,
  TRACE_SOURCE,
  TRACE_STAGE,
  TRACE_STEPS,
  PCCC_STATUS,
  VIA,
} from '@/constants/orderConst'
import { formatWon } from '@/utils/pricing'
import styles from './Orders.module.css'

// 'YYYY-MM-DD HH:mm' (KST)
const kst = (iso) =>
  iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 16) : '-'
const kstTime = (iso) => (iso ? kst(iso).slice(5) : '-')

function MarketMark({
  market, // 'naver' | 'coupang'
}) {
  return (
    <span className={`${styles.mark} ${styles[market]}`} title={MARKETS[market].label}>
      {MARKETS[market].short}
    </span>
  )
}

// 기록의 세부 단계 — data.step 이 있으면 그것, 없으면 종류로 (타오바오 구매 수정은 바뀐 중국 배송 상태로)
const stepOf = (e) => {
  const d = e.data || {}
  if (d.step) return d.step
  if (e.kind === 'pccc_check') return d.result?.status === 'ok' ? '확인' : null
  if (e.kind === 'purchase_changed') {
    const to = d.changes?.cn_status?.to
    return to === 'shipped' ? '중국 내 배송' : to === 'arrived' ? '배대지 입고' : null
  }
  return KIND_STEP[e.kind] || null
}
const occurredOf = (e) => e.data?.occurred_at || e.at

// 타오바오 구매 쪽 세부 단계 — 누르면 구매 기록(추가·수정) 화면으로
const PURCHASE_STEPS = ['타오바오 구매', '중국 내 배송', '배대지 입고']

// 추적 기록 위 진행 막대 — 세부 단계 11칸, 단계마다 처음 일어난 날. 타오바오 구매 칸은 눌러서 기록
function TraceProgress({
  events, // Array: 주문 기록
  onPurchase, // function?: 타오바오 구매 기록 열기 (없으면 누를 수 없음)
  hasPurchase, // boolean: 이미 기록한 타오바오 구매가 있는지
}) {
  const first = {}
  for (const e of events) {
    const s = stepOf(e)
    if (!s) continue
    const t = occurredOf(e)
    if (!first[s] || t < first[s]) first[s] = t
  }
  const lastDone = TRACE_STEPS.reduce((n, x, i) => (first[x.step] ? i : n), -1)
  const now = TRACE_STEPS[lastDone + 1]
  const done = TRACE_STEPS[lastDone]
  const start = first[TRACE_STEPS[0].step]
  const days =
    done && start ? Math.round((new Date(first[done.step]) - new Date(start)) / 86400000) : null
  const nowIsPurchase = now && PURCHASE_STEPS.includes(now.step)
  return (
    <div className={styles.progress} aria-label="진행 단계">
      <ol className={styles.pBar}>
        {TRACE_STEPS.map((x, i) => {
          const cls = `${styles.pSeg} ${first[x.step] ? styles.pDone : i === lastDone + 1 ? styles.pNow : ''} ${
            i > 0 && TRACE_STEPS[i - 1].stage !== x.stage ? styles.pGap : ''
          }`
          const title = `${TRACE_STAGE[x.stage].label} › ${x.step}${first[x.step] ? ` · ${kst(first[x.step])}` : ''}`
          return PURCHASE_STEPS.includes(x.step) && onPurchase ? (
            <li key={x.step} className={cls}>
              <button
                type="button"
                className={styles.pBtn}
                title={`${title} — 눌러서 타오바오 구매 기록`}
                onClick={onPurchase}
              />
            </li>
          ) : (
            <li key={x.step} className={cls} title={title} />
          )
        })}
      </ol>
      <div className={styles.pText}>
        {done ? (
          <>
            <b>{done.step}</b> {kst(first[done.step]).slice(5, 10)}
          </>
        ) : (
          '아직 시작 전'
        )}
        {now && !nowIsPurchase && <span className={styles.weak}> · 다음 {now.step}</span>}
        {nowIsPurchase && onPurchase && (
          <>
            {' · '}
            <button type="button" className={`btn-text ${styles.pLink}`} onClick={onPurchase}>
              {hasPurchase ? `${now.step} 기록하기` : '타오바오에서 샀으면 기록하기'}
            </button>
          </>
        )}
        {days != null && days > 0 && <span className={styles.weak}> · 주문부터 {days}일</span>}
      </div>
    </div>
  )
}

// 추적 기록 1줄 — 시각 · 단계(중분류) · 종류만. 누르면 내용 칸이 뜬다 (한 번에 하나, 바깥 누르기·스크롤·Esc 로 닫힘)
// 내용 칸은 섹션 스크롤에 잘리지 않게 body 위에 fixed 로 그린다 (아래 자리가 모자라면 위로)
function EventRow({
  event, // object: 주문 기록
  onPurchase, // function?: 타오바오 구매 기록이면 그 구매 열기 (누르면 바로 이동)
  popOpen, // boolean: 내용 칸이 열려 있는지 (한 번에 하나 — 부모가 정함)
  onTogglePop, // function(open: boolean): 내용 칸 열기·닫기
}) {
  const [open, setOpen] = useState(false) // 보낸 값·받은 값 펼침
  const [pos, setPos] = useState(null) // 내용 칸 위치
  const rowRef = useRef(null)
  const popRef = useRef(null)
  const actor = ACTOR[event.actorType] || ACTOR.system
  const d = event.data || {}
  const hasData = Object.keys(d).length > 0
  const step = stepOf(event)
  const stage = d.stage || TRACE_STEPS.find((x) => x.step === step)?.stage
  const occurred = occurredOf(event)
  // 실제 시각과 기록 시각이 5분 넘게 다르면 기록 시각도 보여준다
  const late = d.occurred_at && Math.abs(new Date(event.at) - new Date(d.occurred_at)) > 5 * 60000
  const refs = Object.entries(d.refs || {}).filter(([, v]) => v)
  const bad = event.kind === 'pccc_check' && d.result?.status && d.result.status !== 'ok'

  // 열릴 때 줄 위치에 맞춰 칸 자리를 잡는다 (아래 자리가 모자라면 위로)
  useLayoutEffect(() => {
    if (!popOpen) {
      setPos(null)
      return
    }
    const r = rowRef.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.max(r.width, 300)
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
    setPos(
      window.innerHeight - r.bottom < 180
        ? { left, width, bottom: window.innerHeight - r.top + 2 }
        : { left, width, top: r.bottom - 2 },
    )
  }, [popOpen])

  // 바깥을 누르거나 스크롤·창 크기 바꿈·Esc 면 닫는다
  useEffect(() => {
    if (!popOpen) return undefined
    const close = () => onTogglePop(false)
    const outside = (e) => {
      if (rowRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return
      close()
    }
    const esc = (e) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', outside)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', outside)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', esc)
    }
  }, [popOpen, onTogglePop])

  return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [pos])

  return (
    <li
      ref={rowRef}
      className={`${styles.event} ${popOpen ? styles.eventOn : ''} ${onPurchase ? styles.eventLink : ''}`}
      tabIndex={0}
      // 타오바오 구매 기록은 누르면 바로 그 구매 화면으로, 나머지는 내용 칸 열고 닫기
      onClick={() => (onPurchase ? onPurchase() : onTogglePop(!popOpen))}
      onKeyDown={(e) => e.key === 'Enter' && (onPurchase ? onPurchase() : onTogglePop(!popOpen))}
    >
      <div className={styles.eventHead}>
        <span className={styles.eventTime}>{kst(occurred).slice(5)}</span>
        {step && (
          <Badge tone={TRACE_STAGE[stage]?.tone || 'neutral'}>
            {TRACE_STAGE[stage]?.label ? `${TRACE_STAGE[stage].label} › ` : ''}
            {step}
          </Badge>
        )}
        <b className={`${styles.eventKind} ${bad ? styles.bad : ''}`}>
          {EVENT_KIND[event.kind] || event.kind}
          {bad && ' — 불일치'}
        </b>
        {event.via === 'mock' && <span className={styles.weak}>목업</span>}
        {onPurchase && <span className={styles.go}>구매 보기 ›</span>}
      </div>
      {open && <pre className={styles.eventData}>{JSON.stringify(d, null, 2)}</pre>}
      {popOpen &&
        pos &&
        createPortal(
          <div
            className={styles.pop}
            style={pos}
            role="tooltip"
            ref={popRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.eventSummary}>{event.summary}</div>
            <div className={styles.weak}>
              {actor.label}
              {event.actorName && ` ${event.actorName}`} ·{' '}
              {TRACE_SOURCE[d.source] || VIA[event.via] || event.via}
              {event.syncRunId && ` · 수집 #${event.syncRunId}`}
              {late && ` · 기록 ${kst(event.at).slice(5)}`}
            </div>
            {refs.length > 0 && (
              <div className={styles.refs}>
                {refs.map(([k, v]) => (
                  <span key={k} className={styles.ref}>
                    {TRACE_REF[k] || k} <b>{v}</b>
                  </span>
                ))}
              </div>
            )}
            {(hasData || onPurchase) && (
              <div className={styles.popActs}>
                {hasData && (
                  <button type="button" className="btn-text" onClick={() => setOpen(!open)}>
                    {open ? '보낸 값·받은 값 접기' : '보낸 값·받은 값'}
                  </button>
                )}
                {onPurchase && (
                  <button type="button" className="btn-text" onClick={onPurchase}>
                    타오바오 구매 열기
                  </button>
                )}
              </div>
            )}
          </div>,
          document.body,
        )}
    </li>
  )
}

// 판매 › 주문 접수 — 섹션: 수집 · 접수 목록 · 추적 기록 (머리 탭: 기록 · 주문 상세 · 마켓 원본)
// 마켓 주문을 가져오면 새 주문·바뀐 주문은 BE 가 바로 통관부호(UNI-PASS)를 검증한다. 모든 동작은 추적 기록에 남는다.
export default function OrderReceivePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [purchases, setPurchases] = useState(null) // 고른 주문의 타오바오 구매
  const [data, setData] = useState(null) // { items, total, pcccCounts, lastRuns, pollMinutes }
  const [detail, setDetail] = useState(null) // { order, events }
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('') // 'collect' | 'recheck' | ''
  const [popId, setPopId] = useState(null) // 내용 칸이 열린 추적 기록 줄 (한 번에 하나)
  const [view, setView] = useState('trace') // 추적 기록 섹션 보기: trace 기록 · detail 주문 상세 · raw 마켓 원본

  const stage = params.get('stage') || 'received' // 목록 단계 탭
  const filter = params.get('pccc') || 'all'
  const search = params.get('q') || '' // 자사 코드 · 마켓 주문번호
  const selected = Number(params.get('id')) || null

  const load = useCallback(
    () =>
      getOrders({
        stage: stage === 'all' ? undefined : stage,
        pccc: filter === 'all' ? undefined : filter,
        search: search.trim() || undefined,
      })
        .then(setData)
        .catch((err) => setError(err.message)),
    [stage, filter, search],
  )

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0) // 검색어 입력 중엔 잠깐 기다렸다가
    return () => clearTimeout(timer)
  }, [load, search])

  useEffect(() => {
    if (!selected) {
      setDetail(null)
      setPurchases(null)
      return
    }
    getOrder(selected)
      .then(setDetail)
      .catch((err) => setError(err.message))
    getPurchases({ orderId: selected })
      .then(setPurchases)
      .catch((err) => setError(err.message))
  }, [selected])

  const set = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) =>
      v == null || v === 'all' ? next.delete(k) : next.set(k, v),
    )
    setParams(next, { replace: true })
  }

  const collect = async () => {
    setBusy('collect')
    setError('')
    try {
      await collectOrders()
      window.dispatchEvent(new Event(ORDERS_COLLECTED_EVENT)) // 아래 바도 바로 다시 읽게
      await load()
      if (selected) setDetail(await getOrder(selected))
    } catch (err) {
      setError(err.message)
    }
    setBusy('')
  }

  const recheck = async () => {
    setBusy('recheck')
    try {
      setDetail(await recheckPccc(selected))
      await load()
    } catch (err) {
      setError(err.message)
    }
    setBusy('')
  }

  const counts = data?.pcccCounts || {}
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0)
  const o = detail?.order

  // 타오바오 구매 기록 열기 — id 를 주면 그 구매, 아니면 이 주문의 마지막 구매 (없으면 새로)
  const openPurchase = (purchaseId) => {
    const id = typeof purchaseId === 'number' ? purchaseId : purchases?.[purchases.length - 1]?.id
    navigate(id ? `/orders/purchases/${id}/edit?order=${o.id}` : `/orders/${o.id}/purchases/new`)
  }

  return (
    <main className="page-flat">
      <PageHeader
        title="주문 접수"
        sub="마켓 주문을 받아 통관부호를 바로 검증해요"
        action={
          <button className="btn-primary btn-md" onClick={collect} disabled={busy === 'collect'}>
            {busy === 'collect' ? '가져오는 중…' : '지금 가져오기'}
          </button>
        }
      />

      <div className={`fit-row ${styles.split}`}>
        <Section name="접수 목록" id="list" sub={data && `${data.total}건`} flush fill>
          <div className={styles.toolbar}>
            <span className={styles.stageTabs} role="tablist" aria-label="주문 단계">
              {ORDER_STAGES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={stage === s.key}
                  className={`${styles.stageTab} ${stage === s.key ? styles.stageOn : ''}`}
                  onClick={() => set({ stage: s.key === 'received' ? null : s.key, id: null })}
                >
                  {s.label}
                </button>
              ))}
            </span>
            <input
              className={styles.search}
              value={search}
              onChange={(e) => set({ q: e.target.value || null, id: null })}
              placeholder="OR-… · 마켓 주문번호"
              aria-label="자사 코드·마켓 주문번호 검색"
            />
            {PCCC_FILTERS.map((k) => (
              <button
                key={k}
                type="button"
                className={`${styles.chip} ${filter === k ? styles.chipOn : ''}`}
                onClick={() => set({ pccc: k, id: null })}
              >
                {k === 'all' ? '전체' : PCCC_STATUS[k].short}{' '}
                {k === 'all' ? allCount : counts[k] || 0}
              </button>
            ))}
          </div>
          {error && <p className={`form-error ${styles.pad}`}>{error}</p>}

          {data && data.items.length === 0 && (
            <p className={styles.empty}>
              {search
                ? '검색한 번호의 주문이 없어요'
                : filter === 'all'
                  ? '접수된 주문이 없어요. "지금 가져오기"로 네이버·쿠팡 주문을 받아요.'
                  : '이 상태의 주문이 없어요'}
            </p>
          )}
          <div className={styles.rows} role="list">
            {(data?.items || []).map((it) => (
              <button
                key={it.id}
                type="button"
                role="listitem"
                className={`${styles.row} ${it.id === selected ? styles.rowOn : ''}`}
                onClick={() => set({ id: it.id })}
              >
                <MarketMark market={it.market} />
                <span className={styles.prod}>
                  <b>
                    <span className={styles.code}>{it.code || '코드 없음'}</span> {it.productName}
                  </b>
                  <small>
                    {it.optionName && `${it.optionName} · `}×{it.quantity} · {it.receiver.name} ·{' '}
                    {kstTime(it.paidAt || it.orderedAt)}
                  </small>
                </span>
                <span className={styles.rowState}>
                  <Badge tone={PCCC_STATUS[it.pcccStatus].tone}>
                    {PCCC_STATUS[it.pcccStatus].short}
                  </Badge>
                  <small className={styles.weak}>
                    {MARKET_STATUS[it.marketStatus] || it.marketStatus}
                    {it.confirmed && ' · 발주확인됨'}
                  </small>
                </span>
                <span className={styles.price}>
                  {it.totalPrice == null ? '-' : formatWon(it.totalPrice)}
                </span>
              </button>
            ))}
          </div>
        </Section>

        <div className={`fit-col ${styles.side}`}>
          <Section
            name="추적 기록"
            id="trace"
            sub={detail && (view !== 'trace' ? o.code : `${o.code} · ${detail.events.length}건`)}
            fill
            action={
              detail && (
                <div className={styles.chips} role="tablist" aria-label="추적 기록 보기">
                  {[
                    ['trace', '기록'],
                    ['detail', '주문 상세'],
                    ...(detail.raw ? [['raw', '마켓 원본']] : []),
                  ].map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      role="tab"
                      aria-selected={view === k}
                      className={`${styles.chip} ${view === k ? styles.chipOn : ''}`}
                      onClick={() => setView(k)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )
            }
          >
            {!detail && (
              <p className={styles.weak}>
                왼쪽에서 주문을 고르면 수집·검증·처리 기록이 시간 순으로 보여요.
              </p>
            )}
            {detail && view === 'raw' && (
              <>
                <p className={styles.rawNote}>마켓이 보낸 응답 그대로예요 — 개인정보만 가렸어요.</p>
                <pre className={styles.raw}>{JSON.stringify(detail.raw, null, 2)}</pre>
              </>
            )}
            {detail && view === 'detail' && (
              <div className={styles.detail}>
                <div className={styles.dTitle}>
                  <MarketMark market={o.market} />
                  <b>{o.productName}</b>
                </div>
                <dl className={styles.kv}>
                  <dt>자사 코드</dt>
                  <dd className={styles.code}>{o.code || '-'}</dd>
                  <dt>마켓 주문번호</dt>
                  <dd>
                    {MARKETS[o.market].label} {o.orderNo}
                    <span className={styles.weak}> · 줄 {o.lineNo}</span>
                  </dd>
                  <dt>옵션 · 수량</dt>
                  <dd>
                    {o.optionName || '-'} × {o.quantity}
                  </dd>
                  <dt>결제</dt>
                  <dd>
                    {o.totalPrice == null ? '-' : formatWon(o.totalPrice)} ·{' '}
                    {kst(o.paidAt || o.orderedAt)}
                  </dd>
                  <dt>마켓 상태</dt>
                  <dd>
                    {MARKET_STATUS[o.marketStatus] || o.marketStatus}
                    {o.confirmed ? ' · 발주확인됨' : ' · 발주확인 전'}
                    {o.shipDueAt &&
                      o.stage === 'received' &&
                      ` · 발송기한 ${kst(o.shipDueAt).slice(5, 10)}`}
                  </dd>
                  <dt>판매자 코드</dt>
                  <dd>{o.sellerCode || '-'}</dd>
                  <dt>수취인</dt>
                  <dd>
                    {o.receiver.name} · {o.receiver.phone || '전화 없음'} · (
                    {o.receiver.zip || '우편번호 없음'}) {o.receiver.address}
                  </dd>
                  <dt>통관부호</dt>
                  <dd className={styles.pccc}>
                    <span>{o.receiver.pccc || '없음'}</span>
                    <Badge tone={PCCC_STATUS[o.pcccStatus].tone}>
                      {PCCC_STATUS[o.pcccStatus].label}
                    </Badge>
                  </dd>
                  <dt>검증 결과</dt>
                  <dd>
                    {o.pcccMessage || '-'}
                    {o.pcccValidTo && ` · 유효기간 ${o.pcccValidTo}`}
                    <span className={styles.weak}> · {kst(o.pcccCheckedAt)}</span>
                  </dd>
                </dl>
                <div className={styles.dActs}>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={recheck}
                    disabled={busy === 'recheck'}
                  >
                    {busy === 'recheck' ? '검증 중…' : '통관부호 다시 검증'}
                  </button>
                </div>
              </div>
            )}
            {detail && view === 'trace' && (
              <TraceProgress
                events={detail.events}
                hasPurchase={!!purchases?.length}
                onPurchase={o && o.stage !== 'cancelled' ? openPurchase : undefined}
              />
            )}
            {detail && view === 'trace' && (
              <ol className={styles.events}>
                {detail.events.map((e) => (
                  <EventRow
                    key={e.id}
                    event={e}
                    popOpen={popId === e.id}
                    onTogglePop={(open) => setPopId(open ? e.id : null)}
                    onPurchase={
                      e.data?.purchase_id ? () => openPurchase(e.data.purchase_id) : undefined
                    }
                  />
                ))}
              </ol>
            )}
          </Section>
        </div>
      </div>
    </main>
  )
}
