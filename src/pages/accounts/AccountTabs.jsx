import PageTabs from '@/components/common/PageTabs'

// 회사 계정 › 탭 — 로그인 계정 / API 키
export default function AccountTabs() {
  return (
    <PageTabs
      items={[
        { to: '/accounts', label: '로그인 계정', end: true },
        { to: '/accounts/api-keys', label: 'API 키' },
      ]}
    />
  )
}
