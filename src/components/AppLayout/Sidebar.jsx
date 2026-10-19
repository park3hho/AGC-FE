import { NavLink, useNavigate } from 'react-router-dom'

import Icon from '@/components/Icon'
import { MENU, MENU_GROUPS } from '@/constants/menuConst'
import { hasFeature, ROLE_LABEL } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import styles from './AppLayout.module.css'

const navClass = ({ isActive }) => `${styles.navItem} ${isActive ? styles.navOn : ''}`

// 공통 › 왼쪽 메뉴 — 데스크탑에서만 보임
export default function Sidebar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const visible = MENU.filter((m) => m.soon || hasFeature(user, m.feature))

  const out = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className={styles.sidebar} data-section="공통 › 왼쪽 메뉴">
      <div className={styles.brand}>
        <span className={styles.logo}>AGC</span>
        <span>
          <b>AGC 구매대행</b>
          <small>타오바오 → 네이버·쿠팡</small>
        </span>
      </div>

      <nav className={styles.nav}>
        <NavLink to="/" end className={navClass}>
          <Icon name="home" size={18} />홈
        </NavLink>

        {MENU_GROUPS.map((g) => {
          const items = visible.filter((m) => m.group === g.key)
          if (!items.length) return null
          return (
            <div key={g.key} className={styles.navGroup}>
              <div className={styles.navLabel}>{g.label}</div>
              {items.map((m) =>
                m.soon ? (
                  <span key={m.key} className={`${styles.navItem} ${styles.navSoon}`}>
                    <Icon name={m.icon} size={18} />
                    {m.label}
                    <small>준비 중</small>
                  </span>
                ) : (
                  <NavLink key={m.key} to={m.path} className={navClass}>
                    <Icon name={m.icon} size={18} />
                    {m.label}
                  </NavLink>
                ),
              )}
            </div>
          )
        })}
      </nav>

      <div className={styles.me}>
        <span className={styles.avatar}>{user.name?.[0] || '?'}</span>
        <span className={styles.meText}>
          <b>{user.name}</b>
          <small>{ROLE_LABEL[user.role]}</small>
        </span>
        <button className="btn-ghost btn-sm" onClick={out}>
          로그아웃
        </button>
      </div>
    </aside>
  )
}
