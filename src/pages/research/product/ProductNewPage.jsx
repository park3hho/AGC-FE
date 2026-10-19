import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { createProduct, getNextProductCode } from '@/api/product'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import PhotoInput from '@/components/PhotoInput'
import { todayKst } from '@/utils/date'
import styles from '../Research.module.css'

// 제품 추가 — 섹션: 입력 (DESIGN.md §4.6)
// 화면 맞춤 (§4.4): 입력 섹션이 남은 높이를 채우고(넘치면 그 안에서만 스크롤), 등록 버튼은 아래 고정
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

      <Section name="입력" id="form" title={false} fill>
        {/* 코드 · 추가일은 BE 가 정한다 — 입력칸 대신 한 줄로 (높이 줄이기) */}
        <p className={styles.metaLine}>
          제품 코드 <b>{nextCode || '…'}</b>
          <span>·</span>
          추가일 <b>{todayKst()}</b>
          <span className={styles.metaNote}>(등록할 때 확정돼요)</span>
        </p>

        <div className={styles.formSplit}>
          <div className="form-group">
            <label className="form-label" htmlFor="photo">
              제품 사진
            </label>
            <PhotoInput id="photo" file={photoFile} onChange={setPhotoFile} />
          </div>

          <div className={styles.formFields}>
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
          </div>
        </div>
      </Section>

      {error && <p className="form-error">{error}</p>}

      <div className="sticky-cta">
        <button className="btn-primary btn-lg btn-full" type="submit" disabled={saving}>
          제품 등록
        </button>
      </div>
    </form>
  )
}
