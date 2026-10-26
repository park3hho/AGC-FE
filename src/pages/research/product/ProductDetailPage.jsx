import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { getPricing } from '@/api/pricing'
import { getProduct, getProductPhotos } from '@/api/product'
import Badge from '@/components/Badge'
import Thumb from '@/components/Thumb'
import ListItem from '@/components/common/ListItem'
import PageHeader from '@/components/common/PageHeader'
import Pager from '@/components/common/Pager'
import Section from '@/components/common/Section'
import SectionTabs, { useSectionTabs } from '@/components/common/SectionTabs'
import { PLATFORMS, PRICING_STATUS } from '@/constants/pricingConst'
import { useFitRows } from '@/hooks/useFitRows'
import {
  calcOption,
  formatCny,
  formatPct,
  formatWon,
  pricingStatusOf,
  summarize,
} from '@/utils/pricing'
import research from '../Research.module.css'
import styles from './ProductDetail.module.css'
import ProductInfoSection from './ProductInfoSection'

// 데스크탑에서 가격조사 섹션 한 페이지 건수 (섹션이 남은 높이를 채우지 않아 고정)
const SURVEY_PAGE = 2

// 판매처 1곳 — 옵션별 판매가 · 계산 결과 · 요약
const platformView = (platform, pricing, options, fx) => {
  if (!pricing) return null
  const settings = {
    platformFeeRate: pricing.platformFeeRate,
    paymentFeeRate: pricing.paymentFeeRate,
    fxRate: fx.cnyKrw,
    fxMarkupPct: pricing.fxMarkupPct,
  }
  const saleById = Object.fromEntries(pricing.optionPrices.map((o) => [o.optionId, o.salePrice]))
  const results = Object.fromEntries(
    options.map((o) => [o.id, calcOption(o, saleById[o.id], settings)]),
  )
  const sales = Object.values(saleById).filter((v) => v != null)
  return {
    platform,
    saved: pricing.saved,
    saleById,
    results,
    summary: summarize(Object.values(results)),
    minSale: sales.length ? Math.min(...sales) : null,
    maxSale: sales.length ? Math.max(...sales) : null,
  }
}

const range = (min, max) =>
  min == null ? '-' : min === max ? formatWon(min) : `${formatWon(min)} ~ ${formatWon(max)}`

const page = (list, n, size) => {
  const count = Math.max(1, Math.ceil(list.length / size))
  const current = Math.min(n, count)
  return { count, current, rows: list.slice((current - 1) * size, current * size) }
}

// 제품 상세 — 섹션: 사진 · 기본 정보 · 판매가 요약 · 옵션 · 가격조사 (DESIGN.md §4.6)
// 화면 맞춤 (§4.4): 데스크탑 2단 — 왼쪽 사진(남은 높이에 맞춰 줄어듦) · 기본 정보 · 가격조사(페이지 넘김)
//                  오른쪽 판매가 요약 · 옵션(남은 높이 + 페이지 넘김). 모바일은 섹션 탭으로 한 번에 하나.
export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null) // { product, surveys }
  const [pricing, setPricing] = useState(undefined) // getPricing 결과 · 못 불러오면 null
  const [photos, setPhotos] = useState(null) // [{ url, label }] — 대표 + 옵션별 사진
  const [selected, setSelected] = useState(0)
  const [opened, setOpened] = useState(null) // 크게 보는 사진
  const [error, setError] = useState('')
  const [optionPage, setOptionPage] = useState(1)
  const [surveyPage, setSurveyPage] = useState(1)
  const optionRef = useRef(null)
  const surveyRef = useRef(null)
  const optionSize = useFitRows(optionRef, { fallback: 57 })
  const surveyFit = useFitRows(surveyRef, { fallback: 65 })

  const options = pricing?.options || []
  // 모바일 탭 글자는 짧게 (한 줄에 들어가게) — 섹션 이름(부르는 법)은 Section name 그대로
  const tabs = useSectionTabs(
    [
      { id: 'photos', name: '사진' },
      { id: 'info', name: '정보' },
      { id: 'product-info', name: '제품정보' },
      { id: 'price-summary', name: '판매가' },
      options.length > 0 && { id: 'options', name: '옵션' },
      { id: 'surveys', name: '조사' },
    ].filter(Boolean),
  )
  // 데스크탑에서 남은 높이를 채우는 섹션 — 모바일은 지금 탭 하나만 채운다
  const fillOf = (sectionId, desktop) => (tabs.mobile ? tabs.active(sectionId) : desktop)

  useEffect(() => {
    setData(null)
    setPricing(undefined)
    setPhotos(null)
    setSelected(0)
    setOptionPage(1)
    setSurveyPage(1)
    getProduct(id)
      .then((d) => {
        setData(d)
        getProductPhotos(d.product, d.surveys).then(setPhotos)
      })
      .catch((err) => setError(err.message))
    getPricing(id)
      .then(setPricing)
      .catch(() => setPricing(null))
  }, [id])

  if (error) {
    return (
      <main className="page-flat">
        <PageHeader title="제품 상세" back />
        <p className="form-error">{error}</p>
      </main>
    )
  }
  if (!data) return null

  const { product, surveys } = data
  const views = pricing
    ? PLATFORMS.map((p) => platformView(p, pricing.pricings[p.key], options, pricing.fx)).filter(
        Boolean,
      )
    : []
  const savedKeys = views.filter((v) => v.saved).map((v) => v.platform.key)
  const status = pricingStatusOf(savedKeys, surveys.length > 0)

  // 사진 — 모은 사진 + 사진이 없는 맛은 빈 칸 (빠진 걸 바로 보이게)
  const gallery = photos || (product.photoUrl ? [{ url: product.photoUrl, label: '대표' }] : [])
  const missing = options.filter((o) => !o.photoUrl).map((o) => o.option1)
  const heroIndex = Math.max(0, Math.min(selected, gallery.length - 1))
  const hero = gallery[heroIndex]
  const taobaoUrl = surveys[0]?.taobaoUrl

  const optionPaged = page(options, optionPage, optionSize)
  const surveyPaged = page(surveys, surveyPage, tabs.mobile ? surveyFit : SURVEY_PAGE)

  const saleCell = (v, o) => {
    const r = v.results[o.id]
    const sale = v.saleById[o.id]
    if (sale == null) return '-'
    return (
      <>
        {formatWon(sale)}
        {r && <span className={styles.margin}> · {formatPct(r.marginPct)}</span>}
      </>
    )
  }

  return (
    <main className="page-flat">
      <PageHeader
        title={product.titleKo || product.titleCn}
        sub={product.titleKo ? product.titleCn : null}
        back
        action={
          <>
            <button
              className="btn-secondary btn-md"
              onClick={() =>
                navigate(`/research/prices/new?product=${encodeURIComponent(product.code)}`)
              }
            >
              가격조사 추가
            </button>
            <button
              className="btn-primary btn-md"
              onClick={() => navigate(`/pricing/${product.id}`)}
            >
              가격 책정
            </button>
          </>
        }
      />

      <SectionTabs {...tabs} />

      <div className={`fit-row ${styles.layout}`}>
        {/* 왼쪽 — 사진 · 기본 정보 · 가격조사 */}
        <div className={`fit-col ${styles.col}`}>
          <Section
            name="사진"
            id="photos"
            title={false}
            fill={fillOf('photos', true) && 'stretch'}
            className={tabs.hide('photos')}
          >
            {hero ? (
              <button type="button" className={styles.hero} onClick={() => setOpened(hero)}>
                <img src={hero.url} alt={hero.label} />
              </button>
            ) : (
              <div className={styles.hero}>
                <Thumb size={120} />
              </div>
            )}
            {/* 큰 사진 아래 — 이름 · 넘기기 (작은 사진 줄은 한 줄만 보이므로 나머지는 여기로 넘긴다) */}
            {hero && (
              <div className={styles.caption}>
                {gallery.length > 1 && (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    aria-label="이전 사진"
                    onClick={() => setSelected((heroIndex - 1 + gallery.length) % gallery.length)}
                  >
                    ‹
                  </button>
                )}
                <span>
                  {hero.label}
                  {gallery.length > 1 && ` · ${heroIndex + 1}/${gallery.length}`}
                </span>
                {gallery.length > 1 && (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    aria-label="다음 사진"
                    onClick={() => setSelected((heroIndex + 1) % gallery.length)}
                  >
                    ›
                  </button>
                )}
              </div>
            )}
            {gallery.length > 1 && (
              <div className={styles.thumbs}>
                {gallery.map((p, i) => (
                  <button
                    key={p.url}
                    type="button"
                    className={`${styles.thumb} ${p === hero ? styles.thumbOn : ''}`}
                    onClick={() => setSelected(i)}
                    title={p.label}
                    aria-label={`${p.label} 사진 보기`}
                  >
                    <img src={p.url} alt={p.label} loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            {/* 사진이 없는 맛 — 빠진 걸 바로 보이게 (칸 대신 한 줄) */}
            {missing.length > 0 && (
              <p className={styles.missing} title={missing.join(', ')}>
                사진 없음: {missing.join(', ')}
              </p>
            )}
          </Section>

          <Section
            name="기본 정보"
            id="info"
            fill={fillOf('info', false)}
            className={tabs.hide('info')}
          >
            <dl className={styles.rows}>
              <dt>제품 코드</dt>
              <dd>
                <span className={research.code}>{product.code}</span>
              </dd>
              <dt>가격 책정</dt>
              <dd>
                <Badge tone={PRICING_STATUS[status].tone}>{PRICING_STATUS[status].label}</Badge>
              </dd>
              <dt>타오바오</dt>
              <dd>
                {taobaoUrl ? (
                  <a href={taobaoUrl} target="_blank" rel="noreferrer">
                    상품 페이지 열기 ↗
                  </a>
                ) : (
                  '-'
                )}
              </dd>
              <dt>추가일</dt>
              <dd>{product.addedAt}</dd>
            </dl>
          </Section>
          <ProductInfoSection
            product={product}
            onSaved={(p) => setData({ ...data, product: p })}
            fill={fillOf('product-info', false)}
            className={tabs.hide('product-info')}
          />
          <Section
            name="가격조사"
            id="surveys"
            sub={`${surveys.length}건`}
            flush
            fill={fillOf('surveys', false)}
            className={tabs.hide('surveys')}
            bodyRef={surveyRef}
            action={
              <button
                className="btn-secondary btn-sm"
                onClick={() =>
                  navigate(`/research/prices/new?product=${encodeURIComponent(product.code)}`)
                }
              >
                조사 추가
              </button>
            }
            footer={
              surveyPaged.count > 1 && (
                <Pager
                  page={surveyPaged.current}
                  pageCount={surveyPaged.count}
                  onChange={setSurveyPage}
                />
              )
            }
          >
            {surveys.length === 0 && (
              <p className={research.empty}>아직 이 제품의 가격조사가 없어요</p>
            )}
            <div className={styles.surveys} data-fit-list>
              {surveyPaged.rows.map((s) => (
                <ListItem
                  key={s.id}
                  title={s.code}
                  sub={`옵션 ${s.optionCount}종류 · ${formatCny(s.minPriceCny)}~`}
                  right={<div className={research.date}>{s.researchedAt}</div>}
                  onClick={() => navigate(`/research/prices/${s.id}`)}
                />
              ))}
            </div>
          </Section>
        </div>

        {/* 오른쪽 — 판매가 요약 · 옵션 */}
        <div className={`fit-col ${styles.col}`}>
          <Section
            name="판매가 요약"
            id="price-summary"
            fill={fillOf('price-summary', false)}
            className={tabs.hide('price-summary')}
          >
            {pricing === undefined && <p className={styles.hint}>불러오는 중…</p>}
            {pricing === null && <p className={styles.hint}>판매가를 불러오지 못했어요</p>}
            {pricing && !pricing.survey && (
              <p className={styles.hint}>가격조사가 있어야 판매가를 정할 수 있어요</p>
            )}
            {pricing?.survey && (
              <div className={styles.platforms}>
                {views.map((v) => (
                  <div key={v.platform.key} className={styles.platform}>
                    <div className={styles.platformHead}>
                      <b>{v.platform.label}</b>
                      <Badge tone={v.saved ? 'success' : 'neutral'}>
                        {v.saved ? '저장됨' : '안 정함'}
                      </Badge>
                    </div>
                    <div className={styles.sale}>{v.saved ? range(v.minSale, v.maxSale) : '-'}</div>
                    {v.saved && (
                      <div className={styles.hint}>
                        평균 {formatPct(v.summary.avgMarginPct)} · 최저{' '}
                        <b className={v.summary.minProfit < 0 ? styles.neg : styles.pos}>
                          {formatWon(v.summary.minProfit)}
                        </b>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
          {options.length > 0 && (
            <Section
              name="옵션"
              id="options"
              sub={`${options.length}종류 · 기준 조사 ${pricing.survey.code}`}
              flush
              fill={fillOf('options', true)}
              className={tabs.hide('options')}
              bodyRef={optionRef}
              footer={
                <Pager
                  page={optionPaged.current}
                  pageCount={optionPaged.count}
                  onChange={setOptionPage}
                />
              }
            >
              {/* 넓은 화면 — 표 */}
              <table className={styles.table}>
                <thead data-fit-head>
                  <tr>
                    <th>옵션</th>
                    <th>용량·입수</th>
                    <th className={styles.r}>타오바오</th>
                    {views.map((v) => (
                      <th key={v.platform.key} className={styles.r}>
                        {v.platform.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {optionPaged.rows.map((o) => (
                    <tr key={o.id} data-fit-row>
                      <td>
                        <span className={styles.optionCell}>
                          <Thumb src={o.photoUrl} size={36} />
                          <b>{o.option1}</b>
                        </span>
                      </td>
                      <td>{o.option2 || '-'}</td>
                      <td className={styles.r}>{formatCny(o.priceCny)}</td>
                      {views.map((v) => (
                        <td key={v.platform.key} className={styles.r}>
                          {saleCell(v, o)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 좁은 화면 — 행 목록 (가로 스크롤 없이) */}
              <div className={styles.optionList} data-fit-list>
                {optionPaged.rows.map((o) => (
                  <div key={o.id} className={styles.optionItem}>
                    <Thumb src={o.photoUrl} size={36} />
                    <div className={styles.optionText}>
                      <b>
                        {o.option1}
                        {o.option2 && ` / ${o.option2}`}
                      </b>
                      <span>
                        {formatCny(o.priceCny)}
                        {views.map((v) => (
                          <span key={v.platform.key}>
                            {' · '}
                            {v.platform.label} {saleCell(v, o)}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>

      {opened && (
        <div className="overlay" onClick={() => setOpened(null)}>
          <figure className={styles.viewer}>
            <img src={opened.url} alt={opened.label} />
            <figcaption>{opened.label}</figcaption>
          </figure>
        </div>
      )}
    </main>
  )
}

function minOf(options) {
  return String(Math.min(...options.map((o) => Number(o.priceCny))))
}
