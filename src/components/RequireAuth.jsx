import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { hasFeature } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'

// 로그인 필요 라우트. feature 를 주면 권한까지 확인한다.
// FE 숨김은 편의일 뿐 — BE 도 같은 feature 로 막아야 한다 (DESIGN.md §5).
export default function RequireAuth({
  feature, // string?: FEATURE 값
}) {
  const { user, checking } = useAuth()
  const location = useLocation()

  if (checking) return null
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (feature && !hasFeature(user, feature)) return <Navigate to="/" replace />
  return <Outlet />
}
