import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { getShippingRule } from '@/api/shipping'
import PageHeader from '@/components/common/PageHeader'
import Pager from '@/components/common/Pager'
import Section from '@/components/common/Section'
import SectionTabs, { useSectionTabs } from '@/components/common/SectionTabs'
import { useFitRows } from '@/hooks/useFitRows'
import ShippingTabs from '@/pages/shipping/ShippingTabs'
import { cnyToKrw, formatCny, formatFx, formatWon } from '@/utils/pricing'
import styles from './Shipping.module.css'

const formatMl = (ml) => `${ml.toLocaleString('ko-KR')}ml`

// 모바일은 한 번에 한 섹션 (DESIGN.md §4.4)
const MOBILE_TABS = [
  { id: 'table', name: '요금표' },
  { id: 'rule', name: '요금 규칙' },
]

// 배송비 — 무게 구간별 요금표. 위안은 BE 요금 규칙, 원화 = 위안 × 현재 환율 (환율을 바꾸면 같이 바뀐다)
// 옵션별 실제 배송비는 가격 책정 화면에서 계산한다
// 요금표는 남은 높이를 채우고, 들어가는 구간 수만큼 한 페이지로 보여준다 (DESIGN.md §4.4)
export default function ShippingFeePage() {
  const [data, setData] = useState(null) // { fx, rule, brackets }
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const tableRef = useRef(null)
  const pageSize = useFitRows(tableRef, { fallback: 45 })
  const tabs = useSectionTabs(MOBILE_TABS)

  useEffect(() => {
    getShippingRule()
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return (
      <main className="page-flat">
        <PageHeader title="배송" sub={<ShippingTabs />} back />
        <p className="form-error">{error}</p>
      </main>
    )
  }
  if (!data) return null

  const { fx, rule, brackets } = data
  const max = brackets[brackets.length - 1] // 소형 한도 구간 (30kg)
  const maxKrw = max ? cnyToKrw(max.shippingCny, fx.cnyKrw) : null
  const pageCount = Math.max(1, Math.ceil(brackets.length / pageSize))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize
  const rows = brackets.slice(start, start + pageSize)

  return (
    <main className="page-flat">
      <PageHeader title="배송" sub={<ShippingTabs />} back />
      <SectionTabs {...tabs} />

      {/* 요금 규칙 + 현재 환율 */}
      <Section name="요금 규칙" id="rule" title={false} plain className={tabs.hide('rule')}>
        <div className={styles.rule}>
          <div className={styles.ruleTitle}>
            {rule.service} · {rule.category}
          </div>
          <div className={styles.hint}>
            첫 {Number(rule.firstKg)}kg {formatCny(rule.firstCny)} · {Number(rule.stepKg)}kg마다{' '}
            {formatCny(rule.stepCny)} · 최대 {Number(rule.maxKg)}kg
          </div>
          <div className={styles.hint}>
            무게 = 용량(ml) × 1g + 박스 {rule.boxWeightG}g → {Number(rule.stepKg)}kg 단위 올림
          </div>
          {max && (
            <div className={styles.ruleMax}>
              최대 {Number(max.billableKg)}kg = 용량 {formatMl(max.maxVolumeMl)}까지 ·{' '}
              {formatCny(max.shippingCny)} ·{' '}
              <strong>{maxKrw == null ? '-' : formatWon(maxKrw)}</strong>
            </div>
          )}
          <div className={styles.hint}>
            {Number(rule.maxKg)}kg을 넘으면 이 요금표(집운 소형)로 보낼 수 없어요. 부피 무게 ·
            관세는 반영하지 않아요.
          </div>
          <div className={styles.ruleFx}>
            <span>
              환율 <strong>1위안 = {formatFx(fx.cnyKrw)}원</strong>
              {!fx.date && <span className={styles.hint}> · 기본값</span>}
            </span>
            <Link to="/exchange-rate" className="btn-text">
              환율 설정
            </Link>
          </div>
        </div>
      </Section>

      {/* 무게 구간별 요금표 */}
      <Section
        name="요금표"
        id="table"
        title="무게 구간별 요금"
        sub={`${brackets.length}구간`}
        flush
        fill
        bodyRef={tableRef}
        className={tabs.hide('table')}
        footer={
          <Pager
            page={current}
            pageCount={pageCount}
            total={brackets.length}
            unit="구간"
            onChange={setPage}
          />
        }
      >
        <div className={styles.table} role="table" aria-label="무게별 배송비">
          <div className={`${styles.tableRow} ${styles.tableHead}`} role="row" data-fit-head>
            <span role="columnheader">무게</span>
            <span role="columnheader">용량</span>
            <span role="columnheader" className={styles.num}>
              위안
            </span>
            <span role="columnheader" className={styles.num}>
              원화
            </span>
          </div>
          {rows.map((b, j) => {
            const i = start + j
            const krw = cnyToKrw(b.shippingCny, fx.cnyKrw)
            const prevMl = i > 0 ? brackets[i - 1].maxVolumeMl : null
            return (
              <div key={b.billableKg} className={styles.tableRow} role="row" data-fit-row>
                <span role="cell">{Number(b.billableKg)}kg</span>
                <span role="cell" className={styles.hint}>
                  {prevMl == null
                    ? `~${formatMl(b.maxVolumeMl)}`
                    : `${formatMl(prevMl + 1)}~${formatMl(b.maxVolumeMl)}`}
                </span>
                <span role="cell" className={`${styles.num} ${styles.hint}`}>
                  {formatCny(b.shippingCny)}
                </span>
                <span role="cell" className={`${styles.num} ${styles.fee}`}>
                  {krw == null ? '-' : formatWon(krw)}
                </span>
              </div>
            )
          })}
        </div>
      </Section>
    </main>
  )
}
