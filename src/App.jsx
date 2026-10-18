import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import RequireAuth from '@/components/RequireAuth'
import { FEATURE } from '@/constants/permissions'

// 라우트 단위 코드 스플리팅 (DESIGN.md §2)
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const HomePage = lazy(() => import('@/pages/home/HomePage'))
const ProductListPage = lazy(() => import('@/pages/research/product/ProductListPage'))
const ProductNewPage = lazy(() => import('@/pages/research/product/ProductNewPage'))
const PriceListPage = lazy(() => import('@/pages/research/price/PriceListPage'))
const PriceNewPage = lazy(() => import('@/pages/research/price/PriceNewPage'))
const ProductDetailPage = lazy(() => import('@/pages/research/product/ProductDetailPage'))
const PriceDetailPage = lazy(() => import('@/pages/research/price/PriceDetailPage'))
const PricingListPage = lazy(() => import('@/pages/pricing/PricingListPage'))
const PricingPage = lazy(() => import('@/pages/pricing/PricingPage'))
const AccountListPage = lazy(() => import('@/pages/accounts/AccountListPage'))
const AccountNewPage = lazy(() => import('@/pages/accounts/AccountNewPage'))
const UserListPage = lazy(() => import('@/pages/admin/users/UserListPage'))
const UserNewPage = lazy(() => import('@/pages/admin/users/UserNewPage'))

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/" element={<HomePage />} />
        </Route>

        <Route element={<RequireAuth feature={FEATURE.RESEARCH} />}>
          <Route path="/research/products" element={<ProductListPage />} />
          <Route path="/research/products/new" element={<ProductNewPage />} />
          <Route path="/research/products/:id" element={<ProductDetailPage />} />
          <Route path="/research/prices" element={<PriceListPage />} />
          <Route path="/research/prices/new" element={<PriceNewPage />} />
          <Route path="/research/prices/:id" element={<PriceDetailPage />} />
          <Route path="/pricing" element={<PricingListPage />} />
          <Route path="/pricing/:productId" element={<PricingPage />} />
        </Route>

        <Route element={<RequireAuth feature={FEATURE.ACCOUNT_VIEW} />}>
          <Route path="/accounts" element={<AccountListPage />} />
        </Route>
        <Route element={<RequireAuth feature={FEATURE.ACCOUNT_EDIT} />}>
          <Route path="/accounts/new" element={<AccountNewPage />} />
        </Route>

        <Route element={<RequireAuth feature={FEATURE.USER_MANAGE} />}>
          <Route path="/admin/users" element={<UserListPage />} />
          <Route path="/admin/users/new" element={<UserNewPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
