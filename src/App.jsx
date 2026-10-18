import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

// 라우트 단위 코드 스플리팅 (DESIGN.md §2)
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const HomePage = lazy(() => import('@/pages/home/HomePage'))
const ResearchPage = lazy(() => import('@/pages/research/ResearchPage'))

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
