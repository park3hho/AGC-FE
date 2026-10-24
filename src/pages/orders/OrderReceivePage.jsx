import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { collectOrders, getOrder, getOrders, recheckPccc } from '@/api/order'
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

// 수집 칸 1개 — 마켓별 마지막 수집 결과
function RunCard({
  market, // 'naver' | 'coupang'
  run, // object | null: 마지막 수집
}) {
  return (
    <div className={styles.run}>
      <MarketMark market={market} />
      <div className={styles.runText}>
        <b>{MARKETS[market].label}</b>
        {!run && <span className={styles.weak}>아직 안 가져왔어요</span>}
        {run && (
          <>
            <span>
              {kstTime(run.finishedAt || run.startedAt)} ·{' '}
              {run.trigger === 'poller' ? '자동' : '수동'}
              {run.ok === null && ' · 가져오는 중'}
            </span>
            {run.ok ? (
              <span className={styles.weak}>
                받은 {run.fetched} · 새 주문 {run.created} · 변경 {run.changed} · 검증 {run.checked}
              </span>
            ) : (
              run.ok === false && <span className={styles.bad}>실패 — {run.error}</span>
            )}
          </>
        )}
      </div>
    </div>
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

// 추적 기록 위 진행 막대 — 세부 단계 11개, 단계마다 처음 일어난 날
function TraceProgress({
  events, // Array: 주문 기록
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
  return (
    <div className={styles.progress} aria-label="진행 단계">
      <ol className={styles.pBar}>
        {TRACE_STEPS.map((x, i) => (
          <li
            key={x.step}
            className={`${styles.pSeg} ${first[x.step] ? styles.pDone : i === lastDone + 1 ? styles.pNow : ''} ${
              i > 0 && TRACE_STEPS[i - 1].stage !== x.stage ? styles.pGap : ''
            }`}
            title={`${TRACE_STAGE[x.stage].label} › ${x.step}${first[x.step] ? ` · ${kst(first[x.step])}` : ''}`}
          />
        ))}
      </ol>
      <div className={styles.pText}>
        {done ? (
          <>
            <b>{done.step}</b> {kst(first[done.step]).slice(5, 10)}
          </>
        ) : (
          '아직 시작 전'
        )}
        {now && <span className={styles.weak}> · 다음 {now.step}</span>}
        {days != null && days > 0 && <span className={styles.weak}> · 주문부터 {days}일</span>}
      </div>
    </div>
  )
}

// 추적 기록 1줄 — 실제로 일어난 시각 · 단계 · 누가 · 출처 · 관련 번호 · 보낸 값/받은 값(가린 값)
function EventRow({
  event, // object: 주문 기록
}) {
  const [open, setOpen] = useState(false)
  const actor = ACTOR[event.actorType] || ACTOR.system
  const d = event.data || {}
  const hasData = Object.keys(d).length > 0
  const step = stepOf(event)
  const stage = d.stage || TRACE_STEPS.find((x) => x.step === step)?.stage
  const occurred = occurredOf(event)
  // 실제 시각과 기록 시각이 5분 넘게 다르면 기록 시각도 보여준다
  const late = d.occurred_at && Math.abs(new Date(event.at) - new Date(d.occurred_at)) > 5 * 60000
  const refs = Object.entries(d.refs || {}).filter(([, v]) => v)
  return (
    <li className={styles.event}>
      <div className={styles.eventHead}>
        <span className={styles.eventTime}>{kst(occurred)}</span>
        {step && (
          <Badge tone={TRACE_STAGE[stage]?.tone || 'neutral'}>
            {TRACE_STAGE[stage]?.label ? `${TRACE_STAGE[stage].label} › ` : ''}
            {step}
          </Badge>
        )}
        <span className={styles.weak}>
          {EVENT_KIND[event.kind] || event.kind} · {actor.label}
          {event.actorName && ` ${event.actorName}`} ·{' '}
          {TRACE_SOURCE[d.source] || VIA[event.via] || event.via}
          {event.via === 'mock' && ' · 목업'}
          {event.syncRunId && ` · 수집 #${event.syncRunId}`}
        </span>
        {hasData && (
          <button
            type="button"
            className={`btn-text ${styles.more}`}
            onClick={() => setOpen(!open)}
          >
            {open ? '접기' : '보낸 값·받은 값'}
          </button>
        )}
      </div>
      <div className={styles.eventSummary}>{event.summary}</div>
      {(refs.length > 0 || late) && (
        <div className={styles.refs}>
          {refs.map(([k, v]) => (
            <span key={k} className={styles.ref}>
              {TRACE_REF[k] || k} <b>{v}</b>
            </span>
          ))}
          {late && <span className={styles.weak}>기록 {kst(event.at).slice(5)}</span>}
        </div>
      )}
      {open && <pre className={styles.eventData}>{JSON.stringify(d, null, 2)}</pre>}
    </li>
  )
}

// 타오바오 구매 1줄 — 상태 · 주문번호 · 판매처 · 결제 위안 · 중국 운송장 · 입고
function PurchaseRow({
  purchase, // object: 타오바오 구매
  onOpen, // function
}) {
  const p = purchase
  const st = CN_STATUS[p.cnStatus] || CN_STATUS.ordered
  const when =
    p.cnStatus === 'arrived'
      ? `입고 ${kstTime(p.arrivedAt)}`
      : p.shippedAt
        ? `발송 ${kstTime(p.shippedAt)}`
        : `구매 ${kstTime(p.purchasedAt)}`
  return (
    <button type="button" className={styles.purchase} onClick={onOpen}>
      <Badge tone={st.tone}>{st.label}</Badge>
      <span className={styles.prod}>
        <b>{p.taobaoOrderNo || '주문번호 없음'}</b>
        <small>
          {[
            p.shopName,
            p.paidCny && `¥${p.paidCny}`,
            p.cnTrackingNo && `${p.cnCourier || '택배'} ${p.cnTrackingNo}`,
          ]
            .filter(Boolean)
            .join(' · ') || '내용 없음'}
        </small>
      </span>
      <small className={styles.weak}>{when}</small>
    </button>
  )
}

// 판매 › 주문 접수 — 섹션: 수집 · 접수 목록 · 주문 상세 · 타오바오 구매 · 추적 기록
// 마켓 주문을 가져오면 새 주문·바뀐 주문은 BE 가 바로 통관부호(UNI-PASS)를 검증한다. 모든 동작은 추적 기록에 남는다.
export default function OrderReceivePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [purchases, setPurchases] = useState(null) // 고른 주문의 타오바오 구매
  const [data, setData] = useState(null) // { items, total, pcccCounts, lastRuns, pollMinutes }
  const [detail, setDetail] = useState(null) // { order, events }
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('') // 'collect' | 'recheck' | ''
  const [showRaw, setShowRaw] = useState(false) // 마켓 원본 데이터 펼침

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

      <Section name="수집" id="collect" title={false}>
        <div className={styles.runs}>
          <RunCard market="naver" run={data?.lastRuns.naver} />
          <RunCard market="coupang" run={data?.lastRuns.coupang} />
          <div className={styles.poll}>
            <b>자동 수집</b>
            <span className={styles.weak}>
              {data?.pollMinutes ? `${data.pollMinutes}분마다` : '꺼짐 — 주기는 나중에 정해요'}
            </span>
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
      </Section>

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
            name="주문 상세"
            id="detail"
            sub={o && `${o.code} · ${MARKETS[o.market].label} ${o.orderNo}`}
          >
            {!o && <p className={styles.weak}>왼쪽에서 주문을 고르면 내용과 추적 기록이 보여요.</p>}
            {o && (
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
          </Section>

          <Section
            name="타오바오 구매"
            id="purchase"
            sub={purchases && (purchases.length ? `${purchases.length}건` : '아직 안 삼')}
            flush
            action={
              o && (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => navigate(`/orders/${o.id}/purchases/new`)}
                >
                  구매 추가
                </button>
              )
            }
          >
            {!o && <p className={styles.pad}>주문을 고르면 타오바오 구매·중국 배송이 보여요.</p>}
            {o && purchases?.length === 0 && (
              <p className={styles.pad}>
                타오바오에서 사면 '구매 추가'로 주문번호·운송장을 적어요.
              </p>
            )}
            {(purchases || []).map((p) => (
              <PurchaseRow
                key={p.id}
                purchase={p}
                onOpen={() => navigate(`/orders/purchases/${p.id}/edit?order=${o.id}`)}
              />
            ))}
          </Section>

          <Section
            name="추적 기록"
            id="trace"
            sub={
              detail &&
              (showRaw ? '마켓이 보낸 응답 그대로 · 개인정보만 가림' : `${detail.events.length}건`)
            }
            fill
            action={
              detail?.raw && (
                <div className={styles.chips}>
                  <button
                    type="button"
                    className={`${styles.chip} ${!showRaw ? styles.chipOn : ''}`}
                    onClick={() => setShowRaw(false)}
                  >
                    기록
                  </button>
                  <button
                    type="button"
                    className={`${styles.chip} ${showRaw ? styles.chipOn : ''}`}
                    onClick={() => setShowRaw(true)}
                  >
                    마켓 원본
                  </button>
                </div>
              )
            }
          >
            {!detail && (
              <p className={styles.weak}>주문을 고르면 수집·검증·처리 기록이 시간 순으로 보여요.</p>
            )}
            {detail && showRaw && (
              <pre className={styles.raw}>{JSON.stringify(detail.raw, null, 2)}</pre>
            )}
            {detail && !showRaw && <TraceProgress events={detail.events} />}
            {detail && !showRaw && (
              <ol className={styles.events}>
                {detail.events.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </ol>
            )}
          </Section>
        </div>
      </div>
    </main>
  )
}
