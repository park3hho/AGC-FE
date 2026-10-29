import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getPriceResearches } from '@/api/priceResearch'
import { getProducts } from '@/api/product'
import Thumb from '@/components/Thumb'
import ListItem from '@/components/common/ListItem'
import PageHeader from '@/components/common/PageHeader'
import Pager from '@/components/common/Pager'
import Section from '@/components/common/Section'
import { useFitRows } from '@/hooks/useFitRows'
import { formatCny } from '@/utils/pricing'
import styles from './PriceList.module.css'
import { RESEARCH_RULES, RESEARCH_RULES_UPDATED } from '@/constants/researchRules'

// 가격조사 — 섹션: 조사 목록 (데스크탑 표 / 모바일 행 목록, DESIGN.md §4.4)
// 목록은 남은 높이를 채우고, 그 높이에 들어가는 행 수만큼 한 페이지로 보여준다 (스크롤 대신 페이지 넘김)
export default function PriceListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState(null)
  const [productMap, setProductMap] = useState({})
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const listRef = useRef(null)
  const pageSize = useFitRows(listRef, { fallback: 65 })

  useEffect(() => {
    Promise.all([getPriceResearches(), getProducts()])
      .then(([researches, products]) => {
        setProductMap(Object.fromEntries(products.map((p) => [p.code, p])))
        setItems(researches)
      })
      .catch((err) => setError(err.message))
  }, [])

  const list = items || []
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize))
  const current = Math.min(page, pageCount)
  const rows = list.slice((current - 1) * pageSize, current * pageSize)
  const open = (r) => navigate(`/research/prices/${r.id}`)
  const titleOf = (r) => {
    const p = productMap[r.productCode]
    return p?.titleKo || p?.titleCn || r.productCode
  }

  return (
    <main className="page-flat">
      <PageHeader
        title="가격조사"
        sub="제품별 타오바오 옵션 가격 기록"
        info={{
          title: '리서치 규칙',
          updated: RESEARCH_RULES_UPDATED,
          source:
            '원문: 리서처 스킬 (.claude/skills/researcher/SKILL.md) — 규칙을 바꾸면 둘 다 고쳐요',
          sections: RESEARCH_RULES,
        }}
        action={
          <button className="btn-primary btn-md" onClick={() => navigate('/research/prices/new')}>
            조사 추가
          </button>
        }
      />

      <Section
        name="조사 목록"
        id="list"
        sub={items && `${items.length}건`}
        flush
        fill
        bodyRef={listRef}
        footer={
          <Pager
            page={current}
            pageCount={pageCount}
            total={items ? items.length : null}
            unit="건"
            onChange={setPage}
          />
        }
      >
        {error && <p className={`form-error ${styles.msg}`}>{error}</p>}
        {items && items.length === 0 && <p className={styles.empty}>아직 조사가 없어요</p>}

        {rows.length > 0 && (
          <>
            {/* 데스크탑 — 표 */}
            <table className={styles.table}>
              <thead data-fit-head>
                <tr>
                  <th>제품</th>
                  <th>조사 코드</th>
                  <th className={styles.r}>옵션</th>
                  <th className={styles.r}>타오바오 최저가</th>
                  <th>조사일</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} data-fit-row onClick={() => open(r)}>
                    <td>
                      <div className={styles.product}>
                        <Thumb src={productMap[r.productCode]?.photoUrl} size={44} />
                        <div className={styles.names}>
                          <div className={styles.title}>{titleOf(r)}</div>
                          <div className={styles.sub}>{r.productCode}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.code}>{r.code}</span>
                    </td>
                    <td className={styles.r}>{r.optionCount}종류</td>
                    <td className={styles.r}>{formatCny(r.minPriceCny)}~</td>
                    <td className={styles.date}>{r.researchedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 모바일 — 행 목록 */}
            <div className={styles.mobileList} data-fit-list>
              {rows.map((r) => (
                <ListItem
                  key={r.id}
                  left={<Thumb src={productMap[r.productCode]?.photoUrl} />}
                  onClick={() => open(r)}
                  title={titleOf(r)}
                  sub={`${r.code} · 옵션 ${r.optionCount} · ${formatCny(r.minPriceCny)}~`}
                  right={<span className={styles.date}>{r.researchedAt}</span>}
                />
              ))}
            </div>
          </>
        )}
      </Section>
    </main>
  )
}
