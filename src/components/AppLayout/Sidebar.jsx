import { useState } from 'react'
import { NavLink } from 'react-router-dom'

import AccountModal from '@/components/AccountModal'
import Icon from '@/components/Icon'
import { MENU, MENU_GROUPS } from '@/constants/menuConst'
import { hasFeature, ROLE_LABEL } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import { devVisible, useDevMode } from '@/hooks/useDevMode'
import styles from './AppLayout.module.css'

const navClass =
  (dev) =>
  ({ isActive }) =>
    `${styles.navItem} ${isActive ? styles.navOn : ''} ${dev ? styles.navDev : ''}`

// 공통 › 왼쪽 메뉴 — 데스크탑에서만 보임. 아래 내 계정을 누르면 모달 (개발자 모드 · 로그아웃)
export default function Sidebar() {
  const { user } = useAuth()
  const devMode = useDevMode()
  const [accountOpen, setAccountOpen] = useState(false)
  const visible = MENU.filter(
    (m) => (m.soon || hasFeature(user, m.feature)) && devVisible(m, devMode),
  )

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
        <NavLink to="/" end className={navClass(false)}>
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
                  <NavLink key={m.key} to={m.path} className={navClass(m.dev)}>
                    <Icon name={m.icon} size={18} />
                    {m.label}
                  </NavLink>
                ),
              )}
            </div>
          )
        })}
      </nav>

      <button
        type="button"
        className={styles.me}
        onClick={() => setAccountOpen(true)}
        title="내 계정 · 개발자 모드 · 로그아웃"
      >
        <span className={styles.avatar}>{user.name?.[0] || '?'}</span>
        <span className={styles.meText}>
          <b>{user.name}</b>
          <small>
            {ROLE_LABEL[user.role]}
            {devMode && <span className={styles.devTag}> · 개발자 모드</span>}
          </small>
        </span>
        <Icon name="more" size={18} />
      </button>
      {accountOpen && <AccountModal onClose={() => setAccountOpen(false)} />}
    </aside>
  )
}
