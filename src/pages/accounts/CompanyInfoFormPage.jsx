import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  createCompanyInfo,
  deleteCompanyInfoFile,
  getCompanyInfo,
  updateCompanyInfo,
  uploadCompanyInfoFile,
} from '@/api/companyInfo'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { INFO_CATEGORIES } from '@/utils/companyInfo'
import accountStyles from './Accounts.module.css'
import styles from './CompanyInfo.module.css'

const EMPTY = {
  category: '',
  name: '',
  value: '',
  details: [{ label: '', value: '' }],
  issuer: '',
  issuedOn: '',
  expiresOn: '',
  remind: true,
  url: '',
  link: '',
  sort: 0,
  memo: '',
}

const FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp'

const sizeText = (n) =>
  n >= 1048576 ? `${(n / 1048576).toFixed(1)}MB` : `${Math.ceil(n / 1024)}KB`

// 세부 값 여러 줄 (은행 · 예금주 · 상호 등)
function DetailRows({
  rows, // Array<{ label, value }>
  onChange, // function(rows)
}) {
  const set = (i, key, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)))
  return (
    <div className={accountStyles.pairs}>
      {rows.map((r, i) => (
        <div key={i} className={accountStyles.pairRow}>
          <input
            className="form-input"
            placeholder="예: 예금주"
            aria-label="이름"
            value={r.label}
            onChange={(e) => set(i, 'label', e.target.value)}
          />
          <input
            className="form-input"
            placeholder="값"
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

// 회사 정보 › 기본 정보 추가 · 수정 — 섹션: 입력 (저장 버튼은 섹션 아래 고정)
//   새 항목의 파일은 저장할 때 같이 올린다. 수정 중에는 바로 올리고 지운다.
export default function CompanyInfoFormPage() {
  const { id } = useParams()
  const editing = id != null
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [files, setFiles] = useState([]) // 저장된 파일 (수정 중)
  const [pending, setPending] = useState([]) // 새로 고른 File (저장 때 올림)
  const [categories, setCategories] = useState(INFO_CATEGORIES)
  const [links, setLinks] = useState([]) // [{ key, label, usedBy, takenBy }]
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCompanyInfo()
      .then(({ items, links: all }) => {
        const me = editing ? items.find((i) => String(i.id) === String(id)) : null
        if (editing && !me) throw new Error('기본 정보를 찾지 못했어요')
        setCategories([...new Set([...INFO_CATEGORIES, ...items.map((i) => i.category)])])
        setLinks(
          all.map((l) => ({
            ...l,
            takenBy: items.find((i) => i.link === l.key && i.id !== me?.id)?.name || '',
          })),
        )
        if (me) {
          setForm({
            ...me,
            details: me.details.length ? me.details : [{ label: '', value: '' }],
            issuedOn: me.issuedOn || '',
            expiresOn: me.expiresOn || '',
          })
          setFiles(me.files)
        }
        setLoaded(true)
      })
      .catch((err) => setError(err.message))
  }, [editing, id])

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
    setError('')
  }

  const pickFiles = async (e) => {
    const picked = [...e.target.files]
    e.target.value = ''
    if (!picked.length) return
    if (!editing) return setPending((p) => [...p, ...picked])
    setError('')
    for (const f of picked) {
      try {
        const saved = await uploadCompanyInfoFile(id, f)
        setFiles((list) => [...list, saved])
      } catch (err) {
        setError(err.message)
      }
    }
  }

  const removeFile = async (f) => {
    if (!window.confirm(`${f.name} 을(를) 삭제할까요?`)) return
    try {
      await deleteCompanyInfoFile(id, f.id)
      setFiles((list) => list.filter((x) => x.id !== f.id))
    } catch (err) {
      setError(err.message)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    const details = form.details
      .map((d) => ({ label: d.label.trim(), value: d.value.trim() }))
      .filter((d) => d.label || d.value)
    if (!form.category.trim()) return setError('분류를 적어주세요')
    if (!form.name.trim()) return setError('이름을 적어주세요')
    if (details.some((d) => !d.label || !d.value))
      return setError('세부 값은 이름과 값을 모두 적어주세요')
    if (!editing && !form.value.trim() && !details.length && !pending.length)
      return setError('값, 세부 값, 파일 중 하나는 넣어주세요')

    setSaving(true)
    try {
      const body = {
        ...form,
        category: form.category.trim(),
        name: form.name.trim(),
        value: form.value.trim(),
        details,
        issuer: form.issuer.trim(),
        url: form.url.trim(),
        memo: form.memo.trim(),
      }
      if (editing) {
        await updateCompanyInfo(id, body)
      } else {
        const created = await createCompanyInfo(body)
        for (const f of pending) await uploadCompanyInfoFile(created.id, f)
      }
      navigate('/accounts', { replace: true })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const chosenLink = links.find((l) => l.key === form.link)

  return (
    <form className="page-flat" onSubmit={submit}>
      <PageHeader title={editing ? '기본 정보를 고쳐요' : '어떤 정보인가요?'} back />

      <Section
        name="입력"
        id="form"
        title={false}
        fill
        footer={
          <div className={accountStyles.formFoot}>
            {error && <p className="form-error">{error}</p>}
            <button
              className="btn-primary btn-md btn-full"
              type="submit"
              disabled={saving || !loaded}
            >
              {saving ? '저장 중…' : editing ? '수정 저장' : '저장'}
            </button>
          </div>
        }
      >
        <div className={accountStyles.grid2}>
          <div className="form-group">
            <label className="form-label" htmlFor="category">
              분류 (직접 입력)
            </label>
            <input
              id="category"
              className="form-input"
              list="category-suggestions"
              autoComplete="off"
              placeholder="예: 인허가·신고"
              value={form.category}
              onChange={set('category')}
            />
            <datalist id="category-suggestions">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              이름
            </label>
            <input
              id="name"
              className="form-input"
              autoComplete="off"
              placeholder="예: 전자상거래업자부호"
              value={form.name}
              onChange={set('name')}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="value">
            값 — 번호 · 계좌번호 등 (서류만 있으면 비워도 돼요)
          </label>
          <input
            id="value"
            className="form-input"
            autoComplete="off"
            placeholder="예: K-26-043299"
            value={form.value}
            onChange={set('value')}
          />
        </div>

        <div className="form-group">
          <span className="form-label">세부 값 — 은행 · 예금주 · 상호처럼 같이 적어 둘 것</span>
          <DetailRows
            rows={form.details}
            onChange={(rows) => {
              setForm({ ...form, details: rows })
              setError('')
            }}
          />
        </div>

        <div className={accountStyles.grid4}>
          <div className="form-group">
            <label className="form-label" htmlFor="issuer">
              발급기관
            </label>
            <input
              id="issuer"
              className="form-input"
              placeholder="예: 관세청"
              value={form.issuer}
              onChange={set('issuer')}
            />
          </div>
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
              만료일 (없으면 비움)
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
            <span className="form-label">만료 알림</span>
            <label className={styles.check}>
              <input type="checkbox" checked={form.remind} onChange={set('remind')} />
              가까우면 홈 할 일에 띄우기
            </label>
          </div>
        </div>

        <div className={accountStyles.grid2}>
          <div className="form-group">
            <label className="form-label" htmlFor="url">
              관련 사이트 (없어도 돼요)
            </label>
            <input
              id="url"
              className="form-input"
              inputMode="url"
              autoComplete="off"
              placeholder="https://unipass.customs.go.kr"
              value={form.url}
              onChange={set('url')}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="link">
              앱에서 쓰는 곳
            </label>
            <select id="link" className="form-input" value={form.link} onChange={set('link')}>
              <option value="">없음</option>
              {links.map((l) => (
                <option key={l.key} value={l.key} disabled={!!l.takenBy}>
                  {l.label} → {l.usedBy}
                  {l.takenBy ? ` (이미 '${l.takenBy}')` : ''}
                </option>
              ))}
            </select>
            {chosenLink && (
              <span className={styles.hint}>
                이 값을 {chosenLink.usedBy}에 그대로 써요. 여기서 고치면 거기도 바뀌어요.
              </span>
            )}
          </div>
        </div>

        <div className="form-group">
          <span className="form-label">
            서류 파일 — PDF · 사진, 20MB까지 (로그인한 사람만 열 수 있어요)
          </span>
          <div className={styles.fileList}>
            {files.map((f) => (
              <div key={f.id} className={styles.fileRow}>
                <a href={f.url} target="_blank" rel="noreferrer">
                  {f.name}
                </a>
                <span className={styles.hint}>{sizeText(f.size)}</span>
                <button type="button" className="btn-ghost btn-sm" onClick={() => removeFile(f)}>
                  삭제
                </button>
              </div>
            ))}
            {pending.map((f, i) => (
              <div key={`p${i}`} className={styles.fileRow}>
                <span>{f.name}</span>
                <span className={styles.hint}>{sizeText(f.size)} · 저장할 때 올려요</span>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => setPending((p) => p.filter((_, j) => j !== i))}
                >
                  빼기
                </button>
              </div>
            ))}
            <label className={`btn-secondary btn-sm ${styles.pick}`}>
              파일 고르기
              <input type="file" accept={FILE_ACCEPT} multiple hidden onChange={pickFiles} />
            </label>
          </div>
        </div>

        <div className={accountStyles.grid2}>
          <div className="form-group">
            <label className="form-label" htmlFor="memo">
              메모
            </label>
            <textarea
              id="memo"
              className={`form-input ${accountStyles.memoInput}`}
              rows={3}
              value={form.memo}
              onChange={set('memo')}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="sort">
              분류 안 순서 (작을수록 위)
            </label>
            <input
              id="sort"
              className="form-input"
              type="number"
              min={-999}
              max={999}
              value={form.sort}
              onChange={set('sort')}
            />
          </div>
        </div>
      </Section>
    </form>
  )
}
