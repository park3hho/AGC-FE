import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import { getDetailPages } from '@/api/detailPage'
import { getOrders } from '@/api/order'
import Icon from '@/components/Icon'
import { MENU } from '@/constants/menuConst'
import { FEATURE, hasFeature } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import { devVisible, useDevMode } from '@/hooks/useDevMode'
import { useMobile } from '@/hooks/useMobile'
import styles from './AppLayout.module.css'

const tabClass = ({ isActive }) => `${styles.tab} ${isActive ? styles.tabOn : ''}`
const REFRESH_MS = 3 * 60 * 1000 // 3분마다 · 화면을 옮길 때마다 숫자를 다시 읽는다

// 탭 위 숫자 — 주문: 접수 단계 주문 수(빨강) · 디자인: 검수 대기(주황). 모바일에서만 읽는다
function useTabCounts(user, mobile) {
  const { pathname } = useLocation()
  const [counts, setCounts] = useState({})
  useEffect(() => {
    if (!mobile) return undefined
    let alive = true
    const load = async () => {
      const next = {}
      if (hasFeature(user, FEATURE.ORDER)) {
        next.orders = await getOrders({ stage: 'received', size: 1 })
          .then((d) => d.total)
          .catch(() => null)
      }
      if (hasFeature(user, FEATURE.RESEARCH)) {
        next.design = await getDetailPages()
          .then((d) => d.counts?.review ?? null)
          .catch(() => null)
      }
      if (alive) setCounts(next)
    }
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
    // 화면을 옮길 때 다시 — 주문을 처리하고 돌아오면 숫자가 줄어 있게
  }, [user, mobile, pathname])
  return counts
}

// 공통 › 아래 탭 — 모바일·태블릿에서만 보임. 홈 · 주문 · 디자인 · 제품 · 더보기 (menuConst 의 tab 숫자 순서)
export default function TabBar() {
  const { user } = useAuth()
  const devMode = useDevMode()
  const mobile = useMobile()
  const counts = useTabCounts(user, mobile)
  const tabs = MENU.filter(
    (m) => m.tab && hasFeature(user, m.feature) && devVisible(m, devMode),
  ).sort((a, b) => Number(a.tab) - Number(b.tab))

  return (
    <nav className={styles.tabbar} data-section="공통 › 아래 탭">
      <NavLink to="/" end className={tabClass}>
        <Icon name="home" size={22} />홈
      </NavLink>
      {tabs.map((m) => {
        const n = counts[m.key === 'orders' ? 'orders' : m.key === 'design' ? 'design' : '_']
        return (
          <NavLink key={m.key} to={m.path} className={tabClass}>
            <Icon name={m.icon} size={22} />
            {m.tabLabel || m.label}
            {n > 0 && (
              <em className={`${styles.tabCount} ${m.key === 'design' ? styles.tabCountWarn : ''}`}>
                {n > 99 ? '99+' : n}
              </em>
            )}
          </NavLink>
        )
      })}
      <NavLink to="/more" className={tabClass}>
        <Icon name="more" size={22} />
        더보기
      </NavLink>
    </nav>
  )
}
