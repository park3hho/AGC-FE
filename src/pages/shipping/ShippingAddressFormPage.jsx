import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  createShippingAddress,
  getShippingAddresses,
  updateShippingAddress,
} from '@/api/shippingAddress'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { ADDRESS_USES, COUNTRY_SUGGESTIONS } from '@/constants/shippingConst'
import { codeOf, marketsOf, pickAddress } from '@/utils/shippingAddress'
import styles from './ShippingAddress.module.css'

const EMPTY = {
  name: '',
  country: 'CN',
  zipCode: '',
  address: '',
  addressDetail: '',
  phone: '',
  marketCodes: [],
  memo: '',
}

const ALL_USES = ADDRESS_USES.map((u) => u.key)

// 마켓 × 용도 번호 칸 { '쿠팡|outbound': '25556899' }
const toGrid = (address) => {
  const grid = {}
  for (const m of marketsOf(address))
    for (const u of ALL_USES) grid[`${m}|${u}`] = codeOf(address, m, u)?.code || ''
  return grid
}

// 배송 › 주소 수정 — 섹션: 입력. 출고지·반품지는 이 주소 하나 (기본 출고지·반품지로 저장)
export default function ShippingAddressFormPage() {
  const navigate = useNavigate()
  const [original, setOriginal] = useState(null) // 저장된 주소 (없으면 새로 만든다)
  const [form, setForm] = useState(EMPTY)
  const [grid, setGrid] = useState(() => toGrid(null))
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getShippingAddresses()
      .then((list) => {
        const a = pickAddress(list)
        if (a) {
          setOriginal(a)
          setForm(a)
          setGrid(toGrid(a))
        }
        setLoaded(true)
      })
      .catch((err) => setError(err.message))
  }, [])

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value })
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('주소 이름을 적어주세요')
    if (!/^[A-Za-z]{2}$/.test(form.country.trim()))
      return setError('국가는 2글자 코드로 적어주세요 (예: KR, CN)')
    if (!form.address.trim()) return setError('주소를 적어주세요')

    // 번호 칸 → market_codes. 번호가 그대로면 마켓에 등록된 이름도 그대로 둔다
    const marketCodes = Object.entries(grid)
      .map(([key, code]) => {
        const [market, use] = key.split('|')
        const prev = codeOf(original, market, use)
        const c = code.trim()
        return c && { market, use, code: c, name: prev?.code === c ? prev.name : '' }
      })
      .filter(Boolean)

    setSaving(true)
    try {
      const body = {
        ...form,
        name: form.name.trim(),
        country: form.country.trim().toUpperCase(),
        uses: ALL_USES,
        defaults: ALL_USES,
        marketCodes,
      }
      if (original) await updateShippingAddress(original.id, body)
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
      <PageHeader
        title="출고지·반품지 주소"
        sub="둘 다 이 주소 하나 — 구매대행은 배대지 주소"
        back
      />

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
              {saving ? '저장 중…' : '저장'}
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
            마켓 주소록 번호 — 스마트스토어·Wing 주소록에 이 주소를 등록하고 받은 번호
          </span>
          <div className={styles.gridCodes}>
            <span />
            {ADDRESS_USES.map((u) => (
              <span key={u.key} className={styles.weak}>
                {u.label} 번호
              </span>
            ))}
            {marketsOf(original).map((m) => [
              <b key={m}>{m}</b>,
              ...ADDRESS_USES.map((u) => (
                <input
                  key={`${m}|${u.key}`}
                  className="form-input"
                  inputMode="numeric"
                  aria-label={`${m} ${u.label} 번호`}
                  placeholder="없음"
                  value={grid[`${m}|${u.key}`] || ''}
                  onChange={(e) => setGrid({ ...grid, [`${m}|${u.key}`]: e.target.value })}
                />
              )),
            ])}
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
