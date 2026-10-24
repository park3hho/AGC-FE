import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import AccountModal from '@/components/AccountModal'
import Icon from '@/components/Icon'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { MENU, MENU_GROUPS } from '@/constants/menuConst'
import { hasFeature, ROLE_LABEL } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import { devVisible, useDevMode } from '@/hooks/useDevMode'
import styles from './MorePage.module.css'

// 더보기 (모바일 아래 탭) — 섹션: 메뉴 · 내 계정
// 한 화면에 다 들어가게 메뉴는 묶음별 타일 격자로 (DESIGN.md §4.4 — 스크롤 대신 줄이기)
export default function MorePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const devMode = useDevMode()
  const [accountOpen, setAccountOpen] = useState(false)
  const items = MENU.filter(
    (m) => (m.soon || hasFeature(user, m.feature)) && devVisible(m, devMode),
  )

  return (
    <main className="page-flat">
      <PageHeader title="더보기" />

      <Section name="메뉴" id="menu" title={false} fill>
        {MENU_GROUPS.map((g) => {
          const list = items.filter((m) => m.group === g.key)
          if (!list.length) return null
          return (
            <div key={g.key} className={styles.group}>
              <div className={styles.groupLabel}>{g.label}</div>
              <div className={styles.grid}>
                {list.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    className={`${styles.tile} ${m.dev ? styles.dev : ''}`}
                    disabled={m.soon}
                    onClick={() => navigate(m.path)}
                  >
                    <span className={styles.icon}>
                      <Icon name={m.icon} size={20} />
                    </span>
                    <span className={styles.label}>{m.label}</span>
                    {m.soon && <small className={styles.soon}>준비 중</small>}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </Section>

      <Section name="내 계정" id="me" title={false} plain>
        <div className={styles.me}>
          <span>
            <b>{user.name}</b> · {ROLE_LABEL[user.role]}
          </span>
          <button className="btn-secondary btn-sm" onClick={() => setAccountOpen(true)}>
            내 계정
          </button>
        </div>
      </Section>
      {accountOpen && <AccountModal onClose={() => setAccountOpen(false)} />}
    </main>
  )
}
