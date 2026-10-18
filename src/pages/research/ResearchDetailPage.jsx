import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { getCandidate, updateCandidate } from '@/api/research'
import PageHeader from '@/components/common/PageHeader'
import { PRICE_DEFAULTS, RESEARCH_STATUS_LABEL } from '@/constants/researchConst'
import { formatCny, formatDate, formatKrw, formatPercent } from '@/utils/format'
import { calcMargin } from '@/utils/price'
import StatusBadge from './StatusBadge'
import styles from './Research.module.css'

export default function ResearchDetailPage() {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')
  const [calc, setCalc] = useState({
    salePrice: '',
    cnyToKrw: PRICE_DEFAULTS.cnyToKrw,
    shippingKrw: PRICE_DEFAULTS.shippingKrw,
    feePercent: PRICE_DEFAULTS.feeRate * 100,
  })

  useEffect(() => {
    getCandidate(id)
      .then((c) => {
        setItem(c)
        setCalc((prev) => ({ ...prev, salePrice: c.competitorPrice || '' }))
      })
      .catch((e) => setError(e.message))
  }, [id])

  if (error) {
    return (
      <main className="page-flat">
        <PageHeader title="리서치" back />
        <p className={styles.empty}>{error}</p>
      </main>
    )
  }
  if (!item) return null

  const setField = (key) => (e) => setCalc({ ...calc, [key]: e.target.value })
  const changeStatus = async (e) => setItem(await updateCandidate(id, { status: e.target.value }))

  const result = calcMargin({
    costCny: item.costCny,
    salePrice: Number(calc.salePrice) || 0,
    cnyToKrw: Number(calc.cnyToKrw) || 0,
    shippingKrw: Number(calc.shippingKrw) || 0,
    feeRate: (Number(calc.feePercent) || 0) / 100,
  })

  return (
    <main className="page-flat">
      <PageHeader title={item.name} back action={<StatusBadge status={item.status} />} />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>기본 정보</h2>
        <dl className={styles.row}>
          <dt>타오바오</dt>
          <dd>
            {item.taobaoUrl ? (
              <a href={item.taobaoUrl} target="_blank" rel="noreferrer">
                상품 보기
              </a>
            ) : (
              '-'
            )}
          </dd>
        </dl>
        <dl className={styles.row}>
          <dt>타오바오 가격</dt>
          <dd>{formatCny(item.costCny)}</dd>
        </dl>
        <dl className={styles.row}>
          <dt>네이버·쿠팡 최저가</dt>
          <dd>{item.competitorPrice ? formatKrw(item.competitorPrice) : '-'}</dd>
        </dl>
        <dl className={styles.row}>
          <dt>카테고리</dt>
          <dd>{item.category || '미분류'}</dd>
        </dl>
        <dl className={styles.row}>
          <dt>담은 날</dt>
          <dd>{formatDate(item.createdAt)}</dd>
        </dl>
        {item.memo && <p className={styles.note}>{item.memo}</p>}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>얼마나 남을까요?</h2>
        <p className={styles.note}>임시 계산이에요. 세금·관부가세는 아직 빠져 있어요.</p>
        <div className={styles.grid}>
          <div className="form-group">
            <label className="form-label" htmlFor="salePrice">판매가 (원)</label>
            <input id="salePrice" className="form-input" inputMode="numeric" value={calc.salePrice} onChange={setField('salePrice')} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cnyToKrw">환율 (1위안 = 원)</label>
            <input id="cnyToKrw" className="form-input" inputMode="decimal" value={calc.cnyToKrw} onChange={setField('cnyToKrw')} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="shippingKrw">배송비 (원)</label>
            <input id="shippingKrw" className="form-input" inputMode="numeric" value={calc.shippingKrw} onChange={setField('shippingKrw')} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="feePercent">판매처 수수료 (%)</label>
            <input id="feePercent" className="form-input" inputMode="decimal" value={calc.feePercent} onChange={setField('feePercent')} />
          </div>
        </div>
        <dl className={styles.row}>
          <dt>원가 (상품 + 배송)</dt>
          <dd>{formatKrw(result.costKrw)}</dd>
        </dl>
        <dl className={styles.row}>
          <dt>수수료</dt>
          <dd>{formatKrw(result.fee)}</dd>
        </dl>
        <dl className={`${styles.row} ${styles.total} ${result.margin < 0 ? styles.minus : ''}`}>
          <dt>예상 마진</dt>
          <dd>
            {formatKrw(result.margin)} ({formatPercent(result.marginRate)})
          </dd>
        </dl>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>이 상품, 어떻게 할까요?</h2>
        <select className={styles.filter} value={item.status} onChange={changeStatus}>
          {Object.entries(RESEARCH_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </section>
    </main>
  )
}
