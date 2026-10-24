import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getDetailPage } from '@/api/detailPage'
import { createListing, deleteListing, getListings, syncCoupangListings } from '@/api/listing'
import { getPricing } from '@/api/pricing'
import { getProduct } from '@/api/product'
import Badge from '@/components/Badge'
import HoverInfo from '@/components/common/HoverInfo'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import SectionTabs, { useSectionTabs } from '@/components/common/SectionTabs'
import { FEATURE, hasFeature } from '@/constants/permissions'
import { GOOD_MARGIN_PCT, PLATFORMS } from '@/constants/pricingConst'
import { useAuth } from '@/hooks/useAuth'
import { toKstDate, toKstDateTime } from '@/utils/date'
import {
  calcOption,
  cnyToKrw,
  effectiveFxRate,
  formatCny,
  formatFx,
  formatWon,
} from '@/utils/pricing'
import styles from './ProductOverview.module.css'

// 상품 상세 (2026-10-24 목업 A 채택) — 첫 화면은 숫자만, 자세한 건 다음 동작에서 (FE DESIGN.md §4.7)
//   왼쪽: 요약(숫자 4개) · 정보(탭: 가격 / 진행 / 마켓) — 가격은 총액만, 구성은 마우스를 올리면
//   오른쪽: 상세설명 (승인된 상세 이미지, 이 섹션만 스크롤)
const SECTIONS = [
  { id: 'summary', name: '요약' },
  { id: 'info', name: '정보' },
  { id: 'detail', name: '상세설명' },
]
const PLATFORM_LABEL = Object.fromEntries(PLATFORMS.map((p) => [p.key, p.label]))
const EMPTY_FORM = { platform: 'naver', marketProductId: '', title: '', url: '', listedAt: '' }
// 구성 막대 색 — 상품·배송은 옅은 파랑, 수수료 회색, 차익 진한 파랑 (오버레이는 body 에 그려져 CSS 변수 대신 값)
const MIX = { goods: '#b0c4de', ship: '#7fa7d9', fee: '#d5d9de', profit: '#3182f6' }
const YMD = (iso) => toKstDate(iso).slice(2).replace(/-/g, '') // '261024' — 가격 확정일
const SHORT = (iso) => toKstDateTime(iso).slice(5) // 'MM-DD HH:mm'

// 걸린 시간 — 1시간 미만 'N분', 2일 미만 'N시간 M분', 그 이상 'N일 N시간'
const fmtDur = (from, to) => {
  if (!from || !to) return ''
  const min = Math.max(0, Math.round((new Date(to) - new Date(from)) / 60000))
  if (min < 60) return `${min}분`
  const h = Math.floor(min / 60)
  if (h < 48) return min % 60 ? `${h}시간 ${min % 60}분` : `${h}시간`
  return h % 24 ? `${Math.floor(h / 24)}일 ${h % 24}시간` : `${Math.floor(h / 24)}일`
}
const daysAgo = (date) => {
  if (!date) return ''
  const d = Math.floor((Date.now() - new Date(`${date}T00:00:00+09:00`)) / 86400000)
  return d <= 0 ? '오늘' : `${d}일 전`
}
const range = (vals, fmt) => {
  const v = vals.filter((x) => x != null && Number.isFinite(x))
  if (!v.length) return '-'
  const lo = Math.min(...v)
  const hi = Math.max(...v)
  return lo === hi ? fmt(lo) : `${fmt(lo)}~${fmt(hi)}`
}
const pct = (n) => `${n.toFixed(1)}%`
const wonNum = (n) => (Math.round(n) || 0).toLocaleString('ko-KR')

// 구성 막대 — 상품 · 배송 · 수수료 · 차익 (판매가 = 합)
function Breakdown({ parts, total }) {
  return (
    <>
      <div className={styles.stack}>
        {parts.map((p) => (
          <i
            key={p.label}
            style={{ width: `${(Math.max(0, p.value) / total) * 100}%`, background: p.color }}
          />
        ))}
      </div>
      <div className={styles.legend}>
        {parts.map((p) => (
          <span key={p.label} className={styles.legendRow}>
            <i style={{ background: p.color }} />
            <span>{p.label}</span>
            <b>{formatWon(p.value)}</b>
          </span>
        ))}
      </div>
    </>
  )
}

export default function ProductOverviewPage() {
  const { productId } = useParams()
  const { user } = useAuth()
  const canEdit = hasFeature(user, FEATURE.LISTING)
  const tabs = useSectionTabs(SECTIONS)

  const [data, setData] = useState(null) // { product, surveys, pricing, design }
  const [listings, setListings] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState(null) // 마켓 › 직접 추가 (null = 닫힘)
  const [infoTab, setInfoTab] = useState('price') // 정보 탭: price · flow · market
  const [imgTab, setImgTab] = useState('coupang')

  const loadListings = useCallback(() => getListings(productId).then(setListings), [productId])

  useEffect(() => {
    Promise.all([getProduct(productId), getPricing(productId), getDetailPage(productId)])
      .then(([p, pricing, design]) =>
        setData({ product: p.product, surveys: p.surveys, pricing, design }),
      )
      .catch((err) => setError(err.message))
    loadListings().catch((err) => setError(err.message))
  }, [productId, loadListings])

  // 옵션 × 판매처 계산 — 가격을 확정(저장)한 시점 환율 기준 (product_pricing.fx_rate · 판매처마다 다름)
  //   원가 = (상품 위안 + 배송 위안) × 그 환율. 화면에는 'YYMMDD 기준'으로 적는다 (오늘 환율 비교는 나중에 따로)
  const rows = useMemo(() => {
    if (!data) return []
    const { pricing } = data
    return pricing.options.map((o) => {
      const markets = {}
      PLATFORMS.forEach((p) => {
        const pr = pricing.pricings[p.key]
        if (!pr?.saved) return
        const base = {
          fxMarkupPct: pr.fxMarkupPct,
          platformFeeRate: pr.platformFeeRate,
          paymentFeeRate: pr.paymentFeeRate,
        }
        const settings = { ...base, fxRate: pr.fxRate }
        const fx = effectiveFxRate(settings)
        const goods = cnyToKrw(o.priceCny, fx)
        const ship = cnyToKrw(o.shippingCny, fx)
        const sale = pr.optionPrices.find((x) => x.optionId === o.id)?.salePrice ?? null
        markets[p.key] = {
          sale,
          fxRate: pr.fxRate,
          pricedAt: pr.updatedAt,
          goods,
          ship,
          cost: goods != null && ship != null ? goods + ship : null,
          r: sale ? calcOption(o, sale, settings) : null,
        }
      })
      return { o, markets }
    })
  }, [data])
  const timeline = useMemo(() => {
    if (!data) return null
    const { product, surveys, pricing, design } = data
    const page = design.page
    const dates = surveys
      .map((s) => s.researchedAt)
      .filter(Boolean)
      .sort()
    const approvals = (page?.reviews || []).filter((r) => r.action === 'approve')
    const uploads = Object.fromEntries(
      PLATFORMS.map((p) => [
        p.key,
        listings
          .filter((l) => l.platform === p.key && l.listedAt)
          .map((l) => l.listedAt)
          .sort()[0] || null,
      ]),
    )
    return {
      researchAt: product.createdAt,
      surveyCount: surveys.length,
      surveyLast: dates[dates.length - 1] || null,
      pricedAt:
        PLATFORMS.map((p) => pricing.pricings[p.key]?.updatedAt)
          .filter(Boolean)
          .sort()[0] || null,
      designStart: page?.createdAt || null,
      firstApprove: approvals.length ? approvals[approvals.length - 1].createdAt : null,
      approvedAt: page?.status === 'approved' ? page.reviewedAt : null,
      uploads,
      firstUpload: Object.values(uploads).filter(Boolean).sort()[0] || null,
    }
  }, [data, listings])

  const syncCoupang = async () => {
    setBusy('sync')
    setNotice('')
    try {
      const r = await syncCoupangListings()
      await loadListings()
      setNotice(
        `쿠팡 ${r.total}개 확인 · 새로 ${r.created} · 갱신 ${r.updated}` +
          (r.unmatched.length ? ` · 제품 못 찾음 ${r.unmatched.length}` : ''),
      )
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusy('')
    }
  }

  const saveForm = async () => {
    setBusy('save')
    setNotice('')
    try {
      await createListing({ ...form, productId: Number(productId) })
      setForm(null)
      await loadListings()
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusy('')
    }
  }

  const remove = async (l) => {
    if (
      !window.confirm(
        `${PLATFORM_LABEL[l.platform]} ${l.marketProductId} 기록을 지울까요? (마켓 상품은 그대로예요)`,
      )
    )
      return
    setBusy(`del-${l.id}`)
    try {
      await deleteListing(l.id)
      await loadListings()
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusy('')
    }
  }

  if (error || !data) {
    return (
      <main className="page-flat">
        <PageHeader back title="상품 상세" sub={error ? '' : '불러오는 중…'} />
        {error && <p className="form-error">{error}</p>}
      </main>
    )
  }

  const { product, surveys, pricing, design } = data
  const survey = surveys[0] || null
  const page = design.page
  const exp = page?.exports?.[imgTab] || null
  const t = timeline
  // 요약 숫자는 마켓에 올린 판매처 기준 (없으면 판매가를 저장한 첫 판매처)
  const mainKey =
    PLATFORMS.find((p) => listings.some((l) => l.platform === p.key))?.key ||
    PLATFORMS.find((p) => pricing.pricings[p.key]?.saved)?.key ||
    PLATFORMS[0].key
  const mainResults = rows.map((x) => x.markets[mainKey]?.r).filter(Boolean)
  const linksOf = (optionId) =>
    listings.filter((l) => l.url && l.items.some((i) => i.optionId === optionId))

  // 책정 기준 환율 vs 현재 환율 — 한 줄 (예: 261020 기준 200원 → 현재 198.83원 (−1.17))
  const fxLine = (m) => {
    const now = Number(pricing.fx.cnyKrw)
    const diff = now - Number(m.fxRate)
    const d =
      Math.abs(diff) < 0.005
        ? '변동 없음'
        : `${diff > 0 ? '+' : '−'}${formatFx(Math.abs(diff).toFixed(2))}`
    return `${YMD(m.pricedAt)} 기준 ${formatFx(m.fxRate)}원 → 현재 ${formatFx(pricing.fx.cnyKrw)}원 (${d})`
  }
  const costOf = (x) => x.markets[mainKey] || Object.values(x.markets)[0] || null
  const costInfo = (x) => {
    const m = costOf(x)
    if (m?.cost == null) return null
    return (
      <>
        <div className={styles.tipTitle}>원가 {formatWon(m.cost)} 구성</div>
        <Breakdown
          total={m.cost}
          parts={[
            { label: `상품 ${formatCny(x.o.priceCny)}`, value: m.goods, color: MIX.goods },
            { label: `배송 ${formatCny(x.o.shippingCny)}`, value: m.ship, color: MIX.ship },
          ]}
        />
        <div className={styles.tipNote}>{fxLine(m)}</div>
      </>
    )
  }
  const saleInfo = (x, key) => {
    const m = x.markets[key]
    if (!m?.r) return null
    return (
      <>
        <div className={styles.tipTitle}>
          {PLATFORM_LABEL[key]} {formatWon(m.sale)} 구성
        </div>
        <Breakdown
          total={m.sale}
          parts={[
            { label: '상품', value: m.goods, color: MIX.goods },
            { label: '배송', value: m.ship, color: MIX.ship },
            { label: '수수료', value: m.r.fee, color: MIX.fee },
            { label: '차익', value: m.r.profit, color: MIX.profit },
          ]}
        />
        <div className={styles.tipNote}>{fxLine(m)}</div>
      </>
    )
  }
  // 진행 — 4단계 + 사이 걸린 시간
  const steps = [
    { label: '리서치', at: t.researchAt },
    { label: '가격 책정', at: t.pricedAt },
    { label: '디자인 승인', at: t.approvedAt },
    { label: '첫 업로드', at: t.firstUpload },
  ]
  const gaps = [
    fmtDur(t.researchAt, t.pricedAt),
    [
      fmtDur(t.pricedAt, t.approvedAt),
      t.designStart && t.firstApprove && `디자인 ${fmtDur(t.designStart, t.firstApprove)}`,
    ]
      .filter(Boolean)
      .join(' · '),
    fmtDur(t.approvedAt, t.firstUpload),
  ]

  return (
    <main className="page-flat">
      <PageHeader
        back
        title={product.titleKo || product.titleCn}
        sub={
          <>
            {product.code} · {product.titleCn}
          </>
        }
        action={
          <div className={styles.headChips}>
            {page?.status === 'approved' ? (
              <Badge tone="success">디자인 승인</Badge>
            ) : (
              <Badge tone="warning">디자인 승인 전</Badge>
            )}
            {survey?.taobaoUrl && (
              <a
                className={styles.linkChip}
                href={survey.taobaoUrl}
                target="_blank"
                rel="noreferrer"
              >
                타오바오 ↗
              </a>
            )}
          </div>
        }
      />
      <SectionTabs {...tabs} />

      <div className={`fit-row ${styles.layout}`}>
        <div className="fit-col">
          <Section name="요약" id="summary" title={false} plain className={tabs.hide('summary')}>
            <div className={styles.kpis}>
              <div className={styles.kpi}>
                <div>
                  <small>{PLATFORM_LABEL[mainKey]} 판매가</small>
                  <b>
                    {range(
                      rows.map((x) => x.markets[mainKey]?.sale),
                      wonNum,
                    )}
                    원
                  </b>
                </div>
              </div>
              <div className={styles.kpi}>
                <div>
                  <small>차익 ({YMD(pricing.pricings[mainKey]?.updatedAt) || '-'} 기준)</small>
                  <b>
                    {range(
                      mainResults.map((r) => r.profit),
                      wonNum,
                    )}
                    원
                  </b>
                </div>
              </div>
              <div className={styles.kpi}>
                <div>
                  <small>마진</small>
                  <b>
                    {range(
                      mainResults.map((r) => r.marginPct),
                      pct,
                    )}
                  </b>
                </div>
              </div>
              <div className={styles.kpi}>
                <div>
                  <small>제품 추가 → 업로드</small>
                  <b>{t.firstUpload ? fmtDur(t.researchAt, t.firstUpload) : '아직 안 올림'}</b>
                </div>
              </div>
            </div>
          </Section>

          <Section name="정보" id="info" title={false} flush fill className={tabs.hide('info')}>
            <div className={styles.infoTabs} role="tablist">
              {[
                ['price', '가격'],
                ['flow', '진행'],
                ['market', `마켓 ${listings.length}`],
              ].map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  className={infoTab === k ? styles.infoTabOn : ''}
                  onClick={() => setInfoTab(k)}
                >
                  {label}
                </button>
              ))}
              <span className={styles.spacer} />
              {infoTab === 'price' && (
                <Link className={styles.textLink} to={`/pricing/${product.id}`}>
                  가격 책정 열기
                </Link>
              )}
              {infoTab === 'market' && canEdit && (
                <>
                  <button
                    type="button"
                    className={styles.textBtn}
                    onClick={syncCoupang}
                    disabled={!!busy}
                  >
                    {busy === 'sync' ? '불러오는 중…' : '쿠팡에서 불러오기'}
                  </button>
                  <button
                    type="button"
                    className={styles.textBtn}
                    onClick={() => setForm(form ? null : { ...EMPTY_FORM })}
                  >
                    {form ? '닫기' : '직접 추가'}
                  </button>
                </>
              )}
            </div>

            {infoTab === 'price' && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>옵션</th>
                    <th className={styles.num}>원가</th>
                    {PLATFORMS.map((p) => (
                      <th key={p.key} className={styles.num}>
                        {p.label}
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((x) => (
                    <tr key={x.o.id}>
                      <td>
                        <b>{x.o.option1}</b> <span className={styles.muted}>{x.o.option2}</span>
                      </td>
                      <td className={styles.num}>
                        <HoverInfo content={costInfo(x)}>{formatWon(costOf(x)?.cost)}</HoverInfo>
                      </td>
                      {PLATFORMS.map((p) => {
                        const m = x.markets[p.key]
                        return (
                          <td key={p.key} className={styles.num}>
                            {m?.sale ? (
                              <HoverInfo content={saleInfo(x, p.key)}>
                                <b className={styles.price}>{formatWon(m.sale)}</b>
                              </HoverInfo>
                            ) : (
                              '-'
                            )}
                            {m?.r && (
                              <span
                                className={
                                  m.r.profit < 0
                                    ? styles.mgLoss
                                    : m.r.marginPct >= GOOD_MARGIN_PCT
                                      ? styles.mgGood
                                      : styles.mg
                                }
                              >
                                {pct(m.r.marginPct)}
                              </span>
                            )}
                          </td>
                        )
                      })}
                      <td className={styles.num}>
                        {linksOf(x.o.id).map((l) => (
                          <a
                            key={l.id}
                            className={styles.linkChip}
                            href={l.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {PLATFORM_LABEL[l.platform]} ↗
                          </a>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {infoTab === 'flow' && (
              <div className={styles.flow}>
                <ol className={styles.steps}>
                  {steps.map((s) => (
                    <li key={s.label} className={s.at ? '' : styles.stepOff}>
                      <i />
                      <b>{s.label}</b>
                      <span>{s.at ? SHORT(s.at) : '-'}</span>
                    </li>
                  ))}
                </ol>
                <div className={styles.gaps}>
                  {gaps.map((g, i) => (
                    <span key={i}>{g}</span>
                  ))}
                </div>
                <p className={styles.flowNote}>
                  조사 {t.surveyCount}회{t.surveyLast && ` · 마지막 조사 ${daysAgo(t.surveyLast)}`}
                  {PLATFORMS.map(
                    (p) =>
                      ` · ${p.label} ${t.uploads[p.key] ? `${SHORT(t.uploads[p.key])} 업로드` : '안 올림'}`,
                  ).join('')}
                </p>
              </div>
            )}

            {infoTab === 'market' && (
              <div>
                {notice && <p className={styles.notice}>{notice}</p>}
                {form && (
                  <div className={styles.form}>
                    <select
                      value={form.platform}
                      onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="마켓 상품번호 *"
                      value={form.marketProductId}
                      onChange={(e) => setForm({ ...form, marketProductId: e.target.value })}
                    />
                    <input
                      placeholder="상품명"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                    <input
                      placeholder="상품 링크"
                      value={form.url}
                      onChange={(e) => setForm({ ...form, url: e.target.value })}
                    />
                    <input
                      type="datetime-local"
                      title="업로드 일시"
                      value={form.listedAt}
                      onChange={(e) => setForm({ ...form, listedAt: e.target.value })}
                    />
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      onClick={saveForm}
                      disabled={!form.marketProductId.trim() || busy === 'save'}
                    >
                      저장
                    </button>
                  </div>
                )}
                {listings.map((l) => (
                  <div key={l.id} className={styles.mrow}>
                    <span className={styles.chip}>{PLATFORM_LABEL[l.platform]}</span>
                    <HoverInfo
                      content={
                        <>
                          <div className={styles.tipTitle}>{l.title || '(상품명 없음)'}</div>
                          <div>상품번호 {l.marketProductId}</div>
                          {l.status && <div>상태 {l.status}</div>}
                          <div>{l.source === 'api' ? '마켓에서 불러옴' : '직접 입력'}</div>
                        </>
                      }
                    >
                      {l.url ? (
                        <a className={styles.mtitle} href={l.url} target="_blank" rel="noreferrer">
                          {l.title || l.items.map((i) => i.name).join(' / ') || l.marketProductId} ↗
                        </a>
                      ) : (
                        <span className={styles.mtitle}>{l.title || l.marketProductId}</span>
                      )}
                    </HoverInfo>
                    <span className={styles.spacer} />
                    <span className={styles.muted}>
                      {l.items.map((i) => wonNum(i.salePrice)).join(' / ')}
                      {l.items.length > 0 && '원'}
                    </span>
                    <span className={styles.muted}>{l.listedAt ? SHORT(l.listedAt) : '-'}</span>
                    {canEdit && (
                      <button
                        type="button"
                        className={styles.del}
                        onClick={() => remove(l)}
                        disabled={!!busy}
                        aria-label="기록 지우기"
                        title="기록 지우기 (마켓 상품은 그대로)"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {PLATFORMS.filter((p) => !listings.some((l) => l.platform === p.key)).map((p) => (
                  <div key={p.key} className={styles.mrow}>
                    <span className={`${styles.chip} ${styles.chipOff}`}>{p.label}</span>
                    <span className={styles.muted}>아직 안 올림</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <Section
          name="상세설명"
          id="detail"
          sub={
            exp ? `v${exp.version} · ${exp.files.length}장${exp.current ? '' : ' (예전 내용)'}` : ''
          }
          flush
          fill="stretch"
          className={tabs.hide('detail')}
          action={
            <>
              <span className={styles.seg}>
                {PLATFORMS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={imgTab === p.key ? styles.segOn : ''}
                    onClick={() => setImgTab(p.key)}
                  >
                    {p.label}
                  </button>
                ))}
              </span>
              <Link className={styles.textLink} to={`/design/${product.id}`}>
                디자인 열기
              </Link>
            </>
          }
        >
          {exp ? (
            <div className={styles.images}>
              {exp.files.map((f) => (
                <img
                  key={f.url}
                  src={f.url}
                  alt=""
                  width={f.width}
                  height={f.height}
                  loading="lazy"
                />
              ))}
            </div>
          ) : (
            <p className={styles.empty}>디자인에서 확인(승인)하면 상세 이미지가 여기 보여요</p>
          )}
        </Section>
      </div>
    </main>
  )
}
