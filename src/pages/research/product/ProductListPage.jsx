import { useNavigate } from 'react-router-dom'

import ProductBrowser from '@/components/ProductBrowser'
import PageHeader from '@/components/common/PageHeader'

// 제품조사 — 섹션: 검색·필터 · 제품 목록 (ProductBrowser)
export default function ProductListPage() {
  const navigate = useNavigate()

  return (
    <main className="page-flat">
      <PageHeader
        title="제품조사"
        sub="타오바오에서 찾은 제품"
        action={
          <button className="btn-primary btn-md" onClick={() => navigate('/research/products/new')}>
            제품 추가
          </button>
        }
      />
      <ProductBrowser onOpen={(p) => navigate(`/research/products/${p.id}`)} />
    </main>
  )
}
