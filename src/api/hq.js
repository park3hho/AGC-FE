import { request } from '@/api/client'

// HQ (회사 정보 정본 — eido-hq) — 2026-10-30
// 회사 계정 · API 키 · 기본 정보는 HQ 에서 관리한다. AGC 는 홈 할 일에 쓸 만료·재인증 날짜만 BE 를 거쳐 읽는다.
export const HQ_WEB_URL = 'https://eido-hq.vercel.app'

export const getCompanyReminders = async () => {
  const d = await request('/company-reminders', { errorMsg: 'HQ 회사 정보를 불러오지 못했어요' })
  return {
    hqUrl: d.hq_url || HQ_WEB_URL,
    ok: d.ok !== false,
    keys: (d.api_credentials || []).map((c) => ({
      id: c.id,
      service: c.service,
      expiresOn: c.expires_on,
      reauthFrom: c.reauth_from,
      reauthTo: c.reauth_to,
    })),
    infos: (d.company_info || []).map((i) => ({
      id: i.id,
      category: i.category,
      name: i.name,
      expiresOn: i.expires_on,
      remind: i.remind !== false,
    })),
  }
}