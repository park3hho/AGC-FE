import PageTabs from '@/components/common/PageTabs'

// 가격 책정 › 탭 — 플랫폼 판매(쿠팡·네이버) / 자사몰 판매 (2026-11-25 사용자)
export default function PricingTabs() {
  return (
    <PageTabs
      items={[
        { to: '/pricing', label: '플랫폼 판매', end: true },
        { to: '/pricing/shop', label: '자사몰 판매' },
      ]}
    />
  )
}
