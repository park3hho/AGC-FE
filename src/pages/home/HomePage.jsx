import { useNavigate } from 'react-router-dom'

import MenuTile from '@/components/MenuTile'
import { MENU } from '@/constants/menuConst'
import { hasFeature, ROLE_LABEL } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import styles from './HomePage.module.css'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const out = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="page-flat">
      <div className={styles.userBar}>
        <span>
          {user.name} ({ROLE_LABEL[user.role]})
        </span>
        <button className="btn-ghost btn-sm" onClick={out}>
          로그아웃
        </button>
      </div>
      <h1>무엇을 해볼까요?</h1>
      <div className={styles.grid}>
        {MENU.filter((m) => hasFeature(user, m.feature)).map((m) => (
          <MenuTile key={m.key} icon={m.icon} tone={m.tone} label={m.label} onClick={() => navigate(m.path)} />
        ))}
      </div>
    </main>
  )
}
