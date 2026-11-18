import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { getShopAnalytics } from '@/api/shopAnalytics'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import s from './Sales.module.css'
import a from './ShopAnalytics.module.css'

const won = (v) => (v == null ? '-' : `${Math.round(v).toLocaleString()}원`)
const num = (v) => (v == null ? '-' : v.toLocaleString())
const DEVICE = { mobile: '휴대폰', tablet: '태블릿', desktop: 'PC' }
const dur = (sec) =>
  sec == null ? '-' : sec < 60 ? `${sec}초` : `${Math.floor(sec / 60)}분 ${sec % 60}초`

const todayKst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)
const addDays = (d, n) => {
  const x = new Date(`${d}T00:00:00Z`)
  x.setUTCDate(x.getUTCDate() + n)
  return x.toISOString().slice(0, 10)
}
const PRESETS = [
  ['today', '오늘', (t) => [t, t]],
  ['7', '최근 7일', (t) => [addDays(t, -6), t]],
  ['30', '최근 30일', (t) => [addDays(t, -29), t]],
  ['month', '이번 달', (t) => [`${t.slice(0, 8)}01`, t]],
]

function Kpi({ label, value, sub, tone }) {
  return (
    <div className={s.kpi} data-tone={tone}>
      <span className={s.kpiLabel}>{label}</span>
      <b className={s.kpiValue}>{value}</b>
      {sub && <small className={s.kpiSub}>{sub}</small>}
    </div>
  )
}

// 날짜별 — 방문자(막대) · 위 숫자 = 주문 건수
function DayChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.visitors))
  return (
    <div className={s.chartWrap}>
      <div className={`${s.chart} ${a.chart}`} style={{ '--n': days.length }}>
        {days.map((d) => (
          <div
            key={d.date}
            className={s.bar}
            title={`${d.date} · 방문자 ${d.visitors} · 열람 ${d.views} · 주문 ${d.orders}건 ${won(d.revenue)}`}
          >
            <span className={s.barCount}>{d.orders ? `${d.orders}건` : ''}</span>
            <div className={s.barTrack}>
              <i className={a.barVisit} style={{ height: `${(d.visitors / max) * 100}%` }} />
            </div>
            <span className={a.barVal}>{d.visitors || ''}</span>
            <span className={s.barDate}>{d.date.slice(5).replace('-', '/')}</span>
          </div>
        ))}
      </div>
      <div className={s.legend}>
        <span>
          <i className={a.barVisit} /> 방문자
        </span>
        <span className={s.weak}>막대 위 = 결제된 주문</span>
      </div>
    </div>
  )
}

// 가로 막대 줄 — 이름 · 막대 · 숫자
function HBar({ name, value, max, sub }) {
  return (
    <div className={a.hrow}>
      <span className={a.hname} title={name}>
        {name}
      </span>
      <span className={a.htrack}>
        <i style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </span>
      <span className={s.num}>
        {num(value)}
        {sub && <small className={s.weak}> {sub}</small>}
      </span>
    </div>
  )
}

// 판매 › 자사몰 분석 — 섹션: 기간 · 요약 · 날짜별 · 유입 경로 · 구매 단계 · 많이 본 상품 · 많이 본 화면 · 기기
// 자사몰(eidofood.com) 손님 브라우저가 보낸 방문 기록 (SHOP-FE lib/track.js) + 결제 주문. 봇 제외 · 개인정보 없음
export default function ShopAnalyticsPage() {
  const [params, setParams] = useSearchParams()
  const preset = params.get('p') || '7'
  const showAll = params.get('all') === '1' // 기본 = 국내 손님만 (해외 봇 · 우리 계정 제외)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const range = useMemo(() => {
    if (preset === 'custom') return [params.get('from'), params.get('to')]
    return (PRESETS.find((p) => p[0] === preset) || PRESETS[1])[2](todayKst())
  }, [preset, params])

  useEffect(() => {
    setLoading(true)
    setError('')
    getShopAnalytics({ from: range[0], to: range[1], all: showAll })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [range, showAll])

  const keepAll = showAll ? { all: '1' } : {}
  const setPreset = (k) => setParams(k === '7' ? keepAll : { p: k, ...keepAll }, { replace: true })
  const setCustom = (from, to) =>
    setParams({ p: 'custom', ...(from && { from }), ...(to && { to }), ...keepAll }, { replace: true })
  const setShowAll = (on) => {
    const next = Object.fromEntries(params)
    if (on) next.all = '1'
    else delete next.all
    setParams(next, { replace: true })
  }

  const t = data?.total
  const f0 = data?.funnel?.[0]?.sessions || 0
  const srcMax = Math.max(0, ...(data?.sources || []).map((x) => x.sessions))
  const pageMax = Math.max(0, ...(data?.pages || []).map((x) => x.views))
  const prodMax = Math.max(0, ...(data?.products || []).map((x) => x.views))
  const devMax = Math.max(0, ...(data?.devices || []).map((x) => x.visitors))
  const empty = data && t.sessions === 0
  const tr = data?.traffic

  return (
    <main className="page-flat">
      <PageHeader
        title="자사몰 분석"
        sub="eidofood.com 방문 기록 · 기본은 국내 손님만 · 주문·매출은 결제 완료 기준(시험 결제 제외)"
        action={
          data && (
            <span className={a.live} title="최근 30분 안에 움직인 방문자">
              <i data-on={data.live > 0} /> 지금 {data.live}명
            </span>
          )
        }
      />

      <Section name="기간" id="range" title={false}>
        <div className={s.filters}>
          <div className={s.chips} role="group" aria-label="기간">
            {PRESETS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`${s.chip} ${preset === k ? s.chipOn : ''}`}
                onClick={() => setPreset(k)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={s.chips} role="group" aria-label="누구까지">
            <button type="button" className={`${s.chip} ${!showAll ? s.chipOn : ''}`} onClick={() => setShowAll(false)}>
              국내 손님만
            </button>
            <button type="button" className={`${s.chip} ${showAll ? s.chipOn : ''}`} onClick={() => setShowAll(true)}>
              전체
            </button>
          </div>
          <div className={s.dates}>
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
        <div className={s.kpis} aria-busy={loading}>
          <Kpi
            label="방문자"
            value={t ? num(t.visitors) : '-'}
            sub={t ? `세션 ${num(t.sessions)}` : ''}
            tone="primary"
          />
          <Kpi
            label="화면 열람"
            value={t ? num(t.views) : '-'}
            sub={t?.viewsPerSession != null ? `세션당 ${t.viewsPerSession}` : ''}
          />
          <Kpi
            label="바로 나감"
            value={t?.bouncePct != null ? `${t.bouncePct}%` : '-'}
            sub={t ? `머문 시간 중간값 ${dur(t.medianSec)}` : ''}
            tone={t?.bouncePct > 70 ? 'warning' : undefined}
          />
          <Kpi
            label="주문"
            value={t ? `${t.orders}건` : '-'}
            sub={t ? won(t.revenue) : ''}
            tone="success"
          />
          <Kpi
            label="구매 전환율"
            value={t?.conversionPct != null ? `${t.conversionPct}%` : '-'}
            sub="주문 ÷ 세션"
          />
        </div>
        {data && !data.filter.all && data.filter.foreign + data.filter.internal > 0 && (
          <p className={s.note}>
            뺀 방문자: 해외 접속 {data.filter.foreign}명 (봇 · 크롤러로 보임) · 우리 계정 {data.filter.internal}명 (테스트 · 심사 · 대표). ‘전체’를 누르면 같이 보여요.
          </p>
        )}
        {empty && (
          <p className={s.note}>
            이 기간에 들어온 방문 기록이 없어요.
            {data.trackingSince
              ? ` 기록은 ${data.trackingSince.slice(0, 10)}부터 쌓이고 있어요.`
              : ' 방문 기록은 2026-11-15부터 쌓여요 — 그 전 기간은 비어 있어요.'}
          </p>
        )}
      </Section>

      <Section name="날짜별" id="days" sub={data && `${data.days.length}일`}>
        {data && <DayChart days={data.days} />}
      </Section>

      <div className={a.grid3}>
        <Section name="유입 경로" id="sources" sub="세션 · 장바구니 · 주문" flush>
          {(data?.sources || []).length === 0 && <p className={s.empty}>아직 없어요</p>}
          {(data?.sources || []).map((x) => (
            <HBar
              key={x.name}
              name={x.name}
              value={x.sessions}
              max={srcMax}
              sub={x.carts || x.orders ? `· 담음 ${x.carts} · 주문 ${x.orders}` : ''}
            />
          ))}
        </Section>

        <Section name="구매 단계" id="funnel" sub="세션 기준" flush>
          {(data?.funnel || []).map((x, i) => (
            <HBar
              key={x.key}
              name={x.label}
              value={x.sessions}
              max={f0}
              sub={i > 0 && f0 ? `· ${Math.round((x.sessions / f0) * 100)}%` : ''}
            />
          ))}
        </Section>

        <Section name="많이 본 상품" id="products" sub="본 세션 · 담은 세션" flush>
          {(data?.products || []).length === 0 && <p className={s.empty}>아직 없어요</p>}
          {(data?.products || []).map((x) => (
            <HBar
              key={x.code}
              name={x.name}
              value={x.views}
              max={prodMax}
              sub={x.carts ? `· 담음 ${x.carts}` : ''}
            />
          ))}
        </Section>

        <Section name="많이 본 화면" id="pages" flush>
          {(data?.pages || []).length === 0 && <p className={s.empty}>아직 없어요</p>}
          {(data?.pages || []).map((x) => (
            <HBar key={x.name} name={x.name} value={x.views} max={pageMax} />
          ))}
        </Section>

        <Section name="기기" id="devices" sub="방문자" flush>
          {(data?.devices || []).length === 0 && <p className={s.empty}>아직 없어요</p>}
          {(data?.devices || []).map((x) => (
            <HBar key={x.name} name={DEVICE[x.name] || x.name} value={x.visitors} max={devMax} />
          ))}
          {(data?.browsers || []).length > 0 && (
            <p className={a.foot}>
              {data.browsers.map((b) => `${b.name} ${b.visitors}`).join(' · ')}
            </p>
          )}
        </Section>
      </div>

      <Section
        name="자사몰 분석 › 무효 트래픽"
        id="traffic"
        sub={
          tr && tr.total
            ? `서버 요청 ${num(tr.total)} · 무효 ${num(tr.kinds.invalid)} (${tr.invalid_pct}%)`
            : '서버가 받은 요청 — 봇 · 스캐너까지 (2026-11-18부터)'
        }
      >
        {tr && tr.total === 0 ? (
          <p className={s.empty}>아직 쌓인 요청이 없어요. 서버가 받은 요청을 1분마다 모아 저장해요.</p>
        ) : (
          tr && (
            <>
              <div className={a.trafficKinds}>
                <Kpi label="정상 (손님 브라우저)" value={num(tr.kinds.valid)} />
                <Kpi label="검색 · 미리보기 봇" value={num(tr.kinds.crawler)} sub="구글 · 네이버 등 — 쓸모 있는 봇" />
                <Kpi label="무효" value={num(tr.kinds.invalid)} sub={`전체의 ${tr.invalid_pct ?? 0}%`} tone="danger" />
              </div>
              <div className={a.trafficDays}>
                {tr.days.map((d) => {
                  const t = d.valid + d.crawler + d.invalid
                  return (
                    <div key={d.date} className={a.trafficDay} title={`${d.date} · 정상 ${d.valid} · 검색 봇 ${d.crawler} · 무효 ${d.invalid}`}>
                      <div className={a.trafficStack}>
                        {t > 0 && (
                          <>
                            <i data-k="invalid" style={{ flex: d.invalid }} />
                            <i data-k="crawler" style={{ flex: d.crawler }} />
                            <i data-k="valid" style={{ flex: d.valid }} />
                          </>
                        )}
                      </div>
                      <span>{d.date.slice(5)}</span>
                      <b>{t ? num(t) : ''}</b>
                    </div>
                  )
                })}
              </div>
              <div className={a.grid3}>
                <div>
                  <p className={a.listHead}>무효 이유</p>
                  {tr.reasons.length === 0 && <p className={s.empty}>없어요</p>}
                  {tr.reasons.map((x) => (
                    <HBar key={x.key} name={x.name} value={x.hits} max={tr.reasons[0].hits} />
                  ))}
                  <p className={a.listHead}>무효 에이전트</p>
                  {tr.agents.map((x) => (
                    <HBar key={x.name} name={x.name} value={x.hits} max={tr.agents[0].hits} />
                  ))}
                </div>
                <div>
                  <p className={a.listHead}>찔러 본 주소</p>
                  {tr.paths.length === 0 && <p className={s.empty}>없어요</p>}
                  {tr.paths.map((x) => (
                    <HBar key={x.path} name={x.path} value={x.hits} max={tr.paths[0].hits} />
                  ))}
                </div>
                <div>
                  <p className={a.listHead}>무효 국가</p>
                  {tr.countries.length === 0 && <p className={s.empty}>없어요</p>}
                  {tr.countries.map((x) => (
                    <HBar key={x.code} name={x.code === '?' ? '알 수 없음' : x.code} value={x.hits} max={tr.countries[0].hits} />
                  ))}
                  {tr.crawlers.length > 0 && (
                    <>
                      <p className={a.listHead}>검색 · 미리보기 봇</p>
                      {tr.crawlers.map((x) => (
                        <HBar key={x.name} name={x.name} value={x.hits} max={tr.crawlers[0].hits} />
                      ))}
                    </>
                  )}
                </div>
              </div>
              <p className={a.foot}>
                무효 = 검색엔진이 아닌 봇 · 스캐너(.env · wp-admin 같은 없는 파일 찔러보기) · 과다 요청 · 없는 주소 · 브라우저 정보 없음.
                방문 기록(위 숫자)에는 원래 안 들어가고, 서버 부담만 줘요. 많아지면 이 목록으로 막을 대상을 정해요.
              </p>
            </>
          )
        )}
      </Section>
    </main>
  )
}
