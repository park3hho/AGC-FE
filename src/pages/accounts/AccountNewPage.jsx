import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { createCompanyAccount } from '@/api/companyAccount'
import PageHeader from '@/components/common/PageHeader'
import { PLATFORMS, USAGES } from '@/constants/accountConst'
import styles from './Accounts.module.css'

export default function AccountNewPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ platform: '', loginId: '', password: '' })
  const [usages, setUsages] = useState([])
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value })
    setError('')
  }

  const toggleUsage = (u) => {
    setUsages(usages.includes(u) ? usages.filter((x) => x !== u) : [...usages, u])
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.platform) return setError('어떤 플랫폼인지 골라주세요')
    if (!form.loginId.trim()) return setError('ID를 알려주세요')
    if (!form.password) return setError('PW를 알려주세요')
    if (usages.length === 0) return setError('용도를 하나 이상 골라주세요')

    setSaving(true)
    try {
      await createCompanyAccount({ ...form, loginId: form.loginId.trim(), usages })
      navigate('/accounts', { replace: true })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form className="page-flat" onSubmit={submit}>
      <PageHeader title="어떤 계정인가요?" back />

      <div className="form-group">
        <label className="form-label" htmlFor="platform">
          플랫폼
        </label>
        <select id="platform" className="form-input" value={form.platform} onChange={set('platform')}>
          <option value="">플랫폼을 골라주세요</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="loginId">
          ID
        </label>
        <input id="loginId" className="form-input" autoComplete="off" value={form.loginId} onChange={set('loginId')} />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">
          PW
        </label>
        <div className={styles.pwRow}>
          <input
            id="password"
            className="form-input"
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
          />
          <button type="button" className="btn-secondary btn-md" onClick={() => setShowPw(!showPw)}>
            {showPw ? '가리기' : '보기'}
          </button>
        </div>
      </div>

      <div className="form-group">
        <span className="form-label">용도 (여러 개 가능)</span>
        <div className={styles.usages}>
          {USAGES.map((u) => (
            <label key={u} className={styles.usage}>
              <input type="checkbox" checked={usages.includes(u)} onChange={() => toggleUsage(u)} />
              {u}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="sticky-cta">
        <button className="btn-primary btn-lg btn-full" type="submit" disabled={saving}>
          계정 저장
        </button>
      </div>
    </form>
  )
}
