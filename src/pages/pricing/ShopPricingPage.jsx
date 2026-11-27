import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import PricingTabs from './PricingTabs'

// 가격 책정 › 자사몰 판매 — 자사몰(eidofood.com) 판매가 정하는 화면. 아직 비워 둠 (2026-11-25 사용자 "우선 비워놔")
export default function ShopPricingPage() {
  return (
    <main className="page-flat">
      <PageHeader title="가격 책정" sub={<PricingTabs />} />
      <Section name="자사몰 판매" id="shop" title={false}>
        <p style={{ color: 'var(--color-text-sub)', fontSize: 13, margin: 0 }}>준비 중이에요.</p>
      </Section>
    </main>
  )
}
