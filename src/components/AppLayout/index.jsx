import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { findScreen } from '@/constants/screenConst'
import { ScreenContext } from '@/contexts/ScreenContext'
import ErrorBoundary from '@/components/ErrorBoundary'
import Sidebar from './Sidebar'
import TabBar from './TabBar'
import Topbar from './Topbar'
import styles from './AppLayout.module.css'

// 로그인 후 모든 화면의 공통 틀 — 왼쪽 메뉴 · 위쪽 바 · (모바일) 아래 탭 (DESIGN.md §4.5)
export default function AppLayout() {
  const { pathname } = useLocation()
  const screen = findScreen(pathname)

  // 화면을 옮기면 맨 위부터 보이게
  // ★ 중괄호 필수 — 최신 Chrome 은 scrollTo 가 Promise 를 돌려주는데, 그걸 반환하면
  //   React 가 정리 함수로 부르다 죽어서 화면이 하얗게 된다 (2026-10-20 장애)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <ScreenContext.Provider value={screen}>
      <div className={styles.shell}>
        <Sidebar />
        <div className={styles.main}>
          <Topbar screen={screen} />
          {/* 화면 코드를 받는 동안에도 틀은 그대로 둔다 */}
          <ErrorBoundary key={pathname}>
            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
        <TabBar />
      </div>
    </ScreenContext.Provider>
  )
}
