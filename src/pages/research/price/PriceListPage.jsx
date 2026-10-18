import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getPriceResearches } from '@/api/priceResearch'
import { getProducts } from '@/api/product'
import ListItem from '@/components/common/ListItem'
import PageHeader from '@/components/common/PageHeader'
import styles from '../Research.module.css'

export default function PriceListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState(null)
  const [titles, setTitles] = useState({})

  useEffect(() => {
    Promise.all([getPriceResearches(), getProducts()]).then(([researches, products]) => {
      setTitles(Object.fromEntries(products.map((p) => [p.code, p.titleKo || p.titleCn])))
      setItems(researches)
    })
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
        {items && items.length === 0 && <p className={styles.empty}>아직 조사가 없어요</p>}
        {(items || []).map((r) => {
          const minCny = Math.min(...r.options.map((o) => o.priceCny))
          return (
            <ListItem
              key={r.code}
              title={titles[r.productCode] || r.productCode}
              sub={`${r.productCode} · 옵션 ${r.options.length}종류 · ¥${minCny}~`}
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
