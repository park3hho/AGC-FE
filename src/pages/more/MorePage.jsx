import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getExchangeRate } from '@/api/exchangeRate'
import AccountModal from '@/components/AccountModal'
import Icon from '@/components/Icon'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { MENU, MENU_GROUPS } from '@/constants/menuConst'
import { hasFeature, ROLE_LABEL } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import { devVisible, useDevMode } from '@/hooks/useDevMode'
import { formatFx } from '@/utils/pricing'
import styles from './MorePage.module.css'

// 더보기 (모바일 아래 탭) — 섹션: 메뉴 · 내 계정
// 2026-10-30 모바일 설계 §4.1: 아이콘 격자 → 업무 묶음별 한 줄 메뉴. 아래 탭에 있는 메뉴(주문·디자인·제품)는 빼고,
// 메뉴 옆에 작은 상태(환율 값)를 붙인다. 메뉴가 많으면 이 섹션 하나만 스크롤.
export default function MorePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const devMode = useDevMode()
  const [accountOpen, setAccountOpen] = useState(false)
  const [fx, setFx] = useState(null)
  useEffect(() => {
    getExchangeRate()
      .then((d) => setFx(d.current))
      .catch(() => setFx(null))
  }, [])
  const items = MENU.filter(
    (m) => !m.tab && (m.soon || hasFeature(user, m.feature)) && devVisible(m, devMode),
  )
  const subOf = (m) =>
    m.key === 'fx' || m.path === '/exchange-rate'
      ? fx && `1위안 = ${formatFx(fx.cnyKrw)}원${fx.date ? ` · ${fx.date}` : ''}`
      : m.soon
        ? '준비 중'
        : null

  return (
    <main className="page-flat">
      <PageHeader title="더보기" />

      <Section name="메뉴" id="menu" title={false} flush fill>
        {MENU_GROUPS.map((g) => {
          const list = items.filter((m) => m.group === g.key)
          if (!list.length) return null
          return (
            <div key={g.key}>
              <div className={styles.groupLabel}>{g.label}</div>
              {list.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className={`${styles.row} ${m.dev ? styles.dev : ''}`}
                  disabled={m.soon}
                  onClick={() => navigate(m.path)}
                >
                  <Icon name={m.icon} size={18} />
                  <span className={styles.label}>
                    {m.label}
                    {subOf(m) && <small>{subOf(m)}</small>}
                  </span>
                  <span className={styles.go}>›</span>
                </button>
              ))}
            </div>
          )
        })}
      </Section>

      <Section name="내 계정" id="me" title={false} flush>
        <button type="button" className={styles.row} onClick={() => setAccountOpen(true)}>
          <Icon name="users" size={18} />
          <span className={styles.label}>
            {user.name} · {ROLE_LABEL[user.role]}
            <small>화면 테마 · 개발자 모드 · 로그아웃</small>
          </span>
          <span className={styles.go}>›</span>
        </button>
      </Section>
      {accountOpen && <AccountModal onClose={() => setAccountOpen(false)} />}
    </main>
  )
}
