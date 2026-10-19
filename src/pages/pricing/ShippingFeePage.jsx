import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { getShippingRule } from '@/api/shipping'
import PageHeader from '@/components/common/PageHeader'
import { cnyToKrw, formatCny, formatFx, formatWon } from '@/utils/pricing'
import styles from './Shipping.module.css'

const formatMl = (ml) => `${ml.toLocaleString('ko-KR')}ml`

// 배송비 — 무게 구간별 요금표. 위안은 BE 요금 규칙, 원화 = 위안 × 현재 환율 (환율을 바꾸면 같이 바뀐다)
// 옵션별 실제 배송비는 가격 책정 화면에서 계산한다
export default function ShippingFeePage() {
  const [data, setData] = useState(null) // { fx, rule, brackets }
  const [error, setError] = useState('')

  useEffect(() => {
    getShippingRule()
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return (
      <main className="page-flat">
        <PageHeader title="배송비" back />
        <p className="form-error">{error}</p>
      </main>
    )
  }
  if (!data) return null

  const { fx, rule, brackets } = data

  return (
    <main className="page-flat">
      <PageHeader title="배송비" back />

      {/* 요금 규칙 + 현재 환율 */}
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

      {/* 무게 구간별 요금표 */}
      <div className={styles.table} role="table" aria-label="무게별 배송비">
        <div className={`${styles.tableRow} ${styles.tableHead}`} role="row">
          <span role="columnheader">무게</span>
          <span role="columnheader">용량</span>
          <span role="columnheader" className={styles.num}>
            위안
          </span>
          <span role="columnheader" className={styles.num}>
            원화
          </span>
        </div>
        {brackets.map((b, i) => {
          const krw = cnyToKrw(b.shippingCny, fx.cnyKrw)
          const prevMl = i > 0 ? brackets[i - 1].maxVolumeMl : null
          return (
            <div key={b.billableKg} className={styles.tableRow} role="row">
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
      <p className={styles.hint}>
        {Number(rule.maxKg)}kg을 넘으면 이 요금표(집운 소형)로 보낼 수 없어요. 부피 무게 · 관세는
        반영하지 않아요.
      </p>
    </main>
  )
}
