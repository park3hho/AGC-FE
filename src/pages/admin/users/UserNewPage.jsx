import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { createUser } from '@/api/user'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { ROLE, ROLE_LABEL } from '@/constants/permissions'

export default function UserNewPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', username: '', password: '', role: ROLE.MEMBER })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value })
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.username.trim()) return setError('이름과 아이디를 적어주세요')
    if (form.password.length < 8) return setError('비밀번호는 8자 이상이에요')

    setSaving(true)
    try {
      await createUser({ ...form, name: form.name.trim(), username: form.username.trim() })
      navigate('/admin/users', { replace: true })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form className="page-flat" onSubmit={submit}>
      <PageHeader title="누구를 추가할까요?" back />

      <Section name="입력" id="form" title={false} fill>
        <div className="form-group">
          <label className="form-label" htmlFor="name">
            이름
          </label>
          <input
            id="name"
            className="form-input"
            value={form.name}
            onChange={set('name')}
            placeholder="홍길동"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="username">
            아이디
          </label>
          <input
            id="username"
            className="form-input"
            autoComplete="off"
            value={form.username}
            onChange={set('username')}
            placeholder="staff02"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">
            임시 비밀번호 (8자 이상)
          </label>
          <input
            id="password"
            className="form-input"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="role">
            역할
          </label>
          <select id="role" className="form-input" value={form.role} onChange={set('role')}>
            {Object.values(ROLE).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
      </Section>

      {error && <p className="form-error">{error}</p>}

      <div className="sticky-cta">
        <button className="btn-primary btn-lg btn-full" type="submit" disabled={saving}>
          사용자 추가
        </button>
      </div>
    </form>
  )
}
