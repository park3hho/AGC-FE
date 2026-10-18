import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const { user, checking, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (checking) return null
  if (user) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) return setError('아이디와 비밀번호를 모두 적어주세요')

    setSubmitting(true)
    try {
      await login({ username: username.trim(), password, remember })
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  const clearError = (setter) => (e) => {
    setter(e.target.value)
    setError('')
  }

  return (
    <form className="page-flat" onSubmit={submit}>
      <div className={styles.head}>
        <h1>AGC</h1>
        <p className={styles.sub}>회사 계정으로 들어와 주세요</p>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="username">
          아이디
        </label>
        <input id="username" className="form-input" autoComplete="username" value={username} onChange={clearError(setUsername)} />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">
          비밀번호
        </label>
        <input id="password" className="form-input" type="password" autoComplete="current-password" value={password} onChange={clearError(setPassword)} />
      </div>

      <label className={styles.remember}>
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        로그인 유지 (7일)
      </label>

      {error && <p className="form-error">{error}</p>}

      <div className="sticky-cta">
        <button className="btn-primary btn-lg btn-full" type="submit" disabled={submitting}>
          로그인
        </button>
      </div>
    </form>
  )
}
