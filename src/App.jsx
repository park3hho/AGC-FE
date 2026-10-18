import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

// 라우트 단위 코드 스플리팅 (DESIGN.md §2)
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const HomePage = lazy(() => import('@/pages/home/HomePage'))
const ResearchListPage = lazy(() => import('@/pages/research/ResearchListPage'))
const ResearchNewPage = lazy(() => import('@/pages/research/ResearchNewPage'))
const ResearchDetailPage = lazy(() => import('@/pages/research/ResearchDetailPage'))

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/research" element={<ResearchListPage />} />
        <Route path="/research/new" element={<ResearchNewPage />} />
        <Route path="/research/:id" element={<ResearchDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
