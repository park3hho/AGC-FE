import PageTabs from '@/components/common/PageTabs'

// 회사 정보 › 탭 — 기본 정보 / 로그인 계정 / API 키 (개념으로 나눈다: 만료일 유무로 나누지 않음)
export default function AccountTabs() {
  return (
    <PageTabs
      items={[
        { to: '/accounts', label: '기본 정보', end: true },
        { to: '/accounts/logins', label: '로그인 계정' },
        { to: '/accounts/api-keys', label: 'API 키' },
      ]}
    />
  )
}
