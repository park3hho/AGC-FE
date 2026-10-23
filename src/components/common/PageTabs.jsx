import { NavLink } from 'react-router-dom'

import styles from './PageTabs.module.css'

// 화면 머리 탭 — 한 메뉴 안의 화면 묶음 (예: 회사 정보 › 기본 정보 / 로그인 계정 / API 키). PageHeader 의 sub 자리에 넣는다
export default function PageTabs({
  items, // Array<{ to: string, label: string, end?: boolean }>
}) {
  const cls = ({ isActive }) => `${styles.tab} ${isActive ? styles.on : ''}`
  return (
    <span className={styles.tabs} role="tablist">
      {items.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={cls} role="tab">
          {t.label}
        </NavLink>
      ))}
    </span>
  )
}
