import PageTabs from '@/components/common/PageTabs'

// 배송 › 탭 — 배송비 / 출고지·반품지
export default function ShippingTabs() {
  return (
    <PageTabs
      items={[
        { to: '/shipping', label: '배송비', end: true },
        { to: '/shipping/addresses', label: '출고지·반품지' },
      ]}
    />
  )
}
