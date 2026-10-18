import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { createProduct, getNextProductCode } from '@/api/product'
import PageHeader from '@/components/common/PageHeader'
import PhotoInput from '@/components/PhotoInput'
import { todayKst } from '@/utils/date'
import styles from '../Research.module.css'

export default function ProductNewPage() {
  const navigate = useNavigate()
  const [nextCode, setNextCode] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [titleCn, setTitleCn] = useState('')
  const [titleKo, setTitleKo] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getNextProductCode()
      .then(setNextCode)
      .catch((err) => setError(err.message))
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    // BE 는 중국어 제목이 필수 (docs/api-contract.md POST /products)
    if (!titleCn.trim()) return setError('중국어 제목을 적어주세요')

    setSaving(true)
    try {
      await createProduct({ titleCn: titleCn.trim(), titleKo: titleKo.trim(), photoFile })
      navigate('/research/products', { replace: true })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form className="page-flat" onSubmit={submit}>
      <PageHeader title="어떤 제품인가요?" back />

      <div className="form-group">
        <label className="form-label" htmlFor="code">
          제품 코드
        </label>
        <input id="code" className={`form-input ${styles.readonly}`} value={nextCode} readOnly />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="photo">
          제품 사진
        </label>
        <PhotoInput id="photo" file={photoFile} onChange={setPhotoFile} />
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

      <div className="form-group">
        <label className="form-label" htmlFor="addedAt">
          제품 코드 추가일
        </label>
        <input id="addedAt" className={`form-input ${styles.readonly}`} value={todayKst()} readOnly />
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
