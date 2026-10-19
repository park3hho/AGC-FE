import { useNavigate } from 'react-router-dom'

import Icon from '@/components/Icon'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { MENU, MENU_GROUPS } from '@/constants/menuConst'
import { hasFeature, ROLE_LABEL } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import styles from './MorePage.module.css'

// 더보기 (모바일 아래 탭) — 섹션: 메뉴 · 내 계정
// 한 화면에 다 들어가게 메뉴는 묶음별 타일 격자로 (DESIGN.md §4.4 — 스크롤 대신 줄이기)
export default function MorePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const items = MENU.filter((m) => m.soon || hasFeature(user, m.feature))

  const out = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

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
                    className={styles.tile}
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
          <button className="btn-secondary btn-sm" onClick={out}>
            로그아웃
          </button>
        </div>
      </Section>
    </main>
  )
}
