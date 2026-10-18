import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getPriceResearch } from '@/api/priceResearch'
import PageHeader from '@/components/common/PageHeader'
import Thumb from '@/components/Thumb'
import styles from '../Research.module.css'
import detail from '../Detail.module.css'

const won = (n) => (n == null ? '-' : `${Number(n).toLocaleString('ko-KR')}원`)

function ExternalLink({
  href, // string?: 바깥 주소
}) {
  if (!href) return '-'
  return (
    <a href={href} target="_blank" rel="noreferrer">
      열기
    </a>
  )
}

export default function PriceDetailPage() {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getPriceResearch(id)
      .then(setItem)
      .catch((err) => setError(err.message))
  }, [id])

  if (error) {
    return (
      <main className="page-flat">
        <PageHeader title="가격조사" back />
        <p className="form-error">{error}</p>
      </main>
    )
  }
  if (!item) return null

  return (
    <main className="page-flat">
      <PageHeader title={item.code} back />

      <Link to={`/research/products/${item.productId}`} className={styles.linked}>
        <Thumb src={item.photoUrl} />
        <div>
          <div className={styles.linkedTitle}>{item.productTitle}</div>
          <div className={styles.hint}>{item.productCode}</div>
        </div>
      </Link>

      <dl className={detail.rows}>
        <div className={detail.row}>
          <dt>조사일</dt>
          <dd>{item.researchedAt}</dd>
        </div>
        <div className={detail.row}>
          <dt>타오바오</dt>
          <dd>
            <ExternalLink href={item.taobaoUrl} />
          </dd>
        </div>
      </dl>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span>옵션</span>
          <span className={styles.code}>총 {item.options.length}종류</span>
        </div>
        <table className={detail.optionTable}>
          <thead>
            <tr>
              <th>옵션1</th>
              <th>옵션2</th>
              <th className={detail.price}>가격 (위안)</th>
            </tr>
          </thead>
          <tbody>
            {item.options.map((o) => (
              <tr key={o.id}>
                <td>
                  <span className={detail.optionCell}>
                    {o.photoUrl && <Thumb src={o.photoUrl} size={32} />}
                    {o.option1}
                  </span>
                </td>
                <td>{o.option2 || '-'}</td>
                <td className={detail.price}>¥{o.priceCny}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span>쿠팡·네이버 최저가</span>
        </div>
        <dl className={detail.rows}>
          <div className={detail.row}>
            <dt>쿠팡</dt>
            <dd>
              {won(item.coupangMinPrice)} · <ExternalLink href={item.coupangUrl} />
            </dd>
          </div>
          <div className={detail.row}>
            <dt>네이버</dt>
            <dd>
              {won(item.naverMinPrice)} · <ExternalLink href={item.naverUrl} />
            </dd>
          </div>
        </dl>
      </section>
    </main>
  )
}
