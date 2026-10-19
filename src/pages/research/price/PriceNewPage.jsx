import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { createPriceResearch, getNextResearchCode } from '@/api/priceResearch'
import { getProducts } from '@/api/product'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import Thumb from '@/components/Thumb'
import { todayKst } from '@/utils/date'
import styles from '../Research.module.css'

const EMPTY_OPTION = { option1: '', option2: '', priceCny: '' }

export default function PriceNewPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({
    productCode: searchParams.get('product') || '', // 제품 상세에서 넘어오면 미리 선택
    researchedAt: todayKst(),
    taobaoUrl: '',
    coupangMinPrice: '',
    coupangUrl: '',
    naverMinPrice: '',
    naverUrl: '',
  })
  const [options, setOptions] = useState([EMPTY_OPTION])
  const [nextCode, setNextCode] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!form.researchedAt) return setNextCode('')
    getNextResearchCode(form.researchedAt)
      .then(setNextCode)
      .catch(() => setNextCode(''))
  }, [form.researchedAt])

  const product = products.find((p) => p.code === form.productCode)

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value })
    setError('')
  }

  const setOption = (index, key) => (e) => {
    setOptions(options.map((o, i) => (i === index ? { ...o, [key]: e.target.value } : o)))
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.productCode) return setError('어떤 제품인지 골라주세요')
    if (!form.researchedAt) return setError('조사일을 알려주세요')
    if (!form.taobaoUrl.trim()) return setError('구매할 타오바오 링크를 넣어주세요')
    if (options.length === 0) return setError('옵션을 하나 이상 넣어주세요')
    if (options.some((o) => !o.option1.trim())) return setError('옵션마다 옵션1을 넣어주세요')
    if (options.some((o) => !(Number(o.priceCny) > 0)))
      return setError('옵션마다 가격(위안)을 넣어주세요')

    const won = (v) => (v.trim() === '' ? null : Number(v.replaceAll(',', '')))
    setSaving(true)
    try {
      await createPriceResearch({
        productCode: form.productCode,
        researchedAt: form.researchedAt,
        photoPath: product?.photoPath, // 연결된 제품 사진
        taobaoUrl: form.taobaoUrl.trim(),
        coupangMinPrice: won(form.coupangMinPrice),
        coupangUrl: form.coupangUrl.trim(),
        naverMinPrice: won(form.naverMinPrice),
        naverUrl: form.naverUrl.trim(),
        options: options.map((o) => ({
          option1: o.option1.trim(),
          option2: o.option2.trim(),
          priceCny: o.priceCny.trim(),
        })),
      })
      navigate('/research/prices', { replace: true })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form className="page-flat" onSubmit={submit}>
      <PageHeader title="가격을 조사해요" back />

      <Section name="기본 정보" id="info">
        <div className="form-group">
          <label className="form-label" htmlFor="productCode">
            제품 코드
          </label>
          <select
            id="productCode"
            className="form-input"
            value={form.productCode}
            onChange={set('productCode')}
          >
            <option value="">제품을 골라주세요</option>
            {products.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} · {p.titleKo || p.titleCn}
              </option>
            ))}
          </select>
        </div>

        {product && (
          <div className={styles.linked}>
            <Thumb src={product.photoUrl} />
            <div>
              <div className={styles.linkedTitle}>{product.titleKo || product.titleCn}</div>
              <div className={styles.hint}>
                {product.photoUrl ? '제품 사진이 연결됐어요' : '이 제품엔 아직 사진이 없어요'}
              </div>
            </div>
          </div>
        )}

        <div className={styles.grid2}>
          <div className="form-group">
            <label className="form-label" htmlFor="researchedAt">
              조사일
            </label>
            <input
              id="researchedAt"
              className="form-input"
              type="date"
              value={form.researchedAt}
              onChange={set('researchedAt')}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="code">
              조사 코드번호
            </label>
            <input
              id="code"
              className={`form-input ${styles.readonly}`}
              value={nextCode}
              readOnly
            />
          </div>
        </div>
      </Section>

      <Section name="타오바오 링크" id="taobao" title={false}>
        <div className="form-group">
          <label className="form-label" htmlFor="taobaoUrl">
            구매할 타오바오 링크 (공식몰 위주)
          </label>
          <input
            id="taobaoUrl"
            className="form-input"
            type="url"
            value={form.taobaoUrl}
            onChange={set('taobaoUrl')}
            placeholder="https://item.taobao.com/..."
          />
        </div>
      </Section>

      <Section name="옵션" id="options" sub={`총 ${options.length}종류`}>
        <div className={styles.optionRow}>
          <span className={styles.hint}>옵션1</span>
          <span className={styles.hint}>옵션2</span>
          <span className={styles.hint}>가격 (위안)</span>
          <span />
        </div>
        {options.map((o, i) => (
          <div key={i} className={styles.optionRow}>
            <input
              className="form-input"
              aria-label={`옵션${i + 1} 옵션1`}
              value={o.option1}
              onChange={setOption(i, 'option1')}
              placeholder="블랙"
            />
            <input
              className="form-input"
              aria-label={`옵션${i + 1} 옵션2`}
              value={o.option2}
              onChange={setOption(i, 'option2')}
              placeholder="L"
            />
            <input
              className="form-input"
              aria-label={`옵션${i + 1} 가격`}
              inputMode="decimal"
              value={o.priceCny}
              onChange={setOption(i, 'priceCny')}
              placeholder="58"
            />
            <button
              type="button"
              className="btn-ghost btn-md"
              aria-label={`옵션${i + 1} 삭제`}
              onClick={() => setOptions(options.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-secondary btn-md btn-full"
          onClick={() => setOptions([...options, EMPTY_OPTION])}
        >
          옵션 추가
        </button>
      </Section>

      <Section name="국내 최저가" id="domestic" title="쿠팡·네이버 최저가" sub="없어도 돼요">
        <div className={styles.grid2}>
          <div className="form-group">
            <label className="form-label" htmlFor="coupangMinPrice">
              쿠팡 최저가 (원)
            </label>
            <input
              id="coupangMinPrice"
              className="form-input"
              inputMode="numeric"
              value={form.coupangMinPrice}
              onChange={set('coupangMinPrice')}
              placeholder="39900"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="coupangUrl">
              쿠팡 링크
            </label>
            <input
              id="coupangUrl"
              className="form-input"
              type="url"
              value={form.coupangUrl}
              onChange={set('coupangUrl')}
              placeholder="https://www.coupang.com/..."
            />
          </div>
        </div>
        <div className={styles.grid2}>
          <div className="form-group">
            <label className="form-label" htmlFor="naverMinPrice">
              네이버 최저가 (원)
            </label>
            <input
              id="naverMinPrice"
              className="form-input"
              inputMode="numeric"
              value={form.naverMinPrice}
              onChange={set('naverMinPrice')}
              placeholder="39900"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="naverUrl">
              네이버 링크
            </label>
            <input
              id="naverUrl"
              className="form-input"
              type="url"
              value={form.naverUrl}
              onChange={set('naverUrl')}
              placeholder="https://smartstore.naver.com/..."
            />
          </div>
        </div>
      </Section>

      {error && <p className="form-error">{error}</p>}

      <div className="sticky-cta">
        <button className="btn-primary btn-lg btn-full" type="submit" disabled={saving}>
          조사 저장
        </button>
      </div>
    </form>
  )
}
