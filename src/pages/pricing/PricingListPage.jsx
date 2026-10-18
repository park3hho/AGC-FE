import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getProducts } from '@/api/product'
import ListItem from '@/components/common/ListItem'
import PageHeader from '@/components/common/PageHeader'
import Thumb from '@/components/Thumb'
import research from '@/pages/research/Research.module.css'

// 가격 책정 › 제품 고르기
export default function PricingListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getProducts()
      .then(setItems)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <main className="page-flat">
      <PageHeader title="가격 책정" back />

      <div className={research.list}>
        {error && <p className="form-error">{error}</p>}
        {items && items.length === 0 && <p className={research.empty}>아직 제품이 없어요</p>}
        {(items || []).map((p) => (
          <ListItem
            key={p.id}
            left={<Thumb src={p.photoUrl} />}
            onClick={() => navigate(`/pricing/${p.id}`)}
            title={p.titleKo || p.titleCn || '-'}
            sub={p.surveyCount ? `가격조사 ${p.surveyCount}건` : '가격조사 없음'}
            right={<span className={research.code}>{p.code}</span>}
          />
        ))}
      </div>
    </main>
  )
}
