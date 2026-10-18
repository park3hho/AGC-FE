import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getPriceResearches } from '@/api/priceResearch'
import { getProducts } from '@/api/product'
import ListItem from '@/components/common/ListItem'
import PageHeader from '@/components/common/PageHeader'
import Thumb from '@/components/Thumb'
import styles from '../Research.module.css'

export default function PriceListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState(null)
  const [productMap, setProductMap] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getPriceResearches(), getProducts()])
      .then(([researches, products]) => {
        setProductMap(Object.fromEntries(products.map((p) => [p.code, p])))
        setItems(researches)
      })
      .catch((err) => setError(err.message))
  }, [])

  return (
    <main className="page-flat">
      <PageHeader
        title="가격조사"
        back
        action={
          <button className="btn-primary btn-md" onClick={() => navigate('/research/prices/new')}>
            조사 추가
          </button>
        }
      />

      <div className={styles.list}>
        {error && <p className="form-error">{error}</p>}
        {items && items.length === 0 && <p className={styles.empty}>아직 조사가 없어요</p>}
        {(items || []).map((r) => {
          const minCny = Number(r.minPriceCny) // BE 가 옵션 중 최저가를 계산해 준다
          const product = productMap[r.productCode]
          return (
            <ListItem
              key={r.code}
              left={<Thumb src={product?.photoUrl} />}
              onClick={() => navigate(`/research/prices/${r.id}`)}
              title={product?.titleKo || product?.titleCn || r.productCode}
              sub={`${r.productCode} · 옵션 ${r.optionCount}종류 · ¥${minCny}~`}
              right={
                <>
                  <span className={styles.code}>{r.code}</span>
                  <div className={styles.date}>{r.researchedAt}</div>
                </>
              }
            />
          )
        })}
      </div>
    </main>
  )
}
