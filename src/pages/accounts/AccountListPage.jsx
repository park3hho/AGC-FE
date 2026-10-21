import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { deleteCompanyAccount, getCompanyAccounts, revealPassword } from '@/api/companyAccount'
import PageHeader from '@/components/common/PageHeader'
import Pager from '@/components/common/Pager'
import Section from '@/components/common/Section'
import { USAGES } from '@/constants/accountConst'
import { FEATURE, hasFeature } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import { useFitRows } from '@/hooks/useFitRows'
import AccountTabs from './AccountTabs'
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

// 홈페이지 표시 — 주소 전체 대신 도메인만 (www. 제외)
const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// 계정 1줄 — 데스크탑: 한 줄 (플랫폼 · 홈페이지 · ID · PW · 용도 · 수정/삭제), 모바일: 세로로 쌓기
function AccountCard({
  account, // object: 회사 계정 (비밀번호 제외)
  canEdit, // boolean: 수정·삭제 권한 (account_edit)
  onEdit, // function: 수정 화면으로
  onDeleted, // function(id): 삭제됐을 때
}) {
  const [password, setPassword] = useState('') // 보기 누를 때만 받아온다
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const remove = async () => {
    if (!window.confirm(`${account.platform} (${account.loginId}) 계정을 삭제할까요?`)) return
    setDeleting(true)
    try {
      await deleteCompanyAccount(account.id)
      onDeleted(account.id)
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

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
      <div className={styles.site}>
        {account.url ? (
          <a href={account.url} target="_blank" rel="noreferrer" title={account.url}>
            {hostOf(account.url)} ↗
          </a>
        ) : (
          <span className={styles.none}>-</span>
        )}
      </div>
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
      <div className={styles.tags}>
        {account.usages.map((u) => (
          <span key={u} className={styles.tag}>
            {u}
          </span>
        ))}
      </div>
      {canEdit && (
        <div className={styles.actions}>
          <button type="button" className="btn-secondary btn-sm" onClick={onEdit}>
            수정
          </button>
          <button
            type="button"
            className={`btn-ghost btn-sm ${styles.danger}`}
            onClick={remove}
            disabled={deleting}
          >
            삭제
          </button>
        </div>
      )}
      {error && <p className={`form-error ${styles.cardError}`}>{error}</p>}
    </div>
  )
}

// 회사 계정 — 섹션: 필터 · 계정 목록. 목록은 남은 높이에 맞춘 페이지 넘김 (DESIGN.md §4.4)
export default function AccountListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState(null)
  const [usage, setUsage] = useState('')
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const listRef = useRef(null)
  const pageSize = useFitRows(listRef, { fallback: 64 })
  const canEdit = hasFeature(user, FEATURE.ACCOUNT_EDIT)

  useEffect(() => {
    getCompanyAccounts()
      .then(setItems)
      .catch((err) => setError(err.message))
  }, [])

  const visible = (items || []).filter((a) => !usage || a.usages.includes(usage))
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize))
  const current = Math.min(page, pageCount)
  const rows = visible.slice((current - 1) * pageSize, current * pageSize)

  return (
    <main className="page-flat">
      <PageHeader
        title="회사 계정"
        sub={<AccountTabs />}
        back
        action={
          canEdit && (
            <button className="btn-primary btn-md" onClick={() => navigate('/accounts/new')}>
              계정 추가
            </button>
          )
        }
      />

      <Section name="필터" id="filters" title={false} plain>
        <select
          className={styles.filter}
          value={usage}
          onChange={(e) => {
            setUsage(e.target.value)
            setPage(1)
          }}
        >
          <option value="">전체 용도</option>
          {USAGES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </Section>

      <Section
        name="계정 목록"
        id="list"
        sub={items && `${visible.length}개`}
        flush
        fill
        bodyRef={listRef}
        footer={
          <Pager
            page={current}
            pageCount={pageCount}
            total={items ? visible.length : null}
            onChange={setPage}
          />
        }
      >
        {error && <p className={`form-error ${styles.msg}`}>{error}</p>}
        {items && visible.length === 0 && (
          <p className={styles.empty}>
            {items.length === 0 ? '아직 계정이 없어요' : '이 용도의 계정이 없어요'}
          </p>
        )}
        <div className={styles.list} data-fit-list>
          {rows.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              canEdit={canEdit}
              onEdit={() => navigate(`/accounts/${a.id}/edit`)}
              onDeleted={(id) => setItems((list) => list.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      </Section>
    </main>
  )
}
