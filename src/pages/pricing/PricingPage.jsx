import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getPricing } from '@/api/pricing'
import PageHeader from '@/components/common/PageHeader'
import Thumb from '@/components/Thumb'
import { PLATFORMS } from '@/constants/pricingConst'
import research from '@/pages/research/Research.module.css'
import PlatformPricingSection from './PlatformPricingSection'
import styles from './Pricing.module.css'

// 가격 책정 › 제품 1개 — 판매처(쿠팡·네이버)마다 따로 저장
export default function PricingPage() {
  const { productId } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setData(null)
    setError('')
    getPricing(productId)
      .then(setData)
      .catch((err) => setError(err.message))
  }, [productId])

  if (error) {
    return (
      <main className="page-flat">
        <PageHeader title="가격 책정" back />
        <p className="form-error">{error}</p>
      </main>
    )
  }
  if (!data) return null

  const { product, survey, options, pricings } = data

  return (
    <main className="page-flat">
      <PageHeader title="가격 책정" back />

      <Link to={`/research/products/${product.id}`} className={research.linked}>
        <Thumb src={product.photoUrl} />
        <div className={styles.productBody}>
          <div className={styles.productTitle}>
            <span className={research.linkedTitle}>{product.titleKo || product.titleCn}</span>
            <span className={research.code}>{product.code}</span>
          </div>
          {survey && (
            <div className={research.hint}>
              기준 조사 {survey.code} · {survey.surveyDate} · 옵션 {options.length}개
            </div>
          )}
        </div>
      </Link>

      {!survey ? (
        <div className={styles.noSurvey}>
          <p>아직 가격조사가 없어요. 조사를 먼저 등록하면 판매가를 정할 수 있어요.</p>
          <Link
            to={`/research/prices/new?product=${encodeURIComponent(product.code)}`}
            className="btn-text"
          >
            가격조사 등록하기
          </Link>
        </div>
      ) : (
        PLATFORMS.filter((p) => pricings[p.key]).map((p) => (
          <PlatformPricingSection
            key={`${p.key}-${survey.id}`}
            productId={product.id}
            platform={p}
            survey={survey}
            options={options}
            initialPricing={pricings[p.key]}
          />
        ))
      )}
    </main>
  )
}
