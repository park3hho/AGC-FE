import { useNavigate } from 'react-router-dom'

import ProductBrowser from '@/components/ProductBrowser'
import PageHeader from '@/components/common/PageHeader'
import { PRICING_RULES, WORK_RULES_UPDATED } from '@/constants/workRules'

// 가격 책정 › 제품 고르기 — 섹션: 검색·필터 · 제품 목록. 처음엔 아직 안 정한 제품만 보여준다
export default function PricingListPage() {
  const navigate = useNavigate()

  return (
    <main className="page-flat">
      <PageHeader
        title="가격 책정"
        sub="쿠팡·네이버 판매가를 정할 제품을 골라요"
        info={{
          title: '가격 책정 규칙',
          updated: WORK_RULES_UPDATED,
          source: '원문: BE DESIGN.md §6.3 · docs/api-contract.md 가격 책정',
          sections: PRICING_RULES,
        }}
      />
      <ProductBrowser
        defaultStatus="todo"
        emptyText="아직 제품이 없어요"
        onOpen={(p) => navigate(`/pricing/${p.id}`)}
      />
    </main>
  )
}
