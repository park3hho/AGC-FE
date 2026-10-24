import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { ROLE_LABEL } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import { setDevMode, useDevMode } from '@/hooks/useDevMode'
import styles from './AccountModal.module.css'

// 공통 › 내 계정 — 왼쪽 메뉴 아래(모바일은 더보기 › 내 계정)를 누르면 뜬다. 개발자 모드 · 로그아웃
export default function AccountModal({
  onClose, // function: 닫기
}) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const devMode = useDevMode()

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const out = async () => {
    onClose()
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="내 계정"
        data-section="공통 › 내 계정"
      >
        <div className={styles.head}>
          <span className={styles.avatar}>{user.name?.[0] || '?'}</span>
          <span className={styles.who}>
            <b>{user.name}</b>
            <small>
              {ROLE_LABEL[user.role]}
              {user.username && ` · ${user.username}`}
            </small>
          </span>
          <button type="button" className={styles.close} aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </div>

        <label className={styles.row}>
          <span className={styles.rowText}>
            <b>개발자 모드</b>
            <small>
              개발용 메뉴를 왼쪽 메뉴에 <span className={styles.devWord}>보라색 글씨</span>로
              보여줘요. 이 브라우저에만 저장돼요.
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            className={styles.switch}
            checked={devMode}
            onChange={(e) => setDevMode(e.target.checked)}
          />
        </label>

        <button
          type="button"
          className={`btn-secondary btn-md btn-full ${styles.logout}`}
          onClick={out}
        >
          로그아웃
        </button>
      </div>
    </>
  )
}
