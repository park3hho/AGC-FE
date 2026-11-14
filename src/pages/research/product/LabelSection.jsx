import { useRef, useState } from 'react'

import { updateProductLabels, uploadPhoto } from '@/api/product'
import Section from '@/components/common/Section'
import styles from './ProductDetail.module.css'

// 성분 자료 — 수입신고(식약처) 때 전성분·영양성분 확인용으로 첨부한다.
// 신고할 때 여기 있으면 그대로 쓰고, 없으면 찾아서 여기에 저장한다 (2026-11-14, playbooks/import-declaration.md)
const MAX = 10

export default function LabelSection({ product, onSaved, className, fill }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [nutrition, setNutrition] = useState('')
  const fileRef = useRef(null)
  const paths = product.labelPaths || []

  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      onSaved(await fn())
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const addFiles = (files) =>
    run(async () => {
      const room = MAX - paths.length
      const picked = Array.from(files || []).slice(0, room)
      const added = []
      for (const f of picked) added.push(await uploadPhoto(f))
      return updateProductLabels(product.id, { labelPaths: [...paths, ...added] })
    })

  const remove = (path) =>
    run(() => updateProductLabels(product.id, { labelPaths: paths.filter((p) => p !== path) }))

  const saveNutrition = () =>
    run(async () => {
      const p = await updateProductLabels(product.id, { nutrition })
      setEditing(false)
      return p
    })

  return (
    <Section
      name="성분 자료"
      id="label-info"
      sub={paths.length ? `성분표 ${paths.length}장` : '성분표 없음'}
      fill={fill}
      className={className}
      action={
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            className="btn-secondary btn-sm"
            onClick={() => fileRef.current?.click()}
            disabled={busy || paths.length >= MAX}
          >
            성분표 올리기
          </button>
        </>
      }
    >
      {paths.length > 0 ? (
        <div className={styles.labelGrid}>
          {paths.map((path, i) => (
            <div key={path} className={styles.labelItem}>
              <a href={product.labelImages[i]} target="_blank" rel="noreferrer" title="크게 보기">
                <img src={product.labelImages[i]} alt={`성분표 ${i + 1}`} />
              </a>
              <button
                className={styles.labelDel}
                onClick={() => remove(path)}
                disabled={busy}
                aria-label="성분표 지우기"
                title="지우기"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.infoEmpty}>성분표·영양성분표 이미지가 없어요. 수입신고 때 찾으면 여기에 저장돼요.</p>
      )}
      <dl className={styles.infoRows}>
        <div className={styles.infoRow}>
          <dt>영양성분</dt>
          {editing ? (
            <dd>
              <textarea
                className="form-input"
                rows={3}
                value={nutrition}
                placeholder="100ml당 열량 25kcal, 탄수화물 6g, 당류 6g …"
                onChange={(e) => setNutrition(e.target.value)}
              />
              <div className={styles.labelActions}>
                <button className="btn-ghost btn-sm" onClick={() => setEditing(false)} disabled={busy}>
                  취소
                </button>
                <button className="btn-primary btn-sm" onClick={saveNutrition} disabled={busy}>
                  저장
                </button>
              </div>
            </dd>
          ) : (
            <dd
              className={product.nutrition ? '' : styles.infoEmpty}
              title={product.nutrition || ''}
              onClick={() => {
                setNutrition(product.nutrition || '')
                setEditing(true)
              }}
              style={{ cursor: 'pointer' }}
            >
              {product.nutrition || '비어 있음 (눌러서 입력)'}
            </dd>
          )}
        </div>
      </dl>
      {error && <p className="form-error">{error}</p>}
    </Section>
  )
}
