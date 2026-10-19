import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { getPricing } from '@/api/pricing'
import { getProduct, getProductPhotos } from '@/api/product'
import Badge from '@/components/Badge'
import Thumb from '@/components/Thumb'
import ListItem from '@/components/common/ListItem'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { PLATFORMS, PRICING_STATUS } from '@/constants/pricingConst'
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

// 제품 상세 — 섹션: 사진 · 기본 정보 · 판매가 요약 · 옵션 · 가격조사 (DESIGN.md §4.6)
export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null) // { product, surveys }
  const [pricing, setPricing] = useState(undefined) // getPricing 결과 · 못 불러오면 null
  const [photos, setPhotos] = useState(null) // [{ url, label }] — 대표 + 옵션별 사진
  const [selected, setSelected] = useState(0)
  const [opened, setOpened] = useState(null) // 크게 보는 사진
  const [error, setError] = useState('')

  useEffect(() => {
    setData(null)
    setPricing(undefined)
    setPhotos(null)
    setSelected(0)
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
  const options = pricing?.options || []
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
  const hero = gallery[Math.min(selected, gallery.length - 1)]
  const taobaoUrl = surveys[0]?.taobaoUrl

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

      <div className={styles.top}>
        <Section name="사진" id="photos" sub={`${gallery.length}장`}>
          {hero ? (
            <button type="button" className={styles.hero} onClick={() => setOpened(hero)}>
              <img src={hero.url} alt={hero.label} />
            </button>
          ) : (
            <Thumb size={160} />
          )}
          {(gallery.length > 1 || missing.length > 0) && (
            <div className={styles.thumbs}>
              {gallery.map((p, i) => (
                <button
                  key={p.url}
                  type="button"
                  className={`${styles.thumb} ${p === hero ? styles.thumbOn : ''}`}
                  onClick={() => setSelected(i)}
                >
                  <img src={p.url} alt={p.label} loading="lazy" />
                  <span>{p.label}</span>
                </button>
              ))}
              {missing.map((name) => (
                <div key={name} className={styles.thumb}>
                  <span className={styles.noPhoto}>사진 없음</span>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <div className={styles.side}>
          <Section name="기본 정보" id="info">
            <dl className={styles.rows}>
              <dt>제품 코드</dt>
              <dd>
                <span className={research.code}>{product.code}</span>{' '}
                <Badge tone={PRICING_STATUS[status].tone}>
                  가격 책정 {PRICING_STATUS[status].label}
                </Badge>
              </dd>
              <dt>한국어 제목</dt>
              <dd>{product.titleKo || '-'}</dd>
              <dt>중국어 제목</dt>
              <dd>{product.titleCn || '-'}</dd>
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
              <dt>옵션</dt>
              <dd>
                {options.length ? `${options.length}종류` : '-'}
                {options.length > 0 && ` · ${formatCny(minOf(options))}~`}
              </dd>
              <dt>추가일</dt>
              <dd>{product.addedAt}</dd>
            </dl>
          </Section>

          <Section name="판매가 요약" id="price-summary">
            {pricing === undefined && <p className={styles.hint}>불러오는 중…</p>}
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
                        평균 마진 {formatPct(v.summary.avgMarginPct)} · 최저 차익{' '}
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
        </div>
      </div>

      {options.length > 0 && (
        <Section
          name="옵션"
          id="options"
          sub={`${options.length}종류 · 기준 조사 ${pricing.survey.code}`}
          flush
        >
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
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
                {options.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <span className={styles.optionCell}>
                        <Thumb src={o.photoUrl} size={36} />
                        <b>{o.option1}</b>
                      </span>
                    </td>
                    <td>{o.option2 || '-'}</td>
                    <td className={styles.r}>{formatCny(o.priceCny)}</td>
                    {views.map((v) => {
                      const r = v.results[o.id]
                      const sale = v.saleById[o.id]
                      return (
                        <td key={v.platform.key} className={styles.r}>
                          {sale == null ? '-' : formatWon(sale)}
                          {r && <span className={styles.margin}> · {formatPct(r.marginPct)}</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section
        name="가격조사"
        id="surveys"
        sub={`${surveys.length}건`}
        flush
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
      >
        {surveys.length === 0 && <p className={research.empty}>아직 이 제품의 가격조사가 없어요</p>}
        <div className={styles.surveys}>
          {surveys.map((s) => (
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
