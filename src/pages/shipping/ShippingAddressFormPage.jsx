import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  createShippingAddress,
  getShippingAddress,
  updateShippingAddress,
} from '@/api/shippingAddress'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { ADDRESS_USES, COUNTRY_SUGGESTIONS, LISTING_MARKETS } from '@/constants/shippingConst'
import styles from './ShippingAddress.module.css'

const EMPTY = {
  name: '',
  country: 'CN',
  zipCode: '',
  address: '',
  addressDetail: '',
  phone: '',
  uses: ['outbound'],
  defaults: [],
  marketCodes: [],
  memo: '',
}

const toggle = (list, key, on) =>
  on ? [...new Set([...list, key])] : list.filter((k) => k !== key)

// 배송 › 주소 추가 · 수정 — 섹션: 입력 (저장 버튼은 섹션 아래 고정)
export default function ShippingAddressFormPage() {
  const { id } = useParams()
  const editing = id != null
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [loaded, setLoaded] = useState(!editing)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editing) return
    getShippingAddress(id)
      .then((a) => {
        setForm(a)
        setLoaded(true)
      })
      .catch((err) => setError(err.message))
  }, [editing, id])

  const patch = (p) => {
    setForm((f) => ({ ...f, ...p }))
    setError('')
  }
  const set = (key) => (e) => patch({ [key]: e.target.value })

  const setUse = (key, on) =>
    patch({
      uses: toggle(form.uses, key, on),
      defaults: on ? form.defaults : form.defaults.filter((d) => d !== key),
      marketCodes: on ? form.marketCodes : form.marketCodes.filter((c) => c.use !== key),
    })
  const setCode = (i, p) =>
    patch({ marketCodes: form.marketCodes.map((c, j) => (j === i ? { ...c, ...p } : c)) })

  const submit = async (e) => {
    e.preventDefault()
    const codes = form.marketCodes
      .map((c) => ({ ...c, market: c.market.trim(), code: c.code.trim(), name: c.name.trim() }))
      .filter((c) => c.market || c.code)
    if (!form.name.trim()) return setError('주소 이름을 적어주세요')
    if (!/^[A-Za-z]{2}$/.test(form.country.trim()))
      return setError('국가는 2글자 코드로 적어주세요 (예: KR, CN)')
    if (!form.address.trim()) return setError('주소를 적어주세요')
    if (form.uses.length === 0) return setError('출고지·반품지 중 하나 이상 골라주세요')
    if (codes.some((c) => !c.market || !c.code))
      return setError('마켓 번호는 마켓과 번호를 모두 적어주세요')
    const keys = codes.map((c) => `${c.market}|${c.use}`)
    if (new Set(keys).size !== keys.length)
      return setError('같은 마켓·용도의 번호가 두 번 들어갔어요')

    setSaving(true)
    try {
      const body = {
        ...form,
        name: form.name.trim(),
        country: form.country.trim().toUpperCase(),
        marketCodes: codes,
      }
      if (editing) await updateShippingAddress(id, body)
      else await createShippingAddress(body)
      navigate('/shipping/addresses', { replace: true })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const overseas = form.country.trim().toUpperCase() !== 'KR'

  return (
    <form className="page-flat" onSubmit={submit}>
      <PageHeader title={editing ? '주소를 고쳐요' : '어떤 주소인가요?'} back />

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
              {saving ? '저장 중…' : editing ? '수정 저장' : '주소 저장'}
            </button>
          </div>
        }
      >
        <div className={styles.grid3}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              이름
            </label>
            <input
              id="name"
              className="form-input"
              placeholder="예: 집운 웨이하이 배대지"
              value={form.name}
              onChange={set('name')}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="country">
              국가 코드 {overseas ? '· 해외' : '· 국내'}
            </label>
            <input
              id="country"
              className="form-input"
              list="country-suggestions"
              maxLength={2}
              value={form.country}
              onChange={set('country')}
            />
            <datalist id="country-suggestions">
              {COUNTRY_SUGGESTIONS.map((c) => (
                <option key={c.code} value={c.code} label={c.name} />
              ))}
            </datalist>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="phone">
              연락처
            </label>
            <input id="phone" className="form-input" value={form.phone} onChange={set('phone')} />
          </div>
        </div>

        <div className={styles.grid3}>
          <div className="form-group">
            <label className="form-label" htmlFor="zipCode">
              우편번호
            </label>
            <input
              id="zipCode"
              className="form-input"
              value={form.zipCode}
              onChange={set('zipCode')}
            />
          </div>
          <div className={`form-group ${styles.span2}`}>
            <label className="form-label" htmlFor="address">
              주소 {overseas && '(현지어·영문 그대로)'}
            </label>
            <input
              id="address"
              className="form-input"
              value={form.address}
              onChange={set('address')}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="addressDetail">
            상세 주소 · 사서함 번호
          </label>
          <input
            id="addressDetail"
            className="form-input"
            value={form.addressDetail}
            onChange={set('addressDetail')}
          />
        </div>

        <div className="form-group">
          <span className="form-label">
            용도 · 기본값 (기본은 용도마다 1곳 — 여기를 기본으로 하면 다른 곳은 풀려요)
          </span>
          <div className={styles.uses}>
            {ADDRESS_USES.map((u) => (
              <span key={u.key} className={styles.useBox}>
                <label>
                  <input
                    type="checkbox"
                    checked={form.uses.includes(u.key)}
                    onChange={(e) => setUse(u.key, e.target.checked)}
                  />{' '}
                  {u.label}
                </label>
                <label className={styles.weak}>
                  <input
                    type="checkbox"
                    disabled={!form.uses.includes(u.key)}
                    checked={form.defaults.includes(u.key)}
                    onChange={(e) =>
                      patch({ defaults: toggle(form.defaults, u.key, e.target.checked) })
                    }
                  />{' '}
                  기본 {u.label}
                </label>
              </span>
            ))}
          </div>
        </div>

        <div className="form-group">
          <span className="form-label">
            마켓 주소 번호 — 스마트스토어·Wing 주소록에 등록된 번호
          </span>
          <div className={styles.pairs}>
            {form.marketCodes.map((c, i) => (
              <div key={i} className={styles.codeEdit}>
                <input
                  className="form-input"
                  list="market-suggestions"
                  placeholder="마켓"
                  aria-label="마켓"
                  value={c.market}
                  onChange={(e) => setCode(i, { market: e.target.value })}
                />
                <select
                  className="form-input"
                  aria-label="용도"
                  value={c.use}
                  onChange={(e) => setCode(i, { use: e.target.value })}
                >
                  {ADDRESS_USES.filter((u) => form.uses.includes(u.key)).map((u) => (
                    <option key={u.key} value={u.key}>
                      {u.label}
                    </option>
                  ))}
                </select>
                <input
                  className="form-input"
                  inputMode="numeric"
                  placeholder="번호"
                  aria-label="번호"
                  value={c.code}
                  onChange={(e) => setCode(i, { code: e.target.value })}
                />
                <input
                  className="form-input"
                  placeholder="마켓에 등록된 이름 (선택)"
                  aria-label="마켓에 등록된 이름"
                  value={c.name}
                  onChange={(e) => setCode(i, { name: e.target.value })}
                />
                <button
                  type="button"
                  className="btn-ghost btn-md"
                  aria-label="이 줄 삭제"
                  onClick={() => patch({ marketCodes: form.marketCodes.filter((_, j) => j !== i) })}
                >
                  ✕
                </button>
              </div>
            ))}
            <datalist id="market-suggestions">
              {LISTING_MARKETS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={form.uses.length === 0}
              onClick={() =>
                patch({
                  marketCodes: [
                    ...form.marketCodes,
                    { market: '', use: form.uses[0], code: '', name: '' },
                  ],
                })
              }
            >
              번호 추가
            </button>
          </div>
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
