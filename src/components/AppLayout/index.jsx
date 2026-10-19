import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { findScreen } from '@/constants/screenConst'
import { ScreenContext } from '@/contexts/ScreenContext'
import Sidebar from './Sidebar'
import TabBar from './TabBar'
import Topbar from './Topbar'
import styles from './AppLayout.module.css'

// 로그인 후 모든 화면의 공통 틀 — 왼쪽 메뉴 · 위쪽 바 · (모바일) 아래 탭 (DESIGN.md §4.5)
export default function AppLayout() {
  const { pathname } = useLocation()
  const screen = findScreen(pathname)

  // 화면을 옮기면 맨 위부터 보이게
  useEffect(() => window.scrollTo(0, 0), [pathname])

  return (
    <ScreenContext.Provider value={screen}>
      <div className={styles.shell}>
        <Sidebar />
        <div className={styles.main}>
          <Topbar screen={screen} />
          {/* 화면 코드를 받는 동안에도 틀은 그대로 둔다 */}
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </div>
        <TabBar />
      </div>
    </ScreenContext.Provider>
  )
}
