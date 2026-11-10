import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { getSalesSummary } from '@/api/sales'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import styles from './Sales.module.css'

const MONTH_TARGET = 600000 // 월 이익 목표 (사용자 목표: 월급과 합쳐 350만 원 → AGC 60만 원)
const MARKET = { coupang: '쿠팡', naver: '네이버', shop: '자사몰' }

const won = (v) => (v == null ? '-' : `${Math.round(v).toLocaleString()}원`)
const man = (v) => (v == null ? '-' : `${(v / 10000).toFixed(v >= 1000000 ? 0 : 1)}만`)
const pct = (v) => (v == null ? '-' : `${v}%`)

// KST 오늘 · 기간 프리셋
const todayKst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)
const addDays = (s, n) => {
  const d = new Date(`${s}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const mondayOf = (s) => {
  const d = new Date(`${s}T00:00:00Z`)
  return addDays(s, -((d.getUTCDay() + 6) % 7))
}
const PRESETS = [
  ['week', '이번 주', (t) => [mondayOf(t), t]],
  ['lastweek', '지난 주', (t) => [addDays(mondayOf(t), -7), addDays(mondayOf(t), -1)]],
  ['month', '이번 달', (t) => [`${t.slice(0, 8)}01`, t]],
  [
    'lastmonth',
    '지난 달',
    (t) => {
      const first = `${t.slice(0, 8)}01`
      const end = addDays(first, -1)
      return [`${end.slice(0, 8)}01`, end]
    },
  ],
  ['all', '전체', () => [null, null]],
]

function Kpi({ label, value, sub, tone }) {
  return (
    <div className={styles.kpi} data-tone={tone}>
      <span className={styles.kpiLabel}>{label}</span>
      <b className={styles.kpiValue}>{value}</b>
      {sub && <small className={styles.kpiSub}>{sub}</small>}
    </div>
  )
}

// 날짜별 막대 — 매출(연한 막대) 위에 이익(진한 막대). 칸이 많으면 가로 스크롤
function DayChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.revenue))
  return (
    <div className={styles.chartWrap}>
      <div className={styles.chart} style={{ '--n': days.length }}>
        {days.map((d) => (
          <div
            key={d.date}
            className={styles.bar}
            title={`${d.date} · ${d.lines}건 · 매출 ${won(d.revenue)} · 이익 ${won(d.profit)}${d.marginPct != null ? ` (${d.marginPct}%)` : ''}`}
          >
            <span className={styles.barCount}>{d.lines || ''}</span>
            <div className={styles.barTrack}>
              <i className={styles.barRev} style={{ height: `${(d.revenue / max) * 100}%` }} />
              <i
                className={`${styles.barProfit} ${d.profit < 0 ? styles.neg : ''}`}
                style={{ height: `${(Math.abs(d.profit) / max) * 100}%` }}
              />
            </div>
            <span className={styles.barDate}>{d.date.slice(5).replace('-', '/')}</span>
          </div>
        ))}
      </div>
      <div className={styles.legend}>
        <span>
          <i className={styles.barRev} /> 매출
        </span>
        <span>
          <i className={styles.barProfit} /> 이익
        </span>
        <span className={styles.weak}>막대 위 숫자 = 주문 건수</span>
      </div>
    </div>
  )
}

// 판매 › 매출 현황 — 섹션: 기간 · 요약 · 날짜별 · 판매처별 · 제품별 · 주문별
// 구매·집운 기록이 아직 없는 주문은 조사가·배송비 추정으로 넣고 '추정' 표시 (BE /sales/summary)
export default function SalesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const preset = params.get('p') || 'month'
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const range = useMemo(() => {
    const t = todayKst()
    if (preset === 'custom') return [params.get('from'), params.get('to')]
    return (PRESETS.find((p) => p[0] === preset) || PRESETS[2])[2](t)
  }, [preset, params])

  useEffect(() => {
    setLoading(true)
    setError('')
    getSalesSummary({ from: range[0], to: range[1] })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [range])

  const setPreset = (k) => {
    const next = new URLSearchParams()
    if (k !== 'month') next.set('p', k)
    setParams(next, { replace: true })
  }
  const setCustom = (from, to) => {
    const next = new URLSearchParams({ p: 'custom' })
    if (from) next.set('from', from)
    if (to) next.set('to', to)
    setParams(next, { replace: true })
  }

  const t = data?.total
  // 이번 달이면 월말 예상 이익 (지금까지 이익 ÷ 지난 날 × 그 달 날수)
  const forecast = useMemo(() => {
    if (preset !== 'month' || !t) return null
    const today = todayKst()
    const day = Number(today.slice(8, 10))
    const [y, m] = today.split('-').map(Number)
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
    return Math.round((t.profit / day) * days)
  }, [preset, t])

  return (
    <main className="page-flat">
      <PageHeader
        title="매출 현황"
        sub="주문일 기준 · 테스트 주문 제외 · 취소·반품은 매출 0 (환불 안 된 구매만 손실) · 구매·집운 기록 전이면 추정"
      />

      <Section name="기간" id="range" title={false}>
        <div className={styles.filters}>
          <div className={styles.chips} role="group" aria-label="기간">
            {PRESETS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`${styles.chip} ${preset === k ? styles.chipOn : ''}`}
                onClick={() => setPreset(k)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={styles.dates}>
            <input
              type="date"
              className="form-input"
              aria-label="시작일"
              value={range[0] || ''}
              onChange={(e) => setCustom(e.target.value, range[1])}
            />
            <span>~</span>
            <input
              type="date"
              className="form-input"
              aria-label="종료일"
              value={range[1] || ''}
              onChange={(e) => setCustom(range[0], e.target.value)}
            />
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
      </Section>

      <Section name="요약" id="summary" title={false} plain>
        <div className={styles.kpis} aria-busy={loading}>
          <Kpi label="매출" value={t ? man(t.revenue) : '-'} sub={t ? won(t.revenue) : ''} />
          <Kpi label="이익" value={t ? man(t.profit) : '-'} sub={t ? won(t.profit) : ''} tone={t && t.profit < 0 ? 'danger' : 'success'} />
          <Kpi
            label="마진율"
            value={t ? pct(t.marginPct) : '-'}
            sub={t ? `정산 ${man(t.settlement)} · 원가 ${man(t.purchase + t.jiyun)}` : ''}
            tone="primary"
          />
          <Kpi
            label="주문"
            value={t ? `${t.orders}건` : '-'}
            sub={t ? `상품 ${t.lines}줄${t.cancelled ? ` · 취소 ${t.cancelled}` : ''}` : ''}
          />
          <Kpi label="건당 이익" value={t && t.lines ? won(t.profit / t.lines) : '-'} sub={t && t.lines ? `건당 매출 ${won(t.revenue / t.lines)}` : ''} />
          {forecast != null && (
            <Kpi
              label="이번 달 예상 이익"
              value={man(forecast)}
              sub={`목표 ${man(MONTH_TARGET)} 대비 ${Math.round((forecast / MONTH_TARGET) * 100)}%`}
              tone={forecast >= MONTH_TARGET ? 'success' : 'warning'}
            />
          )}
        </div>
        {forecast != null && (
          <div className={styles.goal} title={`이번 달 이익 ${won(t.profit)} / 목표 ${won(MONTH_TARGET)}`}>
            <i style={{ width: `${Math.min(100, (t.profit / MONTH_TARGET) * 100)}%` }} />
            <i className={styles.goalFc} style={{ width: `${Math.min(100, (forecast / MONTH_TARGET) * 100)}%` }} />
            <span>
              목표 {man(MONTH_TARGET)} 중 지금 {man(t.profit)} ({Math.round((t.profit / MONTH_TARGET) * 100)}%)
            </span>
          </div>
        )}
        {t?.estimatedLines > 0 && (
          <p className={styles.note}>
            구매·집운 기록 전이라 원가를 추정한 주문 {t.estimatedLines}건 포함 — 기록이 들어오면 실제 값으로 바뀌어요
          </p>
        )}
      </Section>

      <Section name="날짜별" id="days" sub={data && `${data.days.length}일`}>
        {data && data.days.length > 0 ? <DayChart days={data.days} /> : <p className={styles.empty}>주문이 없어요</p>}
      </Section>

      <div className={styles.grid2}>
        <Section name="판매처별" id="markets" flush>
          <div className={styles.table}>
            <div className={`${styles.row} ${styles.mrow} ${styles.head}`}>
              <span>판매처</span>
              <span className={styles.num}>건수</span>
              <span className={styles.num}>매출</span>
              <span className={styles.num}>이익</span>
              <span className={styles.num}>마진</span>
            </div>
            {(data?.markets || []).map((m) => (
              <div key={m.market} className={`${styles.row} ${styles.mrow}`}>
                <b>{m.label}</b>
                <span className={styles.num}>
                  {m.lines}
                  {m.cancelled ? <small className={styles.weak}> (취소 {m.cancelled})</small> : null}
                </span>
                <span className={styles.num}>{won(m.revenue)}</span>
                <span className={`${styles.num} ${m.profit < 0 ? styles.bad : ''}`}>{won(m.profit)}</span>
                <span className={styles.num}>{pct(m.marginPct)}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section name="제품별" id="products" sub={data && `${data.products.length}개 · 이익 순`} flush fill>
          <div className={styles.table}>
            <div className={`${styles.row} ${styles.prow} ${styles.head}`}>
              <span>제품</span>
              <span className={styles.num}>건수</span>
              <span className={styles.num}>매출</span>
              <span className={styles.num}>이익</span>
              <span className={styles.num}>마진</span>
            </div>
            {(data?.products || []).map((p) => (
              <div key={p.key} className={`${styles.row} ${styles.prow}`}>
                <span className={styles.main}>
                  <b>{p.title}</b>
                  <small className={styles.mono}>{p.key}</small>
                </span>
                <span className={styles.num}>{p.lines}</span>
                <span className={styles.num}>{won(p.revenue)}</span>
                <span className={`${styles.num} ${p.profit < 0 ? styles.bad : ''}`}>{won(p.profit)}</span>
                <span className={`${styles.num} ${p.marginPct != null && p.marginPct < 10 ? styles.warn : ''}`}>
                  {pct(p.marginPct)}
                </span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section name="주문별" id="orders" sub={data && `${data.orders.length}줄 · 최근 순`} flush fill>
        {data && data.orders.length === 0 && <p className={styles.empty}>주문이 없어요</p>}
        {data && data.orders.length > 0 && (
          <div className={styles.table} role="table" aria-label="주문별 이익">
            <div className={`${styles.row} ${styles.orow} ${styles.head}`} role="row">
              <span role="columnheader">주문</span>
              <span role="columnheader">상품</span>
              <span role="columnheader" className={styles.num}>매출</span>
              <span role="columnheader" className={styles.num}>정산</span>
              <span role="columnheader" className={styles.num}>구매</span>
              <span role="columnheader" className={styles.num}>집운</span>
              <span role="columnheader" className={styles.num}>이익</span>
              <span role="columnheader" className={styles.num}>마진</span>
            </div>
            {data.orders.map((o) => (
              <div
                key={o.id}
                role="row"
                tabIndex={0}
                className={`${styles.row} ${styles.orow} ${styles.click} ${o.cancelled ? styles.cancel : ''}`}
                onClick={() => navigate(`/orders/${o.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/orders/${o.id}`)}
              >
                <span role="cell" className={styles.main}>
                  <b className={styles.mono}>{o.code}</b>
                  <small>
                    {o.date.slice(5).replace('-', '/')} · {MARKET[o.market] || o.market}
                    {o.cancelled ? ' · 취소' : ''}
                  </small>
                </span>
                <span role="cell" className={styles.main}>
                  <b>{o.productName}</b>
                  <small>
                    {o.optionName}
                    {o.quantity > 1 ? ` ×${o.quantity}` : ''}
                  </small>
                </span>
                <span role="cell" className={styles.num} data-label="매출">{won(o.revenue)}</span>
                <span role="cell" className={styles.num} data-label="정산">
                  {won(o.settlement)}
                  {o.estimated.includes('settlement') && <em title="쿠팡 정산 전 — 수수료율로 계산">추정</em>}
                </span>
                <span role="cell" className={styles.num} data-label="구매">
                  {won(o.purchase)}
                  {o.estimated.includes('purchase') && <em title="타오바오 구매 전 — 조사가로 계산">추정</em>}
                </span>
                <span role="cell" className={styles.num} data-label="집운">
                  {won(o.jiyun)}
                  {o.estimated.includes('jiyun') && <em title="집운 결제 전 — 배송비 추정">추정</em>}
                </span>
                <span role="cell" className={`${styles.num} ${o.profit < 0 ? styles.bad : ''}`} data-label="이익">
                  <b>{won(o.profit)}</b>
                </span>
                <span role="cell" className={styles.num} data-label="마진">{pct(o.marginPct)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </main>
  )
}
