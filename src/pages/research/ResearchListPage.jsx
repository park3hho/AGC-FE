import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getCandidates } from '@/api/research'
import ListItem from '@/components/common/ListItem'
import PageHeader from '@/components/common/PageHeader'
import { PRICE_DEFAULTS, RESEARCH_STATUS_LABEL } from '@/constants/researchConst'
import { formatCny, formatKrw } from '@/utils/format'
import { calcMargin } from '@/utils/price'
import StatusBadge from './StatusBadge'
import styles from './Research.module.css'

export default function ResearchListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    getCandidates().then(setItems)
  }, [])

  const visible = (items || []).filter((c) => !status || c.status === status)

  return (
    <main className="page-flat">
      <PageHeader
        title="리서치"
        back
        action={
          <button className="btn-primary btn-md" onClick={() => navigate('/research/new')}>
            후보 추가
          </button>
        }
      />

      <select className={styles.filter} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">전체</option>
        {Object.entries(RESEARCH_STATUS_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <div className={styles.list}>
        {items && visible.length === 0 && <p className={styles.empty}>아직 후보가 없어요</p>}
        {visible.map((c) => {
          const { margin } = calcMargin({ ...PRICE_DEFAULTS, costCny: c.costCny, salePrice: c.competitorPrice })
          return (
            <ListItem
              key={c.id}
              title={c.name}
              sub={`${c.category || '미분류'} · ${formatCny(c.costCny)} · 경쟁가 ${formatKrw(c.competitorPrice)}`}
              right={
                <>
                  <StatusBadge status={c.status} />
                  <div className={`${styles.margin} ${margin < 0 ? styles.minus : ''}`}>
                    {formatKrw(margin)}
                  </div>
                </>
              }
              onClick={() => navigate(`/research/${c.id}`)}
            />
          )
        })}
      </div>
    </main>
  )
}
