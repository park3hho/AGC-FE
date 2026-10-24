import { NavLink } from 'react-router-dom'

import Icon from '@/components/Icon'
import { MENU } from '@/constants/menuConst'
import { hasFeature } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import { devVisible, useDevMode } from '@/hooks/useDevMode'
import styles from './AppLayout.module.css'

const tabClass = ({ isActive }) => `${styles.tab} ${isActive ? styles.tabOn : ''}`

// 공통 › 아래 탭 — 모바일·태블릿에서만 보임. 탭에 없는 메뉴는 '더보기'
export default function TabBar() {
  const { user } = useAuth()
  const devMode = useDevMode()
  const tabs = MENU.filter((m) => m.tab && hasFeature(user, m.feature) && devVisible(m, devMode))

  return (
    <nav className={styles.tabbar} data-section="공통 › 아래 탭">
      <NavLink to="/" end className={tabClass}>
        <Icon name="home" size={22} />홈
      </NavLink>
      {tabs.map((m) => (
        <NavLink key={m.key} to={m.path} className={tabClass}>
          <Icon name={m.icon} size={22} />
          {m.tabLabel || m.label}
        </NavLink>
      ))}
      <NavLink to="/more" className={tabClass}>
        <Icon name="more" size={22} />
        더보기
      </NavLink>
    </nav>
  )
}
