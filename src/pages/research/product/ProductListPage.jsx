import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getProducts } from '@/api/product'
import ListItem from '@/components/common/ListItem'
import PageHeader from '@/components/common/PageHeader'
import Thumb from '@/components/Thumb'
import styles from '../Research.module.css'

export default function ProductListPage() {
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
      <PageHeader
        title="제품조사"
        back
        action={
          <button className="btn-primary btn-md" onClick={() => navigate('/research/products/new')}>
            제품 추가
          </button>
        }
      />

      <div className={styles.list}>
        {error && <p className="form-error">{error}</p>}
        {items && items.length === 0 && <p className={styles.empty}>아직 제품이 없어요</p>}
        {(items || []).map((p) => (
          <ListItem
            key={p.code}
            left={<Thumb src={p.photoUrl} />}
            onClick={() => navigate(`/research/products/${p.id}`)}
            title={p.titleKo || '-'}
            sub={p.titleCn || '-'}
            right={
              <>
                <span className={styles.code}>{p.code}</span>
                <div className={styles.date}>{p.addedAt}</div>
              </>
            }
          />
        ))}
      </div>
    </main>
  )
}
