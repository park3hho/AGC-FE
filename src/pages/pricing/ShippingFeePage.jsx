import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { getShippingFees } from '@/api/shipping'
import PageHeader from '@/components/common/PageHeader'
import Thumb from '@/components/Thumb'
import research from '@/pages/research/Research.module.css'
import { cnyToKrw, formatCny, formatFx, formatKgFromG, formatWon } from '@/utils/pricing'
import styles from './Shipping.module.css'

const PAGE_SIZE = 100

// 배송비 — 제품별 기준 조사 옵션의 배송비. 무게 = 용량(ml) + 박스, 원화 = 위안 × 현재 환율
export default function ShippingFeePage() {
  const [data, setData] = useState(null) // { fx, rule, items, total, page }
  const [error, setError] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    getShippingFees({ page: 1, size: PAGE_SIZE })
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const next = await getShippingFees({ page: data.page + 1, size: PAGE_SIZE })
      setData((d) => ({ ...next, items: [...d.items, ...next.items] }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }

  if (error && !data) {
    return (
      <main className="page-flat">
        <PageHeader title="배송비" back />
        <p className="form-error">{error}</p>
      </main>
    )
  }
  if (!data) return null

  const { fx, rule, items, total } = data

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
        <div className={styles.hint}>무게 = 용량(ml) × 1g + 박스 {rule.boxWeightG}g</div>
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

      {error && <p className="form-error">{error}</p>}
      {items.length === 0 && <p className={research.empty}>아직 제품이 없어요</p>}

      {items.map(({ product, survey, options }) => (
        <section key={product.id} className={styles.product}>
          <Link to={`/pricing/${product.id}`} className={styles.productHead}>
            <Thumb src={product.photoUrl} size={36} />
            <span className={styles.productTitle}>{product.titleKo || product.titleCn}</span>
            <span className={research.code}>{product.code}</span>
          </Link>

          {!survey && <p className={styles.hint}>가격조사가 없어 배송비를 계산할 수 없어요</p>}

          {options.map((o) => {
            const name = o.option2 ? `${o.option1} / ${o.option2}` : o.option1
            const krw = cnyToKrw(o.shippingCny, fx.cnyKrw)
            return (
              <div key={o.id} className={styles.row}>
                <div className={styles.rowText}>
                  <div className={styles.optionName}>{name}</div>
                  {o.volumeMl != null ? (
                    <div className={styles.hint}>
                      {o.volumeMl.toLocaleString('ko-KR')}ml + 박스 = {formatKgFromG(o.weightG)} →{' '}
                      {o.billableKg}kg
                    </div>
                  ) : (
                    <div className={styles.warn}>
                      용량을 못 읽었어요. 옵션 이름에 245ml×24 처럼 적어 주세요
                    </div>
                  )}
                  {o.overLimit && (
                    <div className={styles.warn}>{rule.maxKg}kg 초과 — 집운 소형으로 못 보내요</div>
                  )}
                </div>
                <div className={styles.rowRight}>
                  <span className={styles.fee}>{krw == null ? '-' : formatWon(krw)}</span>
                  <span className={styles.hint}>{formatCny(o.shippingCny)}</span>
                </div>
              </div>
            )
          })}
        </section>
      ))}

      {items.length < total && (
        <button className="btn-secondary btn-md" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? '불러오는 중…' : `더 보기 (${items.length}/${total})`}
        </button>
      )}
    </main>
  )
}
