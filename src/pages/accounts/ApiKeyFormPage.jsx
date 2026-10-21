import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { createApiCredential, getApiCredential, updateApiCredential } from '@/api/apiCredential'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { PLATFORM_SUGGESTIONS } from '@/constants/accountConst'
import styles from './Accounts.module.css'

const EMPTY = {
  service: '',
  url: '',
  publicValues: [{ label: '', value: '' }],
  secrets: [{ label: '', value: '' }],
  issuedOn: '',
  expiresOn: '',
  reauthFrom: '',
  reauthTo: '',
  allowedIps: '',
  memo: '',
}

// 날짜 + n일 → 'YYYY-MM-DD'
const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// 라벨·값 여러 줄 입력 (공개값 · 비밀값 공용)
function PairRows({
  rows, // Array<{ label, value }>
  secret, // boolean?: 값 칸을 비밀번호 칸으로
  editing, // boolean?: 수정 중 — 비밀값은 비워 두면 그대로
  labelHint, // string: 이름 칸 예시
  onChange, // function(rows)
}) {
  const set = (i, key, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)))
  return (
    <div className={styles.pairs}>
      {rows.map((r, i) => (
        <div key={i} className={styles.pairRow}>
          <input
            className="form-input"
            placeholder={labelHint}
            aria-label="이름"
            value={r.label}
            onChange={(e) => set(i, 'label', e.target.value)}
          />
          <input
            className="form-input"
            type={secret ? 'password' : 'text'}
            autoComplete={secret ? 'new-password' : 'off'}
            placeholder={secret && editing && r.saved ? '비워 두면 그대로예요' : '값'}
            aria-label="값"
            value={r.value}
            onChange={(e) => set(i, 'value', e.target.value)}
          />
          <button
            type="button"
            className="btn-ghost btn-md"
            aria-label="이 줄 삭제"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn-secondary btn-sm"
        onClick={() => onChange([...rows, { label: '', value: '' }])}
      >
        줄 추가
      </button>
    </div>
  )
}

// 회사 계정 › API 키 추가 · 수정 — 섹션: 입력 (저장 버튼은 섹션 아래 고정)
export default function ApiKeyFormPage() {
  const { id } = useParams()
  const editing = id != null
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [loaded, setLoaded] = useState(!editing)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editing) return
    getApiCredential(id)
      .then((c) => {
        setForm({
          service: c.service,
          url: c.url,
          publicValues: c.publicValues.length ? c.publicValues : [{ label: '', value: '' }],
          // 저장된 비밀값은 이름만 온다 — 값을 비워 두면 그대로 유지
          secrets: c.secrets.map((s) => ({ label: s.label, value: '', saved: true })),
          issuedOn: c.issuedOn || '',
          expiresOn: c.expiresOn || '',
          reauthFrom: c.reauthFrom || '',
          reauthTo: c.reauthTo || '',
          allowedIps: c.allowedIps.join(', '),
          memo: c.memo,
        })
        setLoaded(true)
      })
      .catch((err) => setError(err.message))
  }, [editing, id])

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value })
    setError('')
  }
  const setRows = (key) => (rows) => {
    setForm({ ...form, [key]: rows })
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    const publicValues = form.publicValues
      .map((p) => ({ label: p.label.trim(), value: p.value.trim() }))
      .filter((p) => p.label || p.value)
    const secrets = form.secrets
      .map((s) => ({ label: s.label.trim(), value: s.value, saved: s.saved }))
      .filter((s) => s.label || s.value)
    if (!form.service.trim()) return setError('어떤 서비스의 키인지 적어주세요')
    if (publicValues.some((p) => !p.label || !p.value))
      return setError('공개값은 이름과 값을 모두 적어주세요')
    if (secrets.length === 0) return setError('비밀값을 하나 이상 넣어주세요')
    if (secrets.some((s) => !s.label)) return setError('비밀값 이름을 적어주세요')
    if (secrets.some((s) => !s.value && !s.saved)) return setError('새 비밀값의 값을 적어주세요')

    setSaving(true)
    try {
      const body = {
        ...form,
        service: form.service.trim(),
        url: form.url.trim(),
        publicValues,
        secrets,
        allowedIps: form.allowedIps
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        memo: form.memo.trim(),
      }
      if (editing) await updateApiCredential(id, body)
      else await createApiCredential(body)
      navigate('/accounts/api-keys', { replace: true })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form className="page-flat" onSubmit={submit}>
      <PageHeader title={editing ? 'API 키를 고쳐요' : '어떤 API 키인가요?'} back />

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
              {saving ? '저장 중…' : editing ? '수정 저장' : 'API 키 저장'}
            </button>
          </div>
        }
      >
        <div className={styles.grid2}>
          <div className="form-group">
            <label className="form-label" htmlFor="service">
              서비스 (직접 입력)
            </label>
            <input
              id="service"
              className="form-input"
              list="service-suggestions"
              autoComplete="off"
              placeholder="예: 쿠팡 OpenAPI"
              value={form.service}
              onChange={set('service')}
            />
            <datalist id="service-suggestions">
              {[
                '네이버 커머스API',
                '쿠팡 OpenAPI',
                'UNI-PASS API',
                ...PLATFORM_SUGGESTIONS.map((p) => p.name),
              ].map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="url">
              홈페이지 · 콘솔 (없어도 돼요)
            </label>
            <input
              id="url"
              className="form-input"
              inputMode="url"
              autoComplete="off"
              placeholder="https://wing.coupang.com"
              value={form.url}
              onChange={set('url')}
            />
          </div>
        </div>

        <div className="form-group">
          <span className="form-label">공개값 — 그냥 보여도 되는 값 (앱 ID · 업체코드 등)</span>
          <PairRows
            rows={form.publicValues}
            labelHint="예: 업체코드"
            onChange={setRows('publicValues')}
          />
        </div>

        <div className="form-group">
          <span className="form-label">
            비밀값 — 보기를 누를 때만 보이고 열람 기록이 남아요
            {editing && ' (값을 비워 두면 그대로)'}
          </span>
          <PairRows
            rows={form.secrets}
            secret
            editing={editing}
            labelHint="예: Secret Key"
            onChange={setRows('secrets')}
          />
        </div>

        <div className={styles.grid4}>
          <div className="form-group">
            <label className="form-label" htmlFor="issuedOn">
              발급일
            </label>
            <input
              id="issuedOn"
              className="form-input"
              type="date"
              value={form.issuedOn}
              onChange={set('issuedOn')}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="expiresOn">
              만료일
              {form.issuedOn && (
                <button
                  type="button"
                  className={`btn-text ${styles.inlineBtn}`}
                  onClick={() => setForm({ ...form, expiresOn: addDays(form.issuedOn, 180) })}
                >
                  발급일+180일
                </button>
              )}
            </label>
            <input
              id="expiresOn"
              className="form-input"
              type="date"
              value={form.expiresOn}
              onChange={set('expiresOn')}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reauthFrom">
              재인증 시작
            </label>
            <input
              id="reauthFrom"
              className="form-input"
              type="date"
              value={form.reauthFrom}
              onChange={set('reauthFrom')}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reauthTo">
              재인증 끝
            </label>
            <input
              id="reauthTo"
              className="form-input"
              type="date"
              value={form.reauthTo}
              onChange={set('reauthTo')}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="allowedIps">
            허용 IP (여러 개면 쉼표로)
          </label>
          <input
            id="allowedIps"
            className="form-input"
            placeholder="예: 180.231.169.53"
            value={form.allowedIps}
            onChange={set('allowedIps')}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="memo">
            메모
          </label>
          <textarea
            id="memo"
            className={`form-input ${styles.memoInput}`}
            rows={3}
            value={form.memo}
            onChange={set('memo')}
          />
        </div>
      </Section>
    </form>
  )
}
