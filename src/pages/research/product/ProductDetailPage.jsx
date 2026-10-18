import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { getProduct } from '@/api/product'
import ListItem from '@/components/common/ListItem'
import PageHeader from '@/components/common/PageHeader'
import Thumb from '@/components/Thumb'
import styles from '../Research.module.css'
import detail from '../Detail.module.css'

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getProduct(id)
      .then(setData)
      .catch((err) => setError(err.message))
  }, [id])

  if (error) {
    return (
      <main className="page-flat">
        <PageHeader title="제품조사" back />
        <p className="form-error">{error}</p>
      </main>
    )
  }
  if (!data) return null

  const { product, surveys } = data

  return (
    <main className="page-flat">
      <PageHeader title={product.titleKo || product.titleCn} back />

      <Thumb src={product.photoUrl} size={160} />

      <dl className={detail.rows}>
        <div className={detail.row}>
          <dt>제품 코드</dt>
          <dd>
            <span className={styles.code}>{product.code}</span>
          </dd>
        </div>
        <div className={detail.row}>
          <dt>중국어 제목</dt>
          <dd>{product.titleCn || '-'}</dd>
        </div>
        <div className={detail.row}>
          <dt>한국어 제목</dt>
          <dd>{product.titleKo || '-'}</dd>
        </div>
        <div className={detail.row}>
          <dt>제품 코드 추가일</dt>
          <dd>{product.addedAt}</dd>
        </div>
      </dl>

      <button
        className="btn-secondary btn-md btn-full"
        onClick={() => navigate(`/pricing/${product.id}`)}
      >
        가격 책정
      </button>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span>가격조사 {surveys.length}건</span>
          <button
            className="btn-secondary btn-sm"
            onClick={() => navigate(`/research/prices/new?product=${encodeURIComponent(product.code)}`)}
          >
            조사 추가
          </button>
        </div>
        {surveys.length === 0 && <p className={styles.empty}>아직 이 제품의 가격조사가 없어요</p>}
        <div className={styles.list}>
          {surveys.map((s) => (
            <ListItem
              key={s.id}
              title={s.code}
              sub={`옵션 ${s.optionCount}종류 · ¥${Number(s.minPriceCny)}~`}
              right={<div className={styles.date}>{s.researchedAt}</div>}
              onClick={() => navigate(`/research/prices/${s.id}`)}
            />
          ))}
        </div>
      </section>
    </main>
  )
}
