import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { deleteApiCredential, getApiCredentials, revealApiSecret } from '@/api/apiCredential'
import Badge from '@/components/Badge'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { FEATURE, hasFeature } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import { keyStatuses } from '@/utils/apiKey'
import AccountTabs from './AccountTabs'
import styles from './Accounts.module.css'
import { ShareTags } from './ShareServices'

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

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

// 비밀값 1줄 — 보기 누를 때만 받아온다 (열람 기록 남음)
function SecretRow({
  credentialId, // number: API 키 묶음 id
  secret, // { id, label }: 비밀값
  onError, // function(string): 오류 알림
}) {
  const [value, setValue] = useState('')
  const reveal = () => revealApiSecret(credentialId, secret.id)
  const toggle = async () => {
    if (value) return setValue('')
    try {
      setValue(await reveal())
    } catch (err) {
      onError(err.message)
    }
  }
  return (
    <div className={styles.kv}>
      <span className={styles.kvLabel}>{secret.label}</span>
      <span className={styles.value}>{value || '••••••••••••'}</span>
      <button type="button" className="btn-ghost btn-sm" onClick={toggle}>
        {value ? '가리기' : '보기'}
      </button>
      <CopyButton getText={() => value || reveal()} />
    </div>
  )
}

// API 키 1건 — 머리(서비스 · 홈페이지 · 만료/재인증 · 수정/삭제) + 공개값 · 비밀값 · 허용 IP · 메모
function KeyCard({
  item, // object: API 키 묶음 (비밀값은 이름만)
  canEdit, // boolean: 수정·삭제 권한
  onEdit, // function
  onDeleted, // function(id)
}) {
  const [error, setError] = useState('')
  const statuses = keyStatuses(item)

  const remove = async () => {
    if (!window.confirm(`${item.service} API 키를 삭제할까요?`)) return
    try {
      await deleteApiCredential(item.id)
      onDeleted(item.id)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className={styles.keyCard}>
      <div className={styles.keyHead}>
        <b className={styles.platform}>{item.service}</b>
        {item.url && (
          <a className={styles.site} href={item.url} target="_blank" rel="noreferrer">
            {hostOf(item.url)} ↗
          </a>
        )}
        <span className={styles.badges}>
          <ShareTags value={item.sharedWith} />
          {statuses.length === 0 && <Badge tone="neutral">만료일 없음</Badge>}
          {statuses.map((s) => (
            <Badge key={s.kind} tone={s.tone}>
              {s.text}
            </Badge>
          ))}
        </span>
        {canEdit && (
          <span className={styles.actions}>
            <button type="button" className="btn-secondary btn-sm" onClick={onEdit}>
              수정
            </button>
            <button type="button" className={`btn-ghost btn-sm ${styles.danger}`} onClick={remove}>
              삭제
            </button>
          </span>
        )}
      </div>

      <div className={styles.keyBody}>
        <div className={styles.keyCol}>
          {item.publicValues.map((p) => (
            <div key={p.label} className={styles.kv}>
              <span className={styles.kvLabel}>{p.label}</span>
              <span className={styles.value}>{p.value}</span>
              <CopyButton getText={() => p.value} />
            </div>
          ))}
          {item.secrets.map((s) => (
            <SecretRow key={s.id} credentialId={item.id} secret={s} onError={setError} />
          ))}
        </div>
        <div className={styles.keyCol}>
          <div className={styles.kv}>
            <span className={styles.kvLabel}>허용 IP</span>
            <span className={styles.value}>{item.allowedIps.join(', ') || '-'}</span>
          </div>
          {item.issuedOn && (
            <div className={styles.kv}>
              <span className={styles.kvLabel}>발급일</span>
              <span className={styles.value}>{item.issuedOn}</span>
            </div>
          )}
          {item.memo && <p className={styles.memo}>{item.memo}</p>}
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

// 회사 정보 › API 키 — 섹션: 키 목록. 키마다 만료·재인증 배지 (가까우면 홈 할 일에도 뜬다)
export default function ApiKeyListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canEdit = hasFeature(user, FEATURE.ACCOUNT_EDIT)
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getApiCredentials()
      .then(setItems)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <main className="page-flat">
      <PageHeader
        title="회사 정보"
        sub={<AccountTabs />}
        back
        action={
          canEdit && (
            <button
              className="btn-primary btn-md"
              onClick={() => navigate('/accounts/api-keys/new')}
            >
              API 키 추가
            </button>
          )
        }
      />

      <Section name="키 목록" id="list" sub={items && `${items.length}개`} flush fill>
        {error && <p className={`form-error ${styles.msg}`}>{error}</p>}
        {items && items.length === 0 && <p className={styles.empty}>아직 API 키가 없어요</p>}
        <div className={styles.list}>
          {(items || []).map((c) => (
            <KeyCard
              key={c.id}
              item={c}
              canEdit={canEdit}
              onEdit={() => navigate(`/accounts/api-keys/${c.id}/edit`)}
              onDeleted={(id) => setItems((list) => list.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      </Section>
    </main>
  )
}
