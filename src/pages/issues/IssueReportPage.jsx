import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { getIssues, patchIssue } from '@/api/issues'
import PageHeader from '@/components/common/PageHeader'
import Pager from '@/components/common/Pager'
import Section from '@/components/common/Section'
import { useFitRows } from '@/hooks/useFitRows'
import styles from './Issues.module.css'

const TONE = { new: 'danger', ack: 'warning', resolved: 'success' }
const kst = (iso) =>
  iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(5, 16) : '-'

// 대시보드 › 이슈 리포트 (2026-11-27 사용자 "이슈리포트라는 목록을 그냥 만드셈")
// 섹션: 거르기 · 이슈 목록. 상태 · 처리 메모는 줄에서 바로 고침. 매입가 수정은 가격 책정에서.
export default function IssueReportPage() {
  const [kind, setKind] = useState(() => new URLSearchParams(window.location.search).get('kind') || '')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [memoEdit, setMemoEdit] = useState(null) // { id, text }
  const listRef = useRef(null)
  const size = useFitRows(listRef, { fallback: 40 })

  const load = () =>
    getIssues({ kind, status, page, size })
      .then((d) => (setData(d), setError('')))
      .catch((e) => setError(e.message))
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, status, page, size])

  const save = async (id, body) => {
    try {
      const u = await patchIssue(id, body)
      setData((d) => ({ ...d, items: d.items.map((x) => (x.id === id ? u : x)) }))
      setMemoEdit(null)
    } catch (e) {
      setError(e.message)
    }
  }

  const pageCount = data ? Math.max(1, Math.ceil(data.total / size)) : 1
  const set = (fn) => (e) => (fn(e.target.value), setPage(1))

  return (
    <main className="page-flat">
      <PageHeader title="이슈 리포트" sub="가격 · 물류 · 통관 문제 기록 · 상태와 처리 메모" />
      <Section name="거르기" id="filters" title={false}>
        <div className={styles.filters}>
          <select className="form-input" value={kind} onChange={set(setKind)} aria-label="종류">
            <option value="">종류 전체</option>
            {Object.entries(data?.kinds || {}).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select className="form-input" value={status} onChange={set(setStatus)} aria-label="상태">
            <option value="">상태 전체</option>
            {Object.entries(data?.statuses || {}).map(([k, v]) => (
              <option key={k} value={k}>
                {v} {data?.counts?.[k] ?? ''}
              </option>
            ))}
          </select>
          {error && <span className="form-error">{error}</span>}
        </div>
      </Section>

      <Section
        name="이슈 목록"
        id="list"
        sub={data && `${data.total}건`}
        flush
        fill
        bodyRef={listRef}
        footer={
          <Pager
            page={page}
            pageCount={pageCount}
            total={data?.total ?? null}
            unit="건"
            onChange={setPage}
          />
        }
      >
        <div className={styles.table} role="table" aria-label="이슈 목록" data-fit-list>
          <div className={`${styles.row} ${styles.head}`} role="row">
            <span role="columnheader">발생 시각</span>
            <span role="columnheader">종류</span>
            <span role="columnheader">대상</span>
            <span role="columnheader">내용</span>
            <span role="columnheader">상태</span>
            <span role="columnheader">처리 메모</span>
          </div>
          {data?.items.length === 0 && <p className={styles.empty}>이슈 없음</p>}
          {data?.items.map((i) => (
            <div key={i.id} className={styles.row} role="row">
              <span role="cell" className={styles.num}>
                {kst(i.created_at)}
              </span>
              <span role="cell">{i.kind_label}</span>
              <span role="cell" className={styles.target} title={i.title}>
                {i.product_id ? (
                  <Link to={`/pricing/shop?pid=${i.product_id}`}>{i.title}</Link>
                ) : (
                  i.title
                )}
              </span>
              <span role="cell" className={styles.num}>
                {i.detail}
              </span>
              <span role="cell">
                <span className={styles.st} data-tone={TONE[i.status]}>
                  <i />
                  <select
                    value={i.status}
                    onChange={(e) => save(i.id, { status: e.target.value })}
                    aria-label="상태 바꾸기"
                  >
                    {Object.entries(data.statuses).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </span>
              </span>
              <span role="cell" className={styles.memo}>
                {memoEdit?.id === i.id ? (
                  <input
                    className="form-input"
                    autoFocus
                    value={memoEdit.text}
                    onChange={(e) => setMemoEdit({ id: i.id, text: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') save(i.id, { memo: memoEdit.text })
                      if (e.key === 'Escape') setMemoEdit(null)
                    }}
                    onBlur={() => save(i.id, { memo: memoEdit.text })}
                    placeholder="처리 메모 · Enter 저장"
                  />
                ) : (
                  <button
                    type="button"
                    className={styles.memoBtn}
                    onClick={() => setMemoEdit({ id: i.id, text: i.memo || '' })}
                    title={i.memo || ''}
                  >
                    {i.memo || <em>메모 추가</em>}
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </main>
  )
}
