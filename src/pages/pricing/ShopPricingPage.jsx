import { useMemo, useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

import { getShopPricing } from '@/api/shopPricing'
import Thumb from '@/components/Thumb'
import PageHeader from '@/components/common/PageHeader'
import Pager from '@/components/common/Pager'
import Section from '@/components/common/Section'
import { useFitRows } from '@/hooks/useFitRows'
import PricingTabs from './PricingTabs'
import styles from './ShopPricing.module.css'

const won = (n) => (n == null ? '-' : `${Number(n).toLocaleString('ko-KR')}원`)
const g = (n) => (n == null ? '-' : n >= 1000 ? `${(n / 1000).toFixed(2)}kg` : `${n}g`)

// 가격 책정 › 자사몰 판매 — 자사몰 판매가 계산 (계산 · 표시만, 저장 없음, 2026-11-27)
//   상품가 = 원가(¥ × 환율) × 1.1 ÷ (1 − 3.52%), 100원 올림 · 기본 단위만 · 운임은 주문 확정 때 따로
//   무게 · 크기는 옵션 상자 1개 — 실측 우선, 없으면 예측
export default function ShopPricingPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [onlySale, setOnlySale] = useState(true)
  const [page, setPage] = useState(1)
  const [closed, setClosed] = useState(() => new Set()) // 접은 제품 id
  const bodyRef = useRef(null)
  const size = useFitRows(bodyRef, { fallback: 20, rowSelector: '[data-fit-row]' })

  useEffect(() => {
    getShopPricing()
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])
  useEffect(() => setPage(1), [q, onlySale])

  const rows = useMemo(() => {
    if (!data) return []
    const k = q.trim().toLowerCase()
    return data.items.filter(
      (x) =>
        (!onlySale || x.on_sale) &&
        (!k || `${x.title} ${x.code} ${x.option}`.toLowerCase().includes(k)),
    )
  }, [data, q, onlySale])
  // 제품별 묶음 (2026-11-27) — 제품 줄 아래 옵션 줄. 접기/펼치기(기본 펼침), 페이지는 제품 단위로 끊는다
  const groups = useMemo(() => {
    const m = new Map()
    for (const x of rows) {
      if (!m.has(x.product_id)) m.set(x.product_id, { ...x, options: [] })
      m.get(x.product_id).options.push(x)
    }
    return [...m.values()]
  }, [rows])
  const pages = useMemo(() => {
    const out = [[]]
    let used = 0
    for (const gp of groups) {
      const h = 1 + (closed.has(gp.product_id) ? 0 : gp.options.length)
      if (used > 0 && used + h > size) {
        out.push([])
        used = 0
      }
      out[out.length - 1].push(gp)
      used += h
    }
    return out
  }, [groups, closed, size])
  const pageCount = Math.max(1, pages.length)
  const cur = Math.min(page, pageCount)
  const shown = pages[cur - 1] || []
  const measured = rows.filter((x) => x.size.source === 'measured').length
  const toggle = (id) =>
    setClosed((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <main className="page-flat">
      <PageHeader title="가격 책정" sub={<PricingTabs />} />
      <Section
        name="자사몰 판매가"
        id="shop"
        sub={
          data
            ? `원가 × 1.1 ÷ (1 − 3.52%) · 100원 올림 · 기본 단위 · 환율 ${data.fx}원 · 운임 별도(주문 확정 때) · 저장 없음`
            : ''
        }
        action={
          <div className={styles.tools}>
            <input
              className={`form-input ${styles.search}`}
              placeholder="제품 · 코드 · 옵션 검색"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className={styles.seg} role="group" aria-label="보기">
              {[
                [true, '판매 중'],
                [false, '전체'],
              ].map(([v, label]) => (
                <button
                  key={label}
                  type="button"
                  className={`${styles.segItem} ${onlySale === v ? styles.segOn : ''}`}
                  onClick={() => setOnlySale(v)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        }
        flush
        fill
        bodyRef={bodyRef}
        footer={
          data && (
            <Pager
              page={cur}
              pageCount={pageCount}
              total={groups.length}
              unit={`제품 · 옵션 ${rows.length} · 실측 ${measured}`}
              onChange={setPage}
            />
          )
        }
      >
        {error && <p className="form-error">{error}</p>}
        {!data && !error && <p className={styles.empty}>불러오는 중</p>}
        {data && (
          <div className={styles.table} role="table" aria-label="자사몰 판매가">
            <div className={`${styles.row} ${styles.head}`} role="row">
              <span>제품 · 옵션</span>
              <span className={styles.num}>구매 원가</span>
              <span className={styles.num}>상품가</span>
              <span className={styles.num}>순이익</span>
              <span className={styles.num}>무게</span>
              <span className={styles.num}>크기 · 부피무게</span>
              <span>근거</span>
            </div>
            <div data-fit-list>
              {shown.map((gp) => {
                const open = !closed.has(gp.product_id)
                return (
                  <div key={gp.product_id} className={styles.group}>
                    <div className={`${styles.row} ${styles.prow}`} role="row" data-fit-row>
                      <span className={styles.main}>
                        <button
                          type="button"
                          className={styles.fold}
                          aria-expanded={open}
                          aria-label={open ? '접기' : '펼치기'}
                          onClick={() => toggle(gp.product_id)}
                        >
                          {open ? '▾' : '▸'}
                        </button>
                        <Thumb src={gp.photoUrl} size={36} />
                        <span className={styles.text}>
                          <Link to={`/pricing/${gp.product_id}`} className={styles.title}>
                            {gp.title}
                          </Link>
                          <small>
                            {gp.code} · 옵션 {gp.options.length}
                            {!gp.on_sale && ' · 판매 안 함'}
                          </small>
                        </span>
                      </span>
                    </div>
                    {open &&
                      gp.options.map((x) => (
                        <div
                          key={x.option_id}
                          className={`${styles.row} ${styles.orow}`}
                          role="row"
                        >
                          <span className={styles.opt}>{x.option || '-'}</span>
                          <span className={styles.num}>
                            {won(x.cost_krw)}
                            <small>¥{x.cost_cny}</small>
                          </span>
                          <span className={`${styles.num} ${styles.price}`}>{won(x.price)}</span>
                          <span className={styles.num}>
                            {won(x.profit)}
                            <small>수수료 {won(x.pay_fee)}</small>
                          </span>
                          <span className={styles.num}>{g(x.size.weight_g)}</span>
                          <span className={styles.num}>
                            {x.size.dims_cm
                              ? x.size.dims_cm.map((v) => Math.round(v)).join('×') + 'cm'
                              : '-'}
                            <small>부피 {g(x.size.dim_g)}</small>
                          </span>
                          <span className={styles.src} title={x.size.note || ''}>
                            <i
                              className={
                                x.size.source === 'measured' ? styles.dotOk : styles.dotEst
                              }
                            />
                            {x.size.source === 'measured' ? `실측 ${x.size.count}건` : '예측'}
                          </span>
                        </div>
                      ))}
                  </div>
                )
              })}
              {shown.length === 0 && <p className={styles.empty}>맞는 옵션 없음</p>}
            </div>
          </div>
        )}
      </Section>
    </main>
  )
}
