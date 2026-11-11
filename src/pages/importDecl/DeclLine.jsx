import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { getDeclarations } from '@/api/importDecl'
import styles from './ImportDecl.module.css'

export const DECL_TONE = {
  draft: 'weak',
  sent: 'ok',
  accepted: 'ok',
  approved: 'ok',
  fix: 'bad',
  rejected: 'bad',
  missed: 'bad',
}

// 주문 상세 › 수입신고 한 줄 (2026-11-11) — 이 주문에 묶인 신고서 · 없으면 필요 여부
export default function DeclLine({ order }) {
  const [items, setItems] = useState(null)
  useEffect(() => {
    if (!order?.id) return
    getDeclarations({ orderId: order.id })
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
  }, [order?.id])

  if (!items) return <span className={styles.weak}>불러오는 중…</span>
  if (!items.length)
    return order.progress?.decl_missing ? (
      <Link to="/import-declarations" className={styles.bad}>
        필요 — 통관 전에 내야 해요 ›
      </Link>
    ) : (
      <span className={styles.weak}>아직 없음 (집운 출고 뒤 B/L 나오면 냄)</span>
    )
  return (
    <span className={styles.lines}>
      {items.map((d) => (
        <Link key={d.id} to={`/import-declarations?order=${order.id}`} className={styles.line}>
          <b className={styles[DECL_TONE[d.status]]}>{d.statusLabel}</b>
          {d.declNo && ` · ${d.declNo}`}
          {d.blNo && <span className={styles.weak}> · B/L {d.blNo}</span>}
        </Link>
      ))}
    </span>
  )
}
