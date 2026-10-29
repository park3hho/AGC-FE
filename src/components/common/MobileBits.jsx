import { useState } from 'react'

import styles from './MobileBits.module.css'

// 모바일 폼 · 상세에서 쓰는 작은 부품 (플레이북 'AGC 모바일 화면 설계' §3.5 · §3.6)

// 값 복사 — 누르면 잠깐 '복사됨'
export function CopyButton({ value, label = '복사', className = '' }) {
  const [done, setDone] = useState(false)
  if (!value) return null
  const copy = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(String(value))
      setDone(true)
      setTimeout(() => setDone(false), 1200)
    } catch {
      /* 권한 없음 — 조용히 넘어간다 */
    }
  }
  return (
    <button type="button" className={`${styles.copy} ${className}`} onClick={copy}>
      {done ? '복사됨' : label}
    </button>
  )
}

// 입력칸 + 붙여넣기 — 주문번호 · 운송장처럼 다른 앱에서 복사해 오는 값.
//   나머지 props 는 <input> 에 그대로. onValue(텍스트) 로 붙여넣은 값을 받는다.
export function PasteInput({ onValue, wrapClassName = '', ...props }) {
  const canRead = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText
  const paste = async () => {
    try {
      const t = (await navigator.clipboard.readText()).trim()
      if (t) onValue(t)
    } catch {
      /* 권한 없음 — 길게 눌러 직접 붙여넣기 */
    }
  }
  return (
    <span className={`${styles.paste} ${wrapClassName}`}>
      <input {...props} />
      {canRead && !props.disabled && (
        <button type="button" onClick={paste} tabIndex={-1}>
          붙여넣기
        </button>
      )}
    </span>
  )
}

// 2~4개 중 하나 — 한 줄 버튼 (드롭다운 대신). options: [{ value, label }]
export function ChoiceRow({ options, value, onChange, disabled, ariaLabel }) {
  return (
    <div className={styles.choice} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? styles.on : ''}
          disabled={disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// 접는 칸 — 자주 안 쓰는 입력 묶음. defaultOpen 이면 처음부터 펼침
export function Fold({ title, sub, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={styles.fold}>
      <button
        type="button"
        className={styles.foldHead}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>
          {title}
          {sub && <small> · {sub}</small>}
        </span>
        <span className={styles.foldMark}>{open ? '접기 ⌃' : '펼치기 ⌄'}</span>
      </button>
      {open && <div className={styles.foldBody}>{children}</div>}
    </div>
  )
}
