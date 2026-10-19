import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { getProducts } from '@/api/product'
import Badge from '@/components/Badge'
import Icon from '@/components/Icon'
import Thumb from '@/components/Thumb'
import ListItem from '@/components/common/ListItem'
import Pager from '@/components/common/Pager'
import Section from '@/components/common/Section'
import { PRICING_STATUS, PRICING_STATUS_FILTERS } from '@/constants/pricingConst'
import { formatCny } from '@/utils/pricing'
import styles from './ProductBrowser.module.css'

const PAGE_SIZE = 20

const SORTS = [
  { key: 'recent', label: '추가일: 최근 순' },
  { key: 'price', label: '타오바오 최저가: 낮은 순' },
]

const matchStatus = (p, status) => {
  if (status === 'all') return true
  if (status === 'todo') return p.pricingStatus === 'pending' || p.pricingStatus === 'partial'
  return p.pricingStatus === status
}

const minPrice = (p) =>
  p.latestSurvey?.minPriceCny == null ? Infinity : Number(p.latestSurvey.minPriceCny)

// 제품 목록 — 섹션 '검색·필터' + '제품 목록' (데스크탑 표 / 모바일 행 목록, DESIGN.md §4.4)
// 검색어·필터·정렬·페이지는 주소(?q=&status=&sort=&page=)에 둔다 — 뒤로 가기 해도 그대로
export default function ProductBrowser({
  onOpen, // function(product): 행을 눌렀을 때
  defaultStatus = 'all', // string?: 처음 필터 (PRICING_STATUS_FILTERS 키)
  emptyText = '아직 제품이 없어요', // string?: 제품이 하나도 없을 때
}) {
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  const q = params.get('q') || ''
  const status = params.get('status') || defaultStatus
  const sort = params.get('sort') || 'recent'
  const page = Number(params.get('page')) || 1

  useEffect(() => {
    getProducts()
      .then(setItems)
      .catch((err) => setError(err.message))
  }, [])

  const set = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries({ page: 1, ...patch }).forEach(([k, v]) =>
      v === '' || v == null || (k === 'page' && v === 1) ? next.delete(k) : next.set(k, v),
    )
    setParams(next, { replace: true })
  }

  const filtered = useMemo(() => {
    const word = q.trim().toLowerCase()
    const list = (items || []).filter(
      (p) =>
        matchStatus(p, status) &&
        (!word || [p.code, p.titleKo, p.titleCn].some((v) => v.toLowerCase().includes(word))),
    )
    return sort === 'price' ? [...list].sort((a, b) => minPrice(a) - minPrice(b)) : list
  }, [items, q, status, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const badge = (p) => (
    <Badge tone={PRICING_STATUS[p.pricingStatus].tone}>
      {PRICING_STATUS[p.pricingStatus].label}
    </Badge>
  )

  return (
    <>
      <Section name="검색·필터" id="filters" title={false}>
        <div className={styles.filters}>
          <label className={styles.search}>
            <Icon name="search" size={16} />
            <input
              value={q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="이름·코드 검색 (중국어 가능)"
            />
          </label>
          <select
            className={`form-input ${styles.select}`}
            value={status}
            onChange={(e) =>
              set({ status: e.target.value === defaultStatus ? '' : e.target.value })
            }
          >
            {PRICING_STATUS_FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            className={`form-input ${styles.select}`}
            value={sort}
            onChange={(e) => set({ sort: e.target.value === 'recent' ? '' : e.target.value })}
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </Section>

      <Section name="제품 목록" id="list" sub={items && `${filtered.length}개`} flush>
        {error && <p className={`form-error ${styles.msg}`}>{error}</p>}
        {items && filtered.length === 0 && (
          <p className={styles.empty}>
            {items.length === 0 ? emptyText : '조건에 맞는 제품이 없어요'}
          </p>
        )}

        {rows.length > 0 && (
          <>
            {/* 데스크탑 — 표 */}
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>제품</th>
                  <th>코드</th>
                  <th className={styles.r}>옵션</th>
                  <th className={styles.r}>타오바오 최저가</th>
                  <th>가격 책정</th>
                  <th>추가일</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} onClick={() => onOpen(p)}>
                    <td>
                      <div className={styles.product}>
                        <Thumb src={p.photoUrl} size={44} />
                        <div className={styles.names}>
                          <div className={styles.title}>{p.titleKo || p.titleCn || '-'}</div>
                          <div className={styles.cn}>{p.titleCn}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.code}>{p.code}</span>
                    </td>
                    <td className={styles.r}>
                      {p.latestSurvey ? `${p.latestSurvey.optionCount}종류` : '-'}
                    </td>
                    <td className={styles.r}>{formatCny(p.latestSurvey?.minPriceCny)}</td>
                    <td>{badge(p)}</td>
                    <td className={styles.date}>{p.addedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 모바일 — 행 목록 */}
            <div className={styles.mobileList}>
              {rows.map((p) => (
                <ListItem
                  key={p.id}
                  left={<Thumb src={p.photoUrl} />}
                  onClick={() => onOpen(p)}
                  title={p.titleKo || p.titleCn || '-'}
                  sub={[
                    p.code,
                    p.latestSurvey && `옵션 ${p.latestSurvey.optionCount}`,
                    p.latestSurvey?.minPriceCny && `${formatCny(p.latestSurvey.minPriceCny)}~`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  right={badge(p)}
                />
              ))}
            </div>
          </>
        )}

        <Pager
          page={current}
          pageCount={pageCount}
          total={items ? filtered.length : null}
          onChange={(n) => set({ page: n })}
        />
      </Section>
    </>
  )
}
