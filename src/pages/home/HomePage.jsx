import { useNavigate } from 'react-router-dom'

import MenuTile from '@/components/MenuTile'
import { MENU } from '@/constants/menuConst'
import styles from './HomePage.module.css'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <main className="page-flat">
      <h1>무엇을 해볼까요?</h1>
      <div className={styles.grid}>
        {MENU.map((m) => (
          <MenuTile key={m.key} icon={m.icon} label={m.label} onClick={() => navigate(m.path)} />
        ))}
      </div>
    </main>
  )
}
