import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { deleteCompanyInfo, getCompanyInfo } from '@/api/companyInfo'
import Badge from '@/components/Badge'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { FEATURE, hasFeature } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import { useScreen } from '@/hooks/useScreen'
import { groupByCategory, infoStatus } from '@/utils/companyInfo'
import AccountTabs from './AccountTabs'
import styles from './CompanyInfo.module.css'

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function CopyButton({
  text, // string: 복사할 값
}) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
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

// 기본 정보 1건 — 이름 · 배지 · 값(복사) · 세부 값 · 발급 · 서류 파일 · 메모
function InfoCard({
  item, // object: 기본 정보 1건
  linkLabel, // string?: 앱 연결 이름 (예: 상세페이지 S6 등록번호)
  canEdit, // boolean
  onEdit, // function
  onDeleted, // function(id)
}) {
  const [error, setError] = useState('')
  const status = infoStatus(item)
  const meta = [item.issuer, item.issuedOn && `발급 ${item.issuedOn}`].filter(Boolean)

  const remove = async () => {
    if (!window.confirm(`${item.name} 을(를) 삭제할까요?`)) return
    try {
      await deleteCompanyInfo(item.id)
      onDeleted(item.id)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <b className={styles.name}>{item.name}</b>
        {canEdit && (
          <span className={styles.actions}>
            <button type="button" className="btn-ghost btn-sm" onClick={onEdit}>
              수정
            </button>
            <button type="button" className={`btn-ghost btn-sm ${styles.danger}`} onClick={remove}>
              삭제
            </button>
          </span>
        )}
      </div>

      {(linkLabel || status) && (
        <div className={styles.badges}>
          {linkLabel && <Badge tone="primary">{linkLabel}</Badge>}
          {status && <Badge tone={status.tone}>{status.text}</Badge>}
        </div>
      )}

      {item.value && (
        <div className={styles.valueRow}>
          <span className={styles.value}>{item.value}</span>
          <CopyButton text={item.value} />
        </div>
      )}

      {item.details.length > 0 && (
        <dl className={styles.details}>
          {item.details.map((d) => (
            <div key={d.label} className={styles.detail}>
              <dt>{d.label}</dt>
              <dd>{d.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {(meta.length > 0 || item.url) && (
        <div className={styles.meta}>
          {meta.join(' · ')}
          {item.url && (
            <a href={item.url} target="_blank" rel="noreferrer">
              {hostOf(item.url)} ↗
            </a>
          )}
        </div>
      )}

      {item.files.length > 0 && (
        <div className={styles.files}>
          {item.files.map((f) => (
            <a key={f.id} className={styles.file} href={f.url} target="_blank" rel="noreferrer">
              {f.contentType === 'application/pdf' ? 'PDF' : '사진'} · {f.name}
            </a>
          ))}
        </div>
      )}

      {item.memo && <p className={styles.memo}>{item.memo}</p>}
      {error && <p className="form-error">{error}</p>}
    </article>
  )
}

// 회사 정보 › 기본 정보 — 섹션: 목록 (분류마다 묶음: '기본 정보 › 계좌' 처럼 부른다)
//   번호·계좌·연락처·서류처럼 로그인도 비밀값도 아닌 것. 값은 그대로 보인다.
export default function CompanyInfoPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const screen = useScreen()
  const canEdit = hasFeature(user, FEATURE.ACCOUNT_EDIT)
  const [data, setData] = useState(null) // { items, links }
  const [error, setError] = useState('')
  const groupRefs = useRef({})

  useEffect(() => {
    getCompanyInfo()
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  const groups = data ? groupByCategory(data.items) : []
  const linkLabel = Object.fromEntries((data?.links || []).map((l) => [l.key, l.usedBy]))
  const jump = (category) =>
    groupRefs.current[category]?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <main className="page-flat">
      <PageHeader
        title="회사 정보"
        sub={<AccountTabs />}
        back
        action={
          canEdit && (
            <button className="btn-primary btn-md" onClick={() => navigate('/accounts/info/new')}>
              정보 추가
            </button>
          )
        }
      />

      <Section name="목록" id="list" title={false} flush fill>
        {error && <p className={`form-error ${styles.msg}`}>{error}</p>}
        {data && data.items.length === 0 && (
          <p className={styles.empty}>
            아직 기본 정보가 없어요. 사업자등록번호 · 인허가 번호 · 계좌 · 서류를 넣어 두세요
          </p>
        )}
        {groups.length > 1 && (
          <nav className={styles.jump} aria-label="분류로 이동">
            {groups.map((g) => (
              <button
                key={g.category}
                type="button"
                className={styles.jumpBtn}
                onClick={() => jump(g.category)}
              >
                {g.category} <small>{g.items.length}</small>
              </button>
            ))}
          </nav>
        )}
        {groups.map((g) => (
          <div
            key={g.category}
            ref={(el) => (groupRefs.current[g.category] = el)}
            className={styles.group}
            data-section={screen.name ? `${screen.name} › ${g.category}` : g.category}
          >
            <h3 className={styles.groupTitle}>
              {g.category} <small>{g.items.length}</small>
            </h3>
            <div className={styles.grid}>
              {g.items.map((i) => (
                <InfoCard
                  key={i.id}
                  item={i}
                  linkLabel={i.link ? linkLabel[i.link] : ''}
                  canEdit={canEdit}
                  onEdit={() => navigate(`/accounts/info/${i.id}/edit`)}
                  onDeleted={(id) =>
                    setData((d) => ({ ...d, items: d.items.filter((x) => x.id !== id) }))
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </Section>
    </main>
  )
}
