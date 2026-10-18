import { useEffect, useRef, useState } from 'react'

import Icon from '@/components/Icon'
import styles from './PhotoInput.module.css'

export default function PhotoInput({
  id, // string: label 연결용 id
  file, // File?: 선택된 사진
  onChange, // function: (File | null) => void
}) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState('')

  useEffect(() => {
    if (!file) return setPreview('')
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const pick = (e) => {
    const next = e.target.files?.[0]
    if (next) onChange(next)
    e.target.value = ''
  }

  return (
    <div className={styles.wrap}>
      <input ref={inputRef} id={id} type="file" accept="image/*" hidden onChange={pick} />
      {preview ? (
        <>
          <img className={styles.photo} src={preview} alt="제품 사진" />
          <div className={styles.actions}>
            <button type="button" className="btn-secondary btn-sm" onClick={() => inputRef.current.click()}>
              바꾸기
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => onChange(null)}>
              삭제
            </button>
          </div>
        </>
      ) : (
        <button type="button" className={styles.drop} onClick={() => inputRef.current.click()}>
          <Icon name="photo" />
          사진 올리기
        </button>
      )}
    </div>
  )
}
