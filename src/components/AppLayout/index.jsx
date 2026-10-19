import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { findScreen } from '@/constants/screenConst'
import { ScreenContext } from '@/contexts/ScreenContext'
import ErrorBoundary from '@/components/ErrorBoundary'
import Sidebar from './Sidebar'
import TabBar from './TabBar'
import Topbar from './Topbar'
import styles from './AppLayout.module.css'

// 로그인 후 모든 화면의 공통 틀 — 왼쪽 메뉴 · 위쪽 바 · (모바일) 아래 탭 (DESIGN.md §4.5)
// 틀은 브라우저 창 높이에 고정 — 페이지 전체는 스크롤되지 않는다 (DESIGN.md §4.4).
// 화면(본문)은 content 안에서 남은 높이를 쓰고, 넘치면 fill 섹션 하나만 스크롤한다.
export default function AppLayout() {
  const { pathname } = useLocation()
  const screen = findScreen(pathname)

  return (
    <ScreenContext.Provider value={screen}>
      <div className={styles.shell}>
        <Sidebar />
        <div className={styles.main}>
          <Topbar screen={screen} />
          {/* 화면 코드를 받는 동안에도 틀은 그대로 둔다 */}
          <div className={styles.content}>
            <ErrorBoundary key={pathname}>
              <Suspense fallback={null}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
        <TabBar />
      </div>
    </ScreenContext.Provider>
  )
}
