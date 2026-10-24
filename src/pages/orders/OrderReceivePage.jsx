import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { collectOrders, getOrder, getOrders, recheckPccc } from '@/api/order'
import Badge from '@/components/Badge'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import {
  ACTOR,
  EVENT_KIND,
  MARKET_STATUS,
  MARKETS,
  PCCC_FILTERS,
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

// 추적 기록 1줄 — 누가 · 무엇을 · 보낸 값/받은 값(가린 값)
function EventRow({
  event, // object: 주문 기록
}) {
  const [open, setOpen] = useState(false)
  const actor = ACTOR[event.actorType] || ACTOR.system
  const hasData = Object.keys(event.data || {}).length > 0
  return (
    <li className={styles.event}>
      <div className={styles.eventHead}>
        <span className={styles.eventTime}>{kst(event.at)}</span>
        <Badge tone={actor.tone}>
          {actor.label}
          {event.actorName && ` · ${event.actorName}`}
        </Badge>
        <span className={styles.weak}>
          {EVENT_KIND[event.kind] || event.kind} · {VIA[event.via] || event.via}
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
      {open && <pre className={styles.eventData}>{JSON.stringify(event.data, null, 2)}</pre>}
    </li>
  )
}

// 판매 › 주문 접수 — 섹션: 수집 · 접수 목록 · 주문 상세 · 추적 기록
// 마켓 주문을 가져오면 새 주문·바뀐 주문은 BE 가 바로 통관부호(UNI-PASS)를 검증한다. 모든 동작은 추적 기록에 남는다.
export default function OrderReceivePage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null) // { items, total, pcccCounts, lastRuns, pollMinutes }
  const [detail, setDetail] = useState(null) // { order, events }
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('') // 'collect' | 'recheck' | ''
  const [showRaw, setShowRaw] = useState(false) // 마켓 원본 데이터 펼침

  const filter = params.get('pccc') || 'all'
  const selected = Number(params.get('id')) || null

  const load = useCallback(
    () =>
      getOrders({ stage: 'received', pccc: filter === 'all' ? undefined : filter })
        .then(setData)
        .catch((err) => setError(err.message)),
    [filter],
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!selected) {
      setDetail(null)
      return
    }
    getOrder(selected)
      .then(setDetail)
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
        <Section
          name="접수 목록"
          id="list"
          sub={data && `${data.total}건`}
          flush
          fill
          action={
            <div className={styles.chips}>
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
          }
        >
          {data && data.items.length === 0 && (
            <p className={styles.empty}>
              {filter === 'all'
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
                  <b>{it.productName}</b>
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
            sub={o && `${MARKETS[o.market].label} · ${o.orderNo}`}
          >
            {!o && <p className={styles.weak}>왼쪽에서 주문을 고르면 내용과 추적 기록이 보여요.</p>}
            {o && (
              <div className={styles.detail}>
                <div className={styles.dTitle}>
                  <MarketMark market={o.market} />
                  <b>{o.productName}</b>
                </div>
                <dl className={styles.kv}>
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
                    {o.shipDueAt && ` · 발송기한 ${kst(o.shipDueAt).slice(5, 10)}`}
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
                    onClick={() => setShowRaw(!showRaw)}
                    disabled={!detail.raw}
                  >
                    {showRaw ? '마켓 원본 닫기' : '마켓 원본 데이터'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={recheck}
                    disabled={busy === 'recheck'}
                  >
                    {busy === 'recheck' ? '검증 중…' : '통관부호 다시 검증'}
                  </button>
                </div>
                {showRaw && detail.raw && (
                  <div>
                    <p className={styles.weak}>
                      {MARKETS[o.market].label}가 보낸 응답 그대로예요 — 이름·전화·주소·통관부호
                      같은 개인정보만 가렸어요.
                    </p>
                    <pre className={styles.raw}>{JSON.stringify(detail.raw, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </Section>

          <Section name="추적 기록" id="trace" sub={detail && `${detail.events.length}건`} fill>
            {!detail && (
              <p className={styles.weak}>주문을 고르면 수집·검증·처리 기록이 시간 순으로 보여요.</p>
            )}
            {detail && (
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
