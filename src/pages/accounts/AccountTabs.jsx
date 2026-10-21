import { NavLink } from 'react-router-dom'

import styles from './Accounts.module.css'

// 회사 계정 › 탭 — 로그인 계정 / API 키 (화면 머리 제목 옆)
export default function AccountTabs() {
  const cls = ({ isActive }) => `${styles.tab} ${isActive ? styles.tabOn : ''}`
  return (
    <span className={styles.tabs} role="tablist">
      <NavLink to="/accounts" end className={cls} role="tab">
        로그인 계정
      </NavLink>
      <NavLink to="/accounts/api-keys" className={cls} role="tab">
        API 키
      </NavLink>
    </span>
  )
}
