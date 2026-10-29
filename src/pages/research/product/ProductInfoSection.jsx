import { useEffect, useState } from 'react'

import { categoryLabel, getProductCategories, updateProductInfo } from '@/api/product'
import Section from '@/components/common/Section'
import styles from './ProductDetail.module.css'

// 분류(대분류 › 소분류 › 차 형태)도 여기서 본다·고친다 — 자사몰 메뉴가 이 값으로 거른다 (2026-10-29)
// 제품 정보 칸 — 리서치 때 함께 찾아 저장하고, 상세페이지 '제품 정보' 표가 이 값을 쓴다 (2026-10-27)
export const INFO_FIELDS = [
  { key: 'manufacturer', label: '제조사', placeholder: '广东健力宝股份有限公司 (공장 법인명)' },
  {
    key: 'ingredients',
    label: '원재료',
    placeholder: '맛마다 다르면 줄마다 "맛: 원재료"',
    multiline: true,
  },
  { key: 'allergens', label: '알레르기', placeholder: '우유, 대두 (없으면 비움)' },
  { key: 'shelfLife', label: '소비기한', placeholder: '12개월' },
  { key: 'storage', label: '보관 방법', placeholder: '직사광선을 피해 서늘한 곳' },
]

// 비어 있으면 노란 글씨로 "비어 있음" — 상세페이지에 [[...]] 로 남는 칸을 미리 보이게
export default function ProductInfoSection({
  product, // toProduct 결과
  onSaved, // (product) => void — 저장 뒤 새 제품 값
  className, // string?: 모바일 탭 숨김 등
  fill, // Section fill
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [cats, setCats] = useState(null) // 분류 코드 → 이름 (자사몰 메뉴와 같은 값)
  useEffect(() => {
    getProductCategories().then(setCats).catch(() => {})
  }, [])

  const empty = INFO_FIELDS.filter((f) => f.key !== 'allergens' && !product[f.key]).length

  const start = () => {
    setForm({
      ...Object.fromEntries(INFO_FIELDS.map((f) => [f.key, product[f.key] || ''])),
      category: product.category,
      subcategory: product.subcategory,
      teaForm: product.teaForm,
    })
    setError('')
    setEditing(true)
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const saved = await updateProductInfo(product.id, form)
      onSaved(saved)
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section
      name="제품 정보"
      id="product-info"
      sub={empty ? `빈 칸 ${empty}개` : '모두 채움'}
      fill={fill}
      className={className}
      action={
        editing ? (
          <>
            <button
              className="btn-ghost btn-sm"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              취소
            </button>
            <button className="btn-primary btn-sm" onClick={save} disabled={saving}>
              저장
            </button>
          </>
        ) : (
          <button className="btn-secondary btn-sm" onClick={start}>
            수정
          </button>
        )
      }
    >
      {editing ? (
        <div className={styles.infoForm}>
          <div className="form-group">
            <label className="form-label" htmlFor="info-category">
              분류
            </label>
            <div className={styles.catSelects}>
              <select
                id="info-category"
                className="form-input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value, subcategory: '', teaForm: '' })}
              >
                {Object.entries(cats || { [form.category]: { label: form.category } }).map(([k, c]) => (
                  <option key={k} value={k}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                className="form-input"
                aria-label="소분류"
                value={form.subcategory}
                onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
              >
                <option value="">소분류 없음</option>
                {Object.entries(cats?.[form.category]?.sub || {}).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
              {form.category === 'tea' && (
                <select
                  className="form-input"
                  aria-label="형태"
                  value={form.teaForm}
                  onChange={(e) => setForm({ ...form, teaForm: e.target.value })}
                >
                  <option value="">형태 없음</option>
                  {Object.entries(cats?.tea?.forms || {}).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>          {INFO_FIELDS.map((f) => (
            <div key={f.key} className="form-group">
              <label className="form-label" htmlFor={`info-${f.key}`}>
                {f.label}
              </label>
              {f.multiline ? (
                <textarea
                  id={`info-${f.key}`}
                  className="form-input"
                  rows={3}
                  value={form[f.key]}
                  placeholder={f.placeholder}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              ) : (
                <input
                  id={`info-${f.key}`}
                  className="form-input"
                  value={form[f.key]}
                  placeholder={f.placeholder}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
          {error && <p className="form-error">{error}</p>}
        </div>
      ) : (
        <dl className={styles.infoRows}>
          <div className={styles.infoRow}>
            <dt>분류</dt>
            <dd className={product.subcategory ? '' : styles.infoEmpty}>{categoryLabel(cats, product)}</dd>
          </div>
          {INFO_FIELDS.map((f) => (
            <div key={f.key} className={styles.infoRow}>
              <dt>{f.label}</dt>
              <dd className={product[f.key] ? '' : styles.infoEmpty} title={product[f.key] || ''}>
                {product[f.key] || (f.key === 'allergens' ? '-' : '비어 있음')}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Section>
  )
}
