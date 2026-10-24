import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { getDetailPages } from '@/api/detailPage'
import Icon from '@/components/Icon'
import Thumb from '@/components/Thumb'
import ListItem from '@/components/common/ListItem'
import PageHeader from '@/components/common/PageHeader'
import Pager from '@/components/common/Pager'
import Section from '@/components/common/Section'
import { useFitRows } from '@/hooks/useFitRows'
import { toKstDate } from '@/utils/date'
import styles from '@/pages/design/Design.module.css'

// 상품 — 섹션: 검색 · 상품 목록. 디자인(상세페이지)이 승인된 제품만 여기 보인다 (FE DESIGN.md §4.7)
//   마켓 등록 기능은 아직 없다 — 지금은 '올릴 준비가 된 제품' 목록. 누르면 디자인(제품)에서 상세 이미지를 받는다.
//   검색어·페이지는 주소(?q=&page=)에 둔다
export default function ProductsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null) // getDetailPages 결과
  const [error, setError] = useState('')
  const listRef = useRef(null)
  const pageSize = useFitRows(listRef, { fallback: 49 })

  const q = params.get('q') || ''
  const page = Number(params.get('page')) || 1

  useEffect(() => {
    getDetailPages()
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  const set = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries({ page: 1, ...patch }).forEach(([k, v]) =>
      v === '' || v == null || (k === 'page' && v === 1) ? next.delete(k) : next.set(k, v),
    )
    setParams(next, { replace: true })
  }

  const approved = useMemo(
    () => (data?.items || []).filter((it) => it.page?.status === 'approved'),
    [data],
  )
  const filtered = useMemo(() => {
    const word = q.trim().toLowerCase()
    if (!word) return approved
    return approved.filter((it) =>
      [it.product.code, it.product.titleKo, it.product.titleCn].some((v) =>
        (v || '').toLowerCase().includes(word),
      ),
    )
  }, [approved, q])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize)
  const counts = data?.counts || {}
  const open = (it) => navigate(`/design/${it.product.id}`)
  const approvedText = (p) => `${p.reviewedBy?.name || '-'} · ${toKstDate(p.reviewedAt)}`

  return (
    <main className="page-flat">
      <PageHeader
        title="상품"
        sub={
          data
            ? `디자인 승인된 제품 ${approved.length}개 · 디자인 검수 대기 ${counts.review || 0}`
            : '디자인이 승인된 제품이 여기 모여요'
        }
      />

      <Section name="검색" id="filters" title={false}>
        <div className={styles.filters}>
          <label className={styles.search}>
            <Icon name="search" size={16} />
            <input
              value={q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="이름·코드 검색 (중국어 가능)"
            />
          </label>
        </div>
      </Section>

      <Section
        name="상품 목록"
        id="list"
        sub={data && `${filtered.length}개`}
        flush
        fill
        bodyRef={listRef}
        footer={
          <Pager
            page={current}
            pageCount={pageCount}
            total={data ? filtered.length : null}
            onChange={(n) => set({ page: n })}
          />
        }
      >
        {error && <p className={`form-error ${styles.msg}`}>{error}</p>}
        {data && filtered.length === 0 && (
          <p className={styles.empty}>
            {approved.length === 0
              ? '아직 디자인이 승인된 제품이 없어요. 디자인에서 휴먼 체크를 확인하면 여기 보여요'
              : '조건에 맞는 상품이 없어요'}
          </p>
        )}

        {rows.length > 0 && (
          <>
            <table className={styles.table}>
              <thead data-fit-head>
                <tr>
                  <th>상품</th>
                  <th>코드</th>
                  <th>디자인 승인</th>
                  <th>메모</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((it) => (
                  <tr key={it.product.id} data-fit-row onClick={() => open(it)}>
                    <td>
                      <div className={styles.product}>
                        <Thumb src={it.product.photoUrl} size={36} />
                        <div className={styles.names}>
                          <div className={styles.title}>
                            {it.product.titleKo || it.product.titleCn || '-'}
                          </div>
                          <div className={styles.cn}>{it.product.titleCn}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.code}>{it.product.code}</span>
                    </td>
                    <td className={styles.date}>{approvedText(it.page)}</td>
                    <td className={styles.note}>{it.page.reviewNote || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={styles.mobileList} data-fit-list>
              {rows.map((it) => (
                <ListItem
                  key={it.product.id}
                  left={<Thumb src={it.product.photoUrl} />}
                  onClick={() => open(it)}
                  title={it.product.titleKo || it.product.titleCn || '-'}
                  sub={`${it.product.code} · 승인 ${toKstDate(it.page.reviewedAt)}`}
                />
              ))}
            </div>
          </>
        )}
      </Section>
    </main>
  )
}
