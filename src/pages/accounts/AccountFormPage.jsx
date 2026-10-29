import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { createCompanyAccount, getCompanyAccount, updateCompanyAccount } from '@/api/companyAccount'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { PLATFORM_SUGGESTIONS, USAGES } from '@/constants/accountConst'
import styles from './Accounts.module.css'

const EMPTY = { platform: '', url: '', loginId: '', password: '', memo: '' }

// 회사 정보 › 로그인 계정 추가 · 수정 — 섹션: 입력 (저장 버튼은 섹션 아래 고정)
// 플랫폼은 자유 입력 (제안 목록은 자동완성일 뿐). 수정에서 PW 는 바꿀 때만 입력한다.
export default function AccountFormPage() {
  const { id } = useParams()
  const editing = id != null
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [usages, setUsages] = useState([])
  const [loaded, setLoaded] = useState(!editing)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editing) return
    getCompanyAccount(id)
      .then((a) => {
        setForm({
          platform: a.platform,
          url: a.url,
          loginId: a.loginId,
          password: '',
          memo: a.memo,
        })
        setUsages(a.usages)
        setLoaded(true)
      })
      .catch((err) => setError(err.message))
  }, [editing, id])

  const set = (key) => (e) => {
    const value = e.target.value
    setForm((f) => {
      const next = { ...f, [key]: value }
      // 제안 목록의 플랫폼을 고르면 비어 있는 홈페이지 칸을 채워 준다
      if (key === 'platform' && !f.url) {
        const hit = PLATFORM_SUGGESTIONS.find((p) => p.name === value.trim())
        if (hit?.url) next.url = hit.url
      }
      return next
    })
    setError('')
  }

  const toggleUsage = (u) => {
    setUsages(usages.includes(u) ? usages.filter((x) => x !== u) : [...usages, u])
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.platform.trim()) return setError('어떤 플랫폼(사이트)인지 적어주세요')
    if (!form.loginId.trim()) return setError('ID를 알려주세요')
    if (!editing && !form.password) return setError('PW를 알려주세요')
    if (usages.length === 0) return setError('용도를 하나 이상 골라주세요')

    const body = {
      ...form,
      platform: form.platform.trim(),
      loginId: form.loginId.trim(),
      url: form.url.trim(),
      memo: form.memo.trim(),
      usages,
    }
    setSaving(true)
    try {
      if (editing) await updateCompanyAccount(id, body)
      else await createCompanyAccount(body)
      navigate('/accounts/logins', { replace: true })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form className="page-flat" onSubmit={submit}>
      <PageHeader title={editing ? '계정을 고쳐요' : '어떤 계정인가요?'} back />

      <Section
        name="입력"
        id="form"
        title={false}
        fill
        footer={
          <div className={styles.formFoot}>
            {error && <p className="form-error">{error}</p>}
            <button
              className="btn-primary btn-md btn-full"
              type="submit"
              disabled={saving || !loaded}
            >
              {saving ? '저장 중…' : editing ? '수정 저장' : '계정 저장'}
            </button>
          </div>
        }
      >
        <div className={styles.grid2}>
          <div className="form-group">
            <label className="form-label" htmlFor="platform">
              플랫폼 · 사이트 (직접 입력)
            </label>
            <input
              id="platform"
              className="form-input"
              list="platform-suggestions"
              autoComplete="off"
              placeholder="예: 식품안전나라"
              value={form.platform}
              onChange={set('platform')}
            />
            <datalist id="platform-suggestions">
              {PLATFORM_SUGGESTIONS.map((p) => (
                <option key={p.name} value={p.name} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="url">
              홈페이지 (없어도 돼요)
            </label>
            <input
              id="url"
              className="form-input"
              type="text"
              inputMode="url"
              autoComplete="off"
              placeholder="https://www.foodsafetykorea.go.kr"
              value={form.url}
              onChange={set('url')}
            />
          </div>
        </div>

        <div className={styles.grid2}>
          <div className="form-group">
            <label className="form-label" htmlFor="loginId">
              ID
            </label>
            <input
              id="loginId"
              className="form-input"
              autoComplete="off"
              value={form.loginId}
              onChange={set('loginId')}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              {editing ? 'PW (바꿀 때만 입력)' : 'PW'}
            </label>
            <div className={styles.pwRow}>
              <input
                id="password"
                className="form-input"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={editing ? '비워 두면 그대로예요' : ''}
                value={form.password}
                onChange={set('password')}
              />
              <button
                type="button"
                className="btn-secondary btn-md"
                onClick={() => setShowPw(!showPw)}
              >
                {showPw ? '가리기' : '보기'}
              </button>
            </div>
          </div>
        </div>

        <div className="form-group">
          <span className="form-label">용도 (여러 개 가능)</span>
          <div className={styles.usages}>
            {/* 예전에 저장한 용도 중 목록에 없는 것도 보여줘서 풀 수 있게 */}
            {[...USAGES, ...usages.filter((u) => !USAGES.includes(u))].map((u) => (
              <label key={u} className={styles.usage}>
                <input
                  type="checkbox"
                  checked={usages.includes(u)}
                  onChange={() => toggleUsage(u)}
                />
                {u}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="memo">
            비고
          </label>
          <input
            id="memo"
            className="form-input"
            placeholder="예: 연동 휴대폰 010-0000-0000"
            maxLength={1000}
            value={form.memo}
            onChange={set('memo')}
          />
        </div>
      </Section>
    </form>
  )
}
