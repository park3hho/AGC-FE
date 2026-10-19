import { useNavigate } from 'react-router-dom'

import Icon from '@/components/Icon'
import ListItem from '@/components/common/ListItem'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { MENU, MENU_GROUPS } from '@/constants/menuConst'
import { hasFeature, ROLE_LABEL } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import styles from './MorePage.module.css'

// 더보기 (모바일 아래 탭) — 섹션: 메뉴 · 내 계정
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

      <Section name="메뉴" id="menu" title={false} flush>
        <div className={styles.list}>
          {MENU_GROUPS.map((g) => {
            const list = items.filter((m) => m.group === g.key)
            if (!list.length) return null
            return (
              <div key={g.key}>
                <div className={styles.group}>{g.label}</div>
                {list.map((m) => (
                  <ListItem
                    key={m.key}
                    left={
                      <span className={styles.icon}>
                        <Icon name={m.icon} size={20} />
                      </span>
                    }
                    title={m.label}
                    right={m.soon ? '준비 중' : <Icon name="arrowRight" size={16} />}
                    disabled={m.soon}
                    onClick={() => navigate(m.path)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </Section>

      <Section name="내 계정" id="me" title={false}>
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
