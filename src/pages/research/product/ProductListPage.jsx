import { useNavigate } from 'react-router-dom'

import ProductBrowser from '@/components/ProductBrowser'
import PageHeader from '@/components/common/PageHeader'
import { RESEARCH_RULES, RESEARCH_RULES_UPDATED } from '@/constants/researchRules'

// 제품조사 — 섹션: 검색·필터 · 제품 목록 (ProductBrowser)
export default function ProductListPage() {
  const navigate = useNavigate()

  return (
    <main className="page-flat">
      <PageHeader
        title="제품조사"
        sub="타오바오에서 찾은 제품"
        info={{
          title: '리서치 규칙',
          updated: RESEARCH_RULES_UPDATED,
          source:
            '원문: 리서처 스킬 (.claude/skills/researcher/SKILL.md) — 규칙을 바꾸면 둘 다 고쳐요',
          sections: RESEARCH_RULES,
        }}
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
