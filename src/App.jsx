import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import AppLayout from '@/components/AppLayout'
import RequireAuth from '@/components/RequireAuth'
import { FEATURE } from '@/constants/permissions'

// 라우트 단위 코드 스플리팅 (DESIGN.md §2)
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const HomePage = lazy(() => import('@/pages/home/HomePage'))
const MorePage = lazy(() => import('@/pages/more/MorePage'))
const ProductListPage = lazy(() => import('@/pages/research/product/ProductListPage'))
const ProductNewPage = lazy(() => import('@/pages/research/product/ProductNewPage'))
const PriceListPage = lazy(() => import('@/pages/research/price/PriceListPage'))
const PriceNewPage = lazy(() => import('@/pages/research/price/PriceNewPage'))
const ProductDetailPage = lazy(() => import('@/pages/research/product/ProductDetailPage'))
const PriceDetailPage = lazy(() => import('@/pages/research/price/PriceDetailPage'))
const PricingListPage = lazy(() => import('@/pages/pricing/PricingListPage'))
const PricingPage = lazy(() => import('@/pages/pricing/PricingPage'))
const DesignListPage = lazy(() => import('@/pages/design/DesignListPage'))
const ProductsPage = lazy(() => import('@/pages/products/ProductsPage'))
const ProductOverviewPage = lazy(() => import('@/pages/products/ProductOverviewPage'))
const DesignEditPage = lazy(() => import('@/pages/design/DesignEditPage'))
const ShippingFeePage = lazy(() => import('@/pages/pricing/ShippingFeePage'))
const ExchangeRatePage = lazy(() => import('@/pages/pricing/ExchangeRatePage'))
const MarketsPage = lazy(() => import('@/pages/markets/MarketsPage'))
const PlaybooksPage = lazy(() => import('@/pages/playbooks/PlaybooksPage'))
const CompanyInfoPage = lazy(() => import('@/pages/accounts/CompanyInfoPage'))
const CompanyInfoFormPage = lazy(() => import('@/pages/accounts/CompanyInfoFormPage'))
const AccountListPage = lazy(() => import('@/pages/accounts/AccountListPage'))
const AccountFormPage = lazy(() => import('@/pages/accounts/AccountFormPage'))
const ApiKeyListPage = lazy(() => import('@/pages/accounts/ApiKeyListPage'))
const ApiKeyFormPage = lazy(() => import('@/pages/accounts/ApiKeyFormPage'))
const ShippingAddressPage = lazy(() => import('@/pages/shipping/ShippingAddressPage'))
const OrderReceivePage = lazy(() => import('@/pages/orders/OrderReceivePage'))
const PurchaseListPage = lazy(() => import('@/pages/purchases/PurchaseListPage'))
const PurchaseFormPage = lazy(() => import('@/pages/orders/PurchaseFormPage'))
const JiyunListPage = lazy(() => import('@/pages/jiyun/JiyunListPage'))
const JiyunFormPage = lazy(() => import('@/pages/jiyun/JiyunFormPage'))
const ShippingAddressFormPage = lazy(() => import('@/pages/shipping/ShippingAddressFormPage'))
const UserListPage = lazy(() => import('@/pages/admin/users/UserListPage'))
const UserNewPage = lazy(() => import('@/pages/admin/users/UserNewPage'))

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* 로그인 후 화면은 모두 공통 틀(AppLayout) 안 — DESIGN.md §4.5 */}
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/more" element={<MorePage />} />
            <Route element={<RequireAuth feature={FEATURE.RESEARCH} />}>
              <Route path="/research/products" element={<ProductListPage />} />
              <Route path="/research/products/new" element={<ProductNewPage />} />
              <Route path="/research/products/:id" element={<ProductDetailPage />} />
              <Route path="/research/prices" element={<PriceListPage />} />
              <Route path="/research/prices/new" element={<PriceNewPage />} />
              <Route path="/research/prices/:id" element={<PriceDetailPage />} />
              <Route path="/pricing" element={<PricingListPage />} />
              <Route path="/pricing/:productId" element={<PricingPage />} />
              <Route path="/design" element={<DesignListPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:productId" element={<ProductOverviewPage />} />
              <Route path="/design/:productId" element={<DesignEditPage />} />
              <Route path="/shipping" element={<ShippingFeePage />} />
              <Route path="/shipping/addresses" element={<ShippingAddressPage />} />
              <Route path="/orders" element={<OrderReceivePage />} />
              <Route path="/purchases" element={<PurchaseListPage />} />
              <Route path="/orders/:orderId/purchases/new" element={<PurchaseFormPage />} />
              <Route path="/orders/purchases/:id/edit" element={<PurchaseFormPage />} />
              <Route path="/jiyun" element={<JiyunListPage />} />
              <Route path="/orders/:orderId/jiyun/new" element={<JiyunFormPage />} />
              <Route path="/orders/jiyun/:id/edit" element={<JiyunFormPage />} />
              <Route path="/shipping/addresses/edit" element={<ShippingAddressFormPage />} />
              <Route path="/exchange-rate" element={<ExchangeRatePage />} />
              <Route path="/markets" element={<MarketsPage />} />
            <Route path="/playbooks" element={<PlaybooksPage />} />
            </Route>

            <Route element={<RequireAuth feature={FEATURE.ACCOUNT_VIEW} />}>
              <Route path="/accounts" element={<CompanyInfoPage />} />
              <Route path="/accounts/logins" element={<AccountListPage />} />
              <Route path="/accounts/api-keys" element={<ApiKeyListPage />} />
            </Route>
            <Route element={<RequireAuth feature={FEATURE.ACCOUNT_EDIT} />}>
              <Route path="/accounts/info/new" element={<CompanyInfoFormPage />} />
              <Route path="/accounts/info/:id/edit" element={<CompanyInfoFormPage />} />
              <Route path="/accounts/logins/new" element={<AccountFormPage />} />
              <Route path="/accounts/logins/:id/edit" element={<AccountFormPage />} />
              <Route path="/accounts/api-keys/new" element={<ApiKeyFormPage />} />
              <Route path="/accounts/api-keys/:id/edit" element={<ApiKeyFormPage />} />
            </Route>

            <Route element={<RequireAuth feature={FEATURE.USER_MANAGE} />}>
              <Route path="/admin/users" element={<UserListPage />} />
              <Route path="/admin/users/new" element={<UserNewPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
