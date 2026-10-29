import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { getDetailPages } from '@/api/detailPage'
import Badge from '@/components/Badge'
import Icon from '@/components/Icon'
import Thumb from '@/components/Thumb'
import ListItem from '@/components/common/ListItem'
import PageHeader from '@/components/common/PageHeader'
import Pager from '@/components/common/Pager'
import Section from '@/components/common/Section'
import { DETAIL_STATUS, DETAIL_STATUS_FILTERS } from '@/constants/designConst'
import { useFitRows } from '@/hooks/useFitRows'
import { toKstDate } from '@/utils/date'
import styles from './Design.module.css'
import { DESIGN_RULES, WORK_RULES_UPDATED } from '@/constants/workRules'

const statusOf = (it) => it.page?.status || 'none'

const StatusBadge = ({ status }) => (
  <Badge tone={DETAIL_STATUS[status].tone}>{DETAIL_STATUS[status].label}</Badge>
)

// 디자인 — 섹션: 검색·필터 · 제품 목록. 가격 책정이 끝난 제품의 상세페이지 상태를 본다
// 검색어·필터·페이지는 주소(?q=&status=&page=)에 둔다
export default function DesignListPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null) // { items, counts }
  const [error, setError] = useState('')
  const listRef = useRef(null)
  const pageSize = useFitRows(listRef, { fallback: 49 })

  const q = params.get('q') || ''
  const status = params.get('status') || 'all'
  const page = Number(params.get('page')) || 1

  useEffect(() => {
    getDetailPages()
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  const set = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries({ page: 1, ...patch }).forEach(([k, v]) =>
      v === '' || v == null || (k === 'page' && v === 1) || (k === 'status' && v === 'all')
        ? next.delete(k)
        : next.set(k, v),
    )
    setParams(next, { replace: true })
  }

  const filtered = useMemo(() => {
    const word = q.trim().toLowerCase()
    return (data?.items || []).filter(
      (it) =>
        (status === 'all' || statusOf(it) === status) &&
        (!word ||
          [it.product.code, it.product.titleKo, it.product.titleCn].some((v) =>
            v.toLowerCase().includes(word),
          )),
    )
  }, [data, q, status])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize)
  const counts = data?.counts || {}
  // 편집 화면 '다음' 버튼이 이 목록 순서(검색·필터 적용)를 따라가게 id 순서를 넘긴다
  const open = (it) => navigate(`/design/${it.product.id}`, { state: { ids: filtered.map((x) => x.product.id) } })

  const lastText = (p) => {
    if (!p) return '-'
    if (p.reviewedAt && ['approved', 'changes'].includes(p.status)) {
      return `${p.reviewedBy?.name || '-'} · ${toKstDate(p.reviewedAt)}`
    }
    return `${p.updatedBy?.name || '-'} · ${toKstDate(p.updatedAt)}`
  }

  return (
    <main className="page-flat">
      <PageHeader
        title="디자인"
        info={{
          title: '디자인 규칙',
          updated: WORK_RULES_UPDATED,
          source: '원문: FE DESIGN.md §4.7 · BE DESIGN.md §6.4',
          sections: DESIGN_RULES,
        }}
        sub={
          data
            ? `상세페이지 — 검수 대기 ${counts.review || 0} · 승인 ${counts.approved || 0} · 없음 ${counts.none || 0}`
            : '상세페이지를 만들고 사람이 한 번 확인해요'
        }
      />

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
            onChange={(e) => set({ status: e.target.value })}
          >
            {DETAIL_STATUS_FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
                {f.key !== 'all' && data ? ` (${counts[f.key] || 0})` : ''}
              </option>
            ))}
          </select>
        </div>
      </Section>

      <Section
        name="제품 목록"
        id="list"
        sub={data && `가격 책정 완료 ${filtered.length}개`}
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
            {data.items.length === 0
              ? '가격 책정이 끝난 제품이 아직 없어요'
              : '조건에 맞는 제품이 없어요'}
          </p>
        )}

        {rows.length > 0 && (
          <>
            <table className={styles.table}>
              <thead data-fit-head>
                <tr>
                  <th>제품</th>
                  <th>코드</th>
                  <th>상세페이지</th>
                  <th>마지막 손댄 사람</th>
                  <th>검수 메모</th>
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
                    <td>
                      <StatusBadge status={statusOf(it)} />
                    </td>
                    <td className={styles.date}>{lastText(it.page)}</td>
                    <td className={styles.note}>{it.page?.reviewNote || ''}</td>
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
                  sub={it.product.code}
                  right={<StatusBadge status={statusOf(it)} />}
                />
              ))}
            </div>
          </>
        )}
      </Section>
    </main>
  )
}
