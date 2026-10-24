import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getDetailPage } from '@/api/detailPage'
import { createListing, deleteListing, getListings, syncCoupangListings } from '@/api/listing'
import { getPricing } from '@/api/pricing'
import { getProduct } from '@/api/product'
import Badge from '@/components/Badge'
import Thumb from '@/components/Thumb'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import SectionTabs, { useSectionTabs } from '@/components/common/SectionTabs'
import { FEATURE, hasFeature } from '@/constants/permissions'
import { PLATFORMS } from '@/constants/pricingConst'
import { useAuth } from '@/hooks/useAuth'
import { toKstDateTime } from '@/utils/date'
import { calcOption, costWithShipping, formatCny, formatPct, formatWon } from '@/utils/pricing'
import styles from './ProductOverview.module.css'

// 상품 상세 — 디자인 승인된 제품 하나의 전체 정보 (FE DESIGN.md §4.7)
//   섹션: 기본 정보 · 진행 기록(리서치 → 가격 책정 → 디자인 → 업로드, 걸린 시간) · 가격(옵션 × 판매처, 지금 환율로 차익)
//         · 마켓 등록(업로드 일시 · 링크, 쿠팡에서 불러오기 · 직접 추가) · 상세설명(승인된 상세 이미지)
const TABS = [
  { id: 'info', name: '기본 정보' },
  { id: 'timeline', name: '진행 기록' },
  { id: 'prices', name: '가격' },
  { id: 'listings', name: '마켓 등록' },
  { id: 'detail', name: '상세설명' },
]
const PLATFORM_LABEL = Object.fromEntries(PLATFORMS.map((p) => [p.key, p.label]))
const EMPTY_FORM = { platform: 'naver', marketProductId: '', title: '', url: '', listedAt: '' }

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
const optionName = (o) => [o.option1, o.option2].filter(Boolean).join(' · ')

export default function ProductOverviewPage() {
  const { productId } = useParams()
  const { user } = useAuth()
  const canEdit = hasFeature(user, FEATURE.LISTING)
  const tabs = useSectionTabs(TABS)

  const [data, setData] = useState(null) // { product, surveys, pricing, design }
  const [listings, setListings] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState(null) // 직접 추가 입력 (null = 닫힘)
  const [imgTab, setImgTab] = useState('coupang')

  const loadListings = useCallback(
    () => getListings(productId).then(setListings),
    [productId],
  )

  useEffect(() => {
    Promise.all([getProduct(productId), getPricing(productId), getDetailPage(productId)])
      .then(([p, pricing, design]) =>
        setData({ product: p.product, surveys: p.surveys, pricing, design }),
      )
      .catch((err) => setError(err.message))
    loadListings().catch((err) => setError(err.message))
  }, [productId, loadListings])

  const timeline = useMemo(() => {
    if (!data) return null
    const { product, surveys, pricing, design } = data
    const page = design.page
    const dates = surveys.map((s) => s.researchedAt).filter(Boolean).sort()
    const approvals = (page?.reviews || []).filter((r) => r.action === 'approve')
    const firstApprove = approvals.length ? approvals[approvals.length - 1].createdAt : null
    const approvedAt = page?.status === 'approved' ? page.reviewedAt : null
    const uploads = Object.fromEntries(
      PLATFORMS.map((p) => {
        const ts = listings
          .filter((l) => l.platform === p.key && l.listedAt)
          .map((l) => l.listedAt)
          .sort()
        return [p.key, ts[0] || null]
      }),
    )
    const firstUpload = Object.values(uploads).filter(Boolean).sort()[0] || null
    return {
      researchStart: product.createdAt,
      surveyFirst: dates[0] || null,
      surveyLast: dates[dates.length - 1] || null,
      surveyCount: surveys.length,
      priced: Object.fromEntries(
        PLATFORMS.map((p) => [p.key, pricing.pricings[p.key]?.updatedAt || null]),
      ),
      designStart: page?.createdAt || null,
      firstApprove,
      approvedAt,
      approvedBy: page?.reviewedBy?.name || '',
      uploads,
      firstUpload,
    }
  }, [data, listings])

  const syncCoupang = async () => {
    setBusy('sync')
    setNotice('')
    try {
      const r = await syncCoupangListings()
      await loadListings()
      setNotice(
        `쿠팡 상품 ${r.total}개 확인 · 새로 ${r.created} · 갱신 ${r.updated}` +
          (r.unmatched.length ? ` · 제품을 못 찾음 ${r.unmatched.length}` : ''),
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
    if (!window.confirm(`${PLATFORM_LABEL[l.platform]} ${l.marketProductId} 기록을 지울까요? (마켓 상품은 그대로예요)`))
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

  if (error) {
    return (
      <main className="page-flat">
        <PageHeader back title="상품 상세" />
        <p className="form-error">{error}</p>
      </main>
    )
  }
  if (!data) {
    return (
      <main className="page-flat">
        <PageHeader back title="상품 상세" sub="불러오는 중…" />
      </main>
    )
  }

  const { product, surveys, pricing, design } = data
  const survey = surveys[0] || null // 최근 조사
  const page = design.page
  const exp = page?.exports?.[imgTab] || null
  const optionLinks = (optionId) =>
    listings.filter((l) => l.url && l.items.some((i) => i.optionId === optionId))
  const t = timeline

  const settingsOf = (key) => {
    const pr = pricing.pricings[key]
    if (!pr?.saved) return null
    return {
      fxRate: pricing.fx.cnyKrw,
      fxMarkupPct: pr.fxMarkupPct,
      platformFeeRate: pr.platformFeeRate,
      paymentFeeRate: pr.paymentFeeRate,
    }
  }
  const salePriceOf = (key, optionId) =>
    pricing.pricings[key]?.optionPrices.find((o) => o.optionId === optionId)?.salePrice ?? null
  const costSettings = settingsOf('coupang') || settingsOf('naver')

  return (
    <main className="page-flat">
      <PageHeader
        back
        title={product.titleKo || product.titleCn}
        sub={
          <>
            {product.code} ·{' '}
            {page?.status === 'approved' ? (
              <Badge tone="success">디자인 승인</Badge>
            ) : (
              <Badge tone="warning">디자인 승인 전</Badge>
            )}
            {listings.length > 0 && ` · 마켓 상품 ${listings.length}개`}
          </>
        }
      />
      <SectionTabs {...tabs} />

      <div className={`fit-row ${styles.layout}`}>
        <div className="fit-col">
          <Section name="기본 정보" id="info" className={tabs.hide('info')}>
            <div className={styles.info}>
              <Thumb src={product.photoUrl} size={56} />
              <div className={styles.infoText}>
                <div className={styles.infoTitle}>{product.titleKo || '-'}</div>
                <div className={styles.cn}>{product.titleCn}</div>
                <div className={styles.links}>
                  <span className={styles.code}>{product.code}</span>
                  {survey?.taobaoUrl && (
                    <a href={survey.taobaoUrl} target="_blank" rel="noreferrer">
                      타오바오 원본 ↗
                    </a>
                  )}
                  {listings
                    .filter((l) => l.url)
                    .map((l) => (
                      <a key={l.id} href={l.url} target="_blank" rel="noreferrer" title={l.title}>
                        {PLATFORM_LABEL[l.platform]} {l.items.map((i) => i.name).join('/') || l.marketProductId} ↗
                      </a>
                    ))}
                  {survey?.coupangMinPrice != null && (
                    <span className={styles.muted}>
                      국내 쿠팡 최저 {formatWon(survey.coupangMinPrice)}
                    </span>
                  )}
                  {survey?.naverMinPrice != null && (
                    <span className={styles.muted}>
                      국내 네이버 최저 {formatWon(survey.naverMinPrice)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Section>

          <Section
            name="진행 기록"
            id="timeline"
            sub={
              t.firstUpload
                ? `제품 추가 → 첫 업로드 ${fmtDur(t.researchStart, t.firstUpload)}`
                : '아직 마켓에 올리지 않았어요'
            }
            className={tabs.hide('timeline')}
          >
            <ol className={styles.steps}>
              <li>
                <b>리서치</b>
                <span>제품 추가 {toKstDateTime(t.researchStart)}</span>
                <span>
                  조사 {t.surveyCount}회
                  {t.surveyFirst &&
                    ` · ${t.surveyFirst === t.surveyLast ? t.surveyFirst : `${t.surveyFirst} ~ ${t.surveyLast}`}`}
                </span>
                {t.surveyLast && <em>마지막 조사 {daysAgo(t.surveyLast)}</em>}
              </li>
              <li>
                <b>가격 책정</b>
                {PLATFORMS.map((p) => (
                  <span key={p.key}>
                    {p.label} {t.priced[p.key] ? toKstDateTime(t.priced[p.key]) : '-'}
                  </span>
                ))}
              </li>
              <li>
                <b>디자인</b>
                <span>시작 {t.designStart ? toKstDateTime(t.designStart) : '-'}</span>
                <span>
                  승인 {t.approvedAt ? toKstDateTime(t.approvedAt) : '-'}
                  {t.approvedBy && t.approvedAt && ` · ${t.approvedBy}`}
                </span>
                {t.designStart && t.firstApprove && (
                  <em>디자인 시간 {fmtDur(t.designStart, t.firstApprove)}</em>
                )}
              </li>
              <li>
                <b>업로드</b>
                {PLATFORMS.map((p) => (
                  <span key={p.key}>
                    {p.label} {t.uploads[p.key] ? toKstDateTime(t.uploads[p.key]) : '-'}
                  </span>
                ))}
                {t.approvedAt && t.firstUpload && (
                  <em>승인 → 업로드 {fmtDur(t.approvedAt, t.firstUpload)}</em>
                )}
              </li>
            </ol>
          </Section>

          <Section
            name="가격"
            id="prices"
            sub={`지금 환율 ${pricing.fx.cnyKrw ? Number(pricing.fx.cnyKrw) : '-'}원으로 계산 · 판매가는 저장한 값`}
            flush
            fill
            className={tabs.hide('prices')}
            action={
              <Link className="btn-secondary btn-sm" to={`/pricing/${product.id}`}>
                가격 책정 열기
              </Link>
            }
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>옵션</th>
                  <th className={styles.num}>타오바오 + 배송</th>
                  <th className={styles.num}>원가</th>
                  {PLATFORMS.map((p) => (
                    <th key={p.key} className={styles.num}>
                      {p.label} 판매가 · 차익
                    </th>
                  ))}
                  <th>올린 곳</th>
                </tr>
              </thead>
              <tbody>
                {pricing.options.map((o) => {
                  const cost = costSettings ? costWithShipping(o, costSettings) : null
                  return (
                    <tr key={o.id}>
                      <td className={styles.wrap}>{optionName(o)}</td>
                      <td className={styles.num}>
                        {formatCny(o.priceCny)} + {formatCny(o.shippingCny)}
                      </td>
                      <td className={styles.num}>{formatWon(cost)}</td>
                      {PLATFORMS.map((p) => {
                        const sale = salePriceOf(p.key, o.id)
                        const settings = settingsOf(p.key)
                        const r = settings && sale ? calcOption(o, sale, settings) : null
                        return (
                          <td key={p.key} className={styles.num}>
                            <b>{sale ? formatWon(sale) : '-'}</b>
                            {r && (
                              <span className={r.profit < 0 ? styles.loss : styles.muted}>
                                {' '}
                                {formatWon(r.profit)} ({formatPct(r.marginPct)})
                              </span>
                            )}
                          </td>
                        )
                      })}
                      <td>
                        {optionLinks(o.id).map((l) => (
                          <a
                            key={l.id}
                            className={styles.chip}
                            href={l.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {PLATFORM_LABEL[l.platform]} ↗
                          </a>
                        ))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Section>

          <Section
            name="마켓 등록"
            id="listings"
            sub={notice || `${listings.length}개`}
            flush
            className={tabs.hide('listings')}
            action={
              canEdit && (
                <>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={syncCoupang}
                    disabled={!!busy}
                  >
                    {busy === 'sync' ? '불러오는 중…' : '쿠팡에서 불러오기'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => setForm(form ? null : { ...EMPTY_FORM })}
                    disabled={!!busy && busy !== 'save'}
                  >
                    {form ? '닫기' : '직접 추가'}
                  </button>
                </>
              )
            }
          >
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
            {listings.length === 0 && !form ? (
              <p className={styles.empty}>
                아직 기록이 없어요.{canEdit && ' 쿠팡에 올렸다면 쿠팡에서 불러오기를 눌러 주세요'}
              </p>
            ) : (
              listings.length > 0 && (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>판매처</th>
                      <th>상품명 · 상품번호</th>
                      <th>옵션 · 가격</th>
                      <th>업로드 일시</th>
                      <th>상태</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((l) => (
                      <tr key={l.id}>
                        <td>{PLATFORM_LABEL[l.platform]}</td>
                        <td className={styles.wrap}>
                          {l.url ? (
                            <a href={l.url} target="_blank" rel="noreferrer">
                              {l.title || '(상품명 없음)'} ↗
                            </a>
                          ) : (
                            l.title || '(상품명 없음)'
                          )}
                          <div className={styles.muted}>
                            {l.marketProductId}
                            {l.source === 'api' ? ' · 마켓에서 불러옴' : ' · 직접 입력'}
                          </div>
                        </td>
                        <td className={styles.wrap}>
                          {l.items.map((i) => `${i.name} ${formatWon(i.salePrice)}`).join(' / ') ||
                            '-'}
                        </td>
                        <td className={styles.date}>{toKstDateTime(l.listedAt) || '-'}</td>
                        <td>{l.status ? <Badge tone="success">{l.status}</Badge> : '-'}</td>
                        <td>
                          {canEdit && (
                            <button
                              type="button"
                              className="btn-text btn-sm"
                              onClick={() => remove(l)}
                              disabled={!!busy}
                            >
                              지우기
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </Section>
        </div>

        <Section
          name="상세설명"
          id="detail"
          sub={
            exp
              ? `v${exp.version} · ${exp.files.length}장${exp.current ? '' : ' (예전 내용)'}`
              : '저장된 상세 이미지 없음'
          }
          flush
          fill="stretch"
          className={tabs.hide('detail')}
          action={
            <>
              {PLATFORMS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`${styles.tab} ${imgTab === p.key ? styles.tabOn : ''}`}
                  onClick={() => setImgTab(p.key)}
                >
                  {p.label}
                </button>
              ))}
              <Link className="btn-secondary btn-sm" to={`/design/${product.id}`}>
                디자인 열기
              </Link>
            </>
          }
        >
          {exp ? (
            <div className={styles.images}>
              {exp.files.map((f) => (
                <img key={f.url} src={f.url} alt="" width={f.width} height={f.height} loading="lazy" />
              ))}
            </div>
          ) : (
            <p className={styles.empty}>
              디자인에서 확인(승인)하면 상세 이미지가 저장돼 여기 보여요
            </p>
          )}
        </Section>
      </div>
    </main>
  )
}
