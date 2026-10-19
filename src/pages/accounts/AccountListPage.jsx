import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getCompanyAccounts, revealPassword } from '@/api/companyAccount'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { USAGES } from '@/constants/accountConst'
import { FEATURE, hasFeature } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import styles from './Accounts.module.css'

function CopyButton({
  getText, // function: () => Promise<string> | string
}) {
  const [done, setDone] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(await getText())
      setDone(true)
      setTimeout(() => setDone(false), 1200)
    } catch {
      // 클립보드 권한이 없으면 무시
    }
  }

  return (
    <button type="button" className="btn-secondary btn-sm" onClick={copy}>
      {done ? '복사됨' : '복사'}
    </button>
  )
}

function AccountCard({
  account, // object: 회사 계정 (비밀번호 제외)
}) {
  const [password, setPassword] = useState('') // 보기 누를 때만 받아온다

  const [error, setError] = useState('')

  const toggle = async () => {
    if (password) return setPassword('')
    try {
      setPassword(await revealPassword(account.id))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.platform}>{account.platform}</div>
      <div className={styles.field}>
        <span className={styles.key}>ID</span>
        <span className={styles.value}>{account.loginId}</span>
        <CopyButton getText={() => account.loginId} />
      </div>
      <div className={styles.field}>
        <span className={styles.key}>PW</span>
        <span className={styles.value}>{password || '••••••••'}</span>
        <button type="button" className="btn-ghost btn-sm" onClick={toggle}>
          {password ? '가리기' : '보기'}
        </button>
        <CopyButton getText={() => password || revealPassword(account.id)} />
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className={styles.tags}>
        {account.usages.map((u) => (
          <span key={u} className={styles.tag}>
            {u}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function AccountListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState(null)
  const [usage, setUsage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getCompanyAccounts()
      .then(setItems)
      .catch((err) => setError(err.message))
  }, [])

  const visible = (items || []).filter((a) => !usage || a.usages.includes(usage))

  return (
    <main className="page-flat">
      <PageHeader
        title="회사 계정"
        back
        action={
          hasFeature(user, FEATURE.ACCOUNT_EDIT) && (
            <button className="btn-primary btn-md" onClick={() => navigate('/accounts/new')}>
              계정 추가
            </button>
          )
        }
      />

      <Section name="필터" id="filters" title={false} plain>
        <select className={styles.filter} value={usage} onChange={(e) => setUsage(e.target.value)}>
          <option value="">전체 용도</option>
          {USAGES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </Section>

      <Section name="계정 목록" id="list" title={false} plain>
        {error && <p className="form-error">{error}</p>}
        {items && visible.length === 0 && <p className={styles.empty}>이 용도의 계정이 없어요</p>}
        {visible.map((a) => (
          <AccountCard key={a.id} account={a} />
        ))}
      </Section>
    </main>
  )
}
