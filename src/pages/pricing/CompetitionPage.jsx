import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { getCompetitorQueue, getCompetitors } from '@/api/competitor'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import styles from './Competition.module.css'

const PLATFORMS = [
  ['coupang', '쿠팡'],
  ['naver', '네이버'],
]

// 판정 — 우리가 최저 · 우리만 · 내려서 맞출 수 있음(최소가 ≥ 경쟁가) · 못 맞춤(경쟁가 < 최소가) · 확인 전
export const VERDICT = {
  lose: { label: '못 맞춤', tone: 'danger', hint: '경쟁가가 최소가보다 낮아요' },
  match: {
    label: '맞출 수 있음',
    tone: 'warning',
    hint: '최소가 안에서 경쟁가까지 내릴 수 있어요',
  },
  cheapest: { label: '우리가 최저', tone: 'success', hint: '같은 상품 중 우리가 가장 싸요' },
  only_us: { label: '우리만 팜', tone: 'primary', hint: '같은 상품을 파는 다른 판매자가 없어요' },
  unchecked: { label: '확인 전', tone: '', hint: '아직 검색하지 않았어요' },
}
const ORDER = ['lose', 'match', 'cheapest', 'only_us', 'unchecked']

// 확인 대기열 사유 묶음 (BE competitor_queue.RANK 순서) — 점 색 + 글자
export const QUEUE_GROUP = {
  order: {
    label: '주문 들어옴',
    tone: 'danger',
    hint: '마지막 확인 뒤 24시간 넘게 지났고 그 사이 주문이 들어왔어요',
  },
  changed: {
    label: '바뀜',
    tone: 'warning',
    hint: '확인한 뒤 판매가·원가·옵션·상품명이 바뀌었거나 새 옵션·새 등록·확인 필요 표시가 생겼어요',
  },
  new: { label: '확인 전', tone: 'primary', hint: '아직 한 번도 검색하지 않았어요' },
  retry: {
    label: '검색 안 됨',
    tone: 'ring',
    hint: '지난번 검색에서 같은 상품을 못 찾았어요 — 다시 찾기',
  },
  watch: { label: '재확인', tone: 'muted', hint: '못 맞춤·맞출 수 있음 — 경쟁자 가격 다시 보기' },
  stale: { label: '오래됨', tone: '', hint: '특별한 사유 없음 — 확인이 오래된 순' },
}
const QUEUE_ORDER = ['order', 'changed', 'new', 'retry', 'watch', 'stale']

function QueueDot({ g }) {
  const s = QUEUE_GROUP[g] || QUEUE_GROUP.stale
  return (
    <span className={styles.st} data-tone={s.tone} title={s.hint}>
      <i />
      {s.label}
    </span>
  )
}

const reasonText = (it) =>
  it.reasons
    .filter((r) => r.code !== 'stale')
    .map((r) => (r.detail ? `${r.label} ${r.detail}` : r.label))
    .join(' · ')

const TYPE = { agency: '구매대행', warehouse: '국내 재고', unknown: '모름' }

const won = (v) => (v == null ? '-' : `${v.toLocaleString()}원`)
const kst = (iso) =>
  iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(5, 16) : ''

function Verdict({ v }) {
  const s = VERDICT[v] || VERDICT.unchecked
  return (
    <span className={styles.st} data-tone={s.tone} title={s.hint}>
      <i />
      {s.label}
    </span>
  )
}

// 판매 › 최저가 경쟁 — 섹션: 판매처·필터 · 제품 목록
// 제품마다 최소가(마진 5% 바닥) · 현재 판매가 · 그 마켓 최저가 판매자 · 그 가격 · 구매대행/국내 재고.
// 경쟁자 쪽은 에이전트가 매일 새벽 3시 검색해서 덮어쓴다. 가격은 바꾸지 않는다 — 판단은 사람이
export default function CompetitionPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [queues, setQueues] = useState({})
  const [error, setError] = useState('')

  const pf = params.get('pf') || 'coupang'
  const view = params.get('view') === 'queue' ? 'queue' : 'verdict'
  const verdict = params.get('v') || 'all'
  const group = params.get('g') || 'all'
  const q = params.get('q') || ''

  useEffect(() => {
    getCompetitors()
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (queues[pf]) return
    getCompetitorQueue(pf)
      .then((r) => setQueues((prev) => ({ ...prev, [pf]: r })))
      .catch((err) => setError(err.message))
  }, [pf, queues])

  const queue = queues[pf]
  // 판정 보기에서도 제품마다 가장 앞선 확인 사유를 보여 준다 (제품 id → 대기열 첫 줄)
  const firstReason = useMemo(() => {
    const m = {}
    for (const it of queue?.items || []) if (!m[it.productId]) m[it.productId] = it
    return m
  }, [queue])

  const qrows = useMemo(() => {
    const word = q.trim().toLowerCase()
    return (queue?.items || []).filter(
      (it) =>
        (group === 'all' || it.group === group) &&
        (!word ||
          [it.code, it.title, it.option, it.query, it.vendorName].some((v) =>
            (v || '').toLowerCase().includes(word),
          )),
    )
  }, [queue, group, q])

  const set = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (!v || v === 'all' ? next.delete(k) : next.set(k, v)))
    setParams(next, { replace: true })
  }

  const all = useMemo(
    () =>
      (data?.items || [])
        .filter((it) => it.platforms[pf])
        .map((it) => ({ ...it, p: it.platforms[pf] })),
    [data, pf],
  )

  const counts = useMemo(() => {
    const c = { all: all.length }
    for (const it of all) c[it.p.main.verdict] = (c[it.p.main.verdict] || 0) + 1
    return c
  }, [all])

  const lastChecked = useMemo(() => {
    let t = ''
    for (const it of all)
      for (const c of it.p.checks) if (c.competitor?.checkedAt > t) t = c.competitor.checkedAt
    return t
  }, [all])

  const rows = useMemo(() => {
    const word = q.trim().toLowerCase()
    return all
      .filter(
        (it) =>
          (verdict === 'all' || it.p.main.verdict === verdict) &&
          (!word ||
            [it.product.code, it.product.title, it.p.main.competitor?.vendorName].some((v) =>
              (v || '').toLowerCase().includes(word),
            )),
      )
      .sort(
        (a, b) =>
          ORDER.indexOf(a.p.main.verdict) - ORDER.indexOf(b.p.main.verdict) ||
          a.product.code.localeCompare(b.product.code),
      )
  }, [all, verdict, q])

  return (
    <main className="page-flat">
      <PageHeader
        title="최저가 경쟁"
        sub={`쿠팡·네이버 최저가 판매자와 우리 가격 비교 · 최소가 = 마진 ${data?.marginFloorPct ?? 5}% 바닥 · 매일 새벽 점검은 확인 대기열 순서대로`}
      />

      <Section name="판매처·필터" id="filters" title={false}>
        <div className={styles.filters}>
          <div className={styles.tabs} role="tablist" aria-label="판매처">
            {PLATFORMS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={pf === k}
                className={`${styles.tab} ${pf === k ? styles.tabOn : ''}`}
                onClick={() => set({ pf: k === 'coupang' ? '' : k })}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={styles.tabs} role="tablist" aria-label="보기">
            {[
              ['verdict', '판정'],
              ['queue', '확인 대기열'],
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={view === k}
                className={`${styles.tab} ${view === k ? styles.tabOn : ''}`}
                onClick={() => set({ view: k === 'verdict' ? '' : k })}
              >
                {label}
                {k === 'queue' && queue ? (
                  <small className={styles.tabNum}>{queue.total}</small>
                ) : null}
              </button>
            ))}
          </div>
          {view === 'queue' && (
            <div className={styles.chips} role="group" aria-label="확인 사유로 거르기">
              <button
                type="button"
                className={`${styles.chip} ${group === 'all' ? styles.chipOn : ''}`}
                onClick={() => set({ g: 'all' })}
              >
                전체 <small>{queue?.total || 0}</small>
              </button>
              {QUEUE_ORDER.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`${styles.chip} ${group === k ? styles.chipOn : ''}`}
                  title={QUEUE_GROUP[k].hint}
                  onClick={() => set({ g: k })}
                >
                  {QUEUE_GROUP[k].label} <small>{queue?.counts[k] || 0}</small>
                </button>
              ))}
            </div>
          )}
          <div
            className={styles.chips}
            role="group"
            aria-label="판정으로 거르기"
            hidden={view === 'queue'}
          >
            <button
              type="button"
              className={`${styles.chip} ${verdict === 'all' ? styles.chipOn : ''}`}
              onClick={() => set({ v: 'all' })}
            >
              전체 <small>{counts.all || 0}</small>
            </button>
            {ORDER.map((k) => (
              <button
                key={k}
                type="button"
                className={`${styles.chip} ${verdict === k ? styles.chipOn : ''}`}
                data-tone={VERDICT[k].tone}
                onClick={() => set({ v: k })}
              >
                {VERDICT[k].label} <small>{counts[k] || 0}</small>
              </button>
            ))}
          </div>
          <input
            className={`form-input ${styles.search}`}
            placeholder={
              view === 'queue' ? '제품 코드 · 이름 · 옵션 · 검색어' : '제품 코드 · 이름 · 판매자'
            }
            aria-label="최저가 경쟁 검색"
            value={q}
            onChange={(e) => set({ q: e.target.value })}
          />
        </div>
        {error && <p className="form-error">{error}</p>}
      </Section>

      {view === 'queue' && (
        <Section
          name="확인 대기열"
          id="queue"
          sub={
            queue &&
            `${qrows.length}줄 · 위에서부터 점검 · 저장하면 사유가 풀려요 · ${queue.generatedAt?.slice(5) || ''} 기준`
          }
          flush
          fill
        >
          {!queue && !error && <p className={styles.empty}>불러오는 중…</p>}
          {queue && qrows.length === 0 && <p className={styles.empty}>조건에 맞는 줄이 없어요</p>}
          {qrows.length > 0 && (
            <QueueTable rows={qrows} onOpen={(id) => navigate(`/pricing/${id}`)} />
          )}
        </Section>
      )}

      {view === 'verdict' && (
        <Section
          name="제품 목록"
          id="list"
          sub={data && `${rows.length}개${lastChecked ? ` · 마지막 점검 ${kst(lastChecked)}` : ''}`}
          flush
          fill
        >
          {data && rows.length === 0 && <p className={styles.empty}>조건에 맞는 제품이 없어요</p>}
          {rows.length > 0 && (
            <div className={styles.table} role="table" aria-label="최저가 경쟁">
              <div className={`${styles.row} ${styles.head}`} role="row">
                <span role="columnheader">제품 · 비교 옵션</span>
                <span role="columnheader" className={styles.num}>
                  최소가
                </span>
                <span role="columnheader" className={styles.num}>
                  현재 판매가
                </span>
                <span role="columnheader">최저가 판매자</span>
                <span role="columnheader" className={styles.num}>
                  판매자 가격
                </span>
                <span role="columnheader" title="구매대행(해외 배송) · 국내 재고(창고 판매)">
                  유형
                </span>
                <span role="columnheader">판정</span>
              </div>
              {rows.map((it) => {
                const m = it.p.main
                const c = m.competitor
                const diff =
                  c?.vendorPrice != null && m.ourPrice != null ? c.vendorPrice - m.ourPrice : null
                return (
                  <div
                    key={it.product.id}
                    role="row"
                    tabIndex={0}
                    className={styles.row}
                    onClick={() => navigate(`/pricing/${it.product.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/pricing/${it.product.id}`)}
                  >
                    <span role="cell" className={styles.main}>
                      <b>{it.product.title}</b>
                      <small>
                        <span className={styles.mono}>{it.product.code}</span> ·{' '}
                        {m.option || '옵션 없음'}
                        {it.p.optionCount > 1 ? ` 외 ${it.p.optionCount - 1}` : ''}
                      </small>
                    </span>
                    <span
                      role="cell"
                      className={`${styles.num} ${styles.main}`}
                      data-label="최소가"
                    >
                      <span>{won(m.minPrice)}</span>
                      <small title={m.costBasis === 'survey' ? '조사가 기준' : '실제 구매가 기준'}>
                        원가 {won(m.cost)}
                        {m.costBasis && m.costBasis !== 'survey' ? ' · 실구매' : ''}
                      </small>
                    </span>
                    <span role="cell" className={`${styles.num} ${styles.main}`} data-label="우리">
                      <span>{won(m.ourPrice)}</span>
                      <small className={m.marginPct != null && m.marginPct < 5 ? styles.bad : ''}>
                        {m.marginPct != null ? `마진 ${m.marginPct}% · ${won(m.profit)}` : ''}
                      </small>
                    </span>
                    <span
                      role="cell"
                      className={`${styles.main} ${styles.seller}`}
                      data-label="판매자"
                    >
                      {c?.status === 'found' ? (
                        <>
                          {c.vendorUrl ? (
                            <a
                              href={c.vendorUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.vlink}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {c.vendorName || '판매자'}
                            </a>
                          ) : (
                            <b>{c.vendorName || '판매자'}</b>
                          )}
                          <small title={c.vendorNote}>{c.vendorNote}</small>
                        </>
                      ) : (
                        <span className={styles.weak}>
                          {c?.status === 'only_us'
                            ? '다른 판매자 없음'
                            : c?.status === 'not_found'
                              ? '검색 안 됨'
                              : '-'}
                        </span>
                      )}
                    </span>
                    <span
                      role="cell"
                      className={`${styles.num} ${styles.main}`}
                      data-label="최저가"
                    >
                      <span>{c?.status === 'found' ? won(c.vendorPrice) : '-'}</span>
                      <small className={diff != null && diff < 0 ? styles.bad : ''}>
                        {diff != null ? `${diff > 0 ? '+' : ''}${diff.toLocaleString()}원` : ''}
                        {c?.vendorShipping ? ` · 배송비 ${c.vendorShipping.toLocaleString()}` : ''}
                      </small>
                    </span>
                    <span role="cell" className={styles.main}>
                      <span>{c?.status === 'found' ? TYPE[c.vendorType] || '모름' : '-'}</span>
                    </span>
                    <span role="cell" className={styles.main}>
                      <Verdict v={m.verdict} />
                      {firstReason[it.product.id] &&
                      firstReason[it.product.id].group !== 'stale' ? (
                        <small title={reasonText(firstReason[it.product.id])}>
                          <QueueDot g={firstReason[it.product.id].group} />
                        </small>
                      ) : (
                        <small>{c?.checkedAt ? kst(c.checkedAt) : ''}</small>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Section>
      )}
    </main>
  )
}

// 확인 대기열 표 — 순서 · 사유 · 제품·옵션 · 검색어(메모) · 지난 결과 · 마지막 확인(보류·사람 확인·메모)
function QueueTable({ rows, onOpen }) {
  return (
    <div className={styles.table} role="table" aria-label="확인 대기열">
      <div className={`${styles.qrow} ${styles.head}`} role="row">
        <span role="columnheader" className={styles.num}>
          #
        </span>
        <span role="columnheader">사유</span>
        <span role="columnheader">제품 · 옵션</span>
        <span role="columnheader">검색어</span>
        <span role="columnheader">지난 결과</span>
        <span role="columnheader">마지막 확인</span>
      </div>
      {rows.map((it) => {
        const why = reasonText(it)
        const flags = [
          it.skipUntil ? `${it.skipUntil.slice(5)}까지 보류` : '',
          it.needsUserCheck ? '사람 확인 필요' : '',
          it.userNote,
        ].filter(Boolean)
        return (
          <div
            key={`${it.productId}-${it.optionId ?? 'base'}`}
            role="row"
            tabIndex={0}
            className={`${styles.qrow} ${it.skipped ? styles.skipped : ''}`}
            onClick={() => onOpen(it.productId)}
            onKeyDown={(e) => e.key === 'Enter' && onOpen(it.productId)}
          >
            <span role="cell" className={`${styles.num} ${styles.mono} ${styles.weak}`}>
              {it.no}
            </span>
            <span role="cell" className={styles.main}>
              <QueueDot g={it.group} />
              <small title={why}>{why}</small>
            </span>
            <span role="cell" className={styles.main}>
              <b>{it.title}</b>
              <small>
                <span className={styles.mono}>{it.code}</span> · {it.option || '대표 옵션'}
              </small>
            </span>
            <span role="cell" className={styles.main} data-label="검색어">
              <span
                className={styles.clip}
                title={
                  it.querySource === 'override'
                    ? '지정한 검색어'
                    : it.querySource === 'last'
                      ? '지난번 검색어'
                      : '제품명'
                }
              >
                {it.query}
                {it.querySource === 'override' ? <em className={styles.tag}> · 지정</em> : null}
              </span>
              <small title={it.searchNote}>{it.searchNote}</small>
            </span>
            <span role="cell" className={styles.main} data-label="지난 결과">
              {it.lastVerdict && it.lastVerdict !== 'unchecked' ? (
                <Verdict v={it.lastVerdict} />
              ) : (
                <span className={styles.weak}>
                  {it.lastStatus === 'not_found' ? '검색 안 됨' : '-'}
                </span>
              )}
              <small>
                {it.vendorPrice != null
                  ? `경쟁 ${won(it.vendorPrice)} · 우리 ${won(it.ourPrice)}`
                  : ''}
              </small>
            </span>
            <span role="cell" className={styles.main} data-label="마지막 확인">
              <span className={styles.mono}>
                {it.lastCheckedAt ? kst(it.lastCheckedAt) : '없음'}
              </span>
              <small className={it.needsUserCheck ? styles.bad : ''} title={it.userNote}>
                {flags.join(' · ')}
              </small>
            </span>
          </div>
        )
      })}
    </div>
  )
}
