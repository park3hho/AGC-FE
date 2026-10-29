import { useEffect, useState } from 'react'

import { getCompanyReminders, HQ_WEB_URL } from '@/api/hq'
import Badge from '@/components/Badge'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { keyStatuses } from '@/utils/apiKey'
import { infoStatus } from '@/utils/companyInfo'
import styles from './HqMoved.module.css'

// 회사 정보 → HQ 로 옮김 (2026-10-30). 기본 정보 · 로그인 계정 · API 키는 HQ(eido-hq)에서 보고 고친다.
// 여기서는 HQ 로 가는 길과, 지금 챙길 만료·재인증만 보여준다 (값·비밀번호는 HQ 에서만).
export default function HqMovedPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    getCompanyReminders()
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])
  const hq = data?.hqUrl || HQ_WEB_URL
  const rows = data
    ? [
        ...data.keys.flatMap((k) => keyStatuses(k).map((s) => ({ key: `k${k.id}${s.kind}`, name: `${k.service} (API 키)`, s }))),
        ...data.infos.map((i) => ({ key: `i${i.id}`, name: i.name, s: infoStatus(i) })).filter((r) => r.s),
      ]
    : []

  return (
    <main className="page-flat">
      <PageHeader title="회사 정보" sub="기본 정보 · 로그인 계정 · API 키는 HQ 에서 관리해요" />
      <Section
        name="회사 정보 › HQ"
        id="hq"
        action={
          <a className="btn-primary btn-sm" href={hq} target="_blank" rel="noreferrer">
            HQ 열기 ↗
          </a>
        }
      >
        <div className={styles.body}>
          <p>
            회사 정보의 정본을 <b>HQ</b>({hq.replace(/^https?:\/\//, '')})로 옮겼어요. 사업자·인허가 번호, 계좌, 서류, 로그인 계정
            비밀번호, 마켓 API 키는 HQ 에서 보고 고쳐요. HQ 는 따로 로그인해요.
          </p>
          <p className={styles.weak}>
            AGC 는 HQ 에서 필요한 값만 읽어 와요 — 주문 수집(네이버·쿠팡 API 키), 통관 조회(UNI-PASS), 상세페이지 등록번호.
          </p>
        </div>
      </Section>
      <Section name="회사 정보 › 만료·재인증" id="hq-dates" sub={data && !data.ok ? 'HQ 연결 안 됨' : `${rows.length}건`}>
        {error && <p className="form-error">{error}</p>}
        {data && !rows.length && <p className={styles.weak}>날짜가 정해진 항목이 없어요.</p>}
        <ul className={styles.list}>
          {rows.map((r) => (
            <li key={r.key}>
              <span>{r.name}</span>
              <Badge tone={r.s.tone}>{r.s.text}</Badge>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  )
}