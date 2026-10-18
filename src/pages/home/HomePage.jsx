import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getPriceResearches } from '@/api/priceResearch'
import { getProducts } from '@/api/product'
import MenuTile from '@/components/MenuTile'
import { MENU } from '@/constants/menuConst'
import styles from './HomePage.module.css'

export default function HomePage() {
  const navigate = useNavigate()
  const [subs, setSubs] = useState({})

  useEffect(() => {
    Promise.all([getProducts(), getPriceResearches()]).then(([products, researches]) => {
      setSubs({ product: `제품 ${products.length}개`, price: `조사 ${researches.length}건` })
    })
  }, [])

  return (
    <main className="page-flat">
      <h1>무엇을 해볼까요?</h1>
      <div className={styles.grid}>
        {MENU.map((m) => (
          <MenuTile
            key={m.key}
            icon={m.icon}
            tone={m.tone}
            label={m.label}
            sub={subs[m.key]}
            onClick={() => navigate(m.path)}
          />
        ))}
      </div>
    </main>
  )
}
