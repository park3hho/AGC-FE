import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { createProduct, getNextProductCode } from '@/api/product'
import PageHeader from '@/components/common/PageHeader'
import { todayKst } from '@/utils/date'
import styles from '../Research.module.css'

export default function ProductNewPage() {
  const navigate = useNavigate()
  const [nextCode, setNextCode] = useState('')
  const [titleCn, setTitleCn] = useState('')
  const [titleKo, setTitleKo] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getNextProductCode().then(setNextCode)
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!titleCn.trim() && !titleKo.trim()) return setError('제목을 하나 이상 적어주세요')

    setSaving(true)
    await createProduct({ titleCn: titleCn.trim(), titleKo: titleKo.trim() })
    navigate('/research/products', { replace: true })
  }

  return (
    <form className="page-flat" onSubmit={submit}>
      <PageHeader title="어떤 제품인가요?" back />

      <div className={styles.grid2}>
        <div className="form-group">
          <label className="form-label" htmlFor="code">
            제품 코드
          </label>
          <input id="code" className={`form-input ${styles.readonly}`} value={nextCode} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="addedAt">
            제품 코드 추가일
          </label>
          <input id="addedAt" className={`form-input ${styles.readonly}`} value={todayKst()} readOnly />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="titleCn">
          제품 중국어 제목
        </label>
        <input
          id="titleCn"
          className="form-input"
          value={titleCn}
          onChange={(e) => {
            setTitleCn(e.target.value)
            setError('')
          }}
          placeholder="户外折叠椅 超轻便携"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="titleKo">
          제품 한국어 제목
        </label>
        <input
          id="titleKo"
          className="form-input"
          value={titleKo}
          onChange={(e) => {
            setTitleKo(e.target.value)
            setError('')
          }}
          placeholder="접이식 캠핑 의자 초경량"
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="sticky-cta">
        <button className="btn-primary btn-lg btn-full" type="submit" disabled={saving}>
          제품 등록
        </button>
      </div>
    </form>
  )
}
