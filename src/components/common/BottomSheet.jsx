import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import styles from './BottomSheet.module.css'

// 아래에서 올라오는 시트 — 모바일의 필터 · ⋯ 메뉴 · 짧은 입력 (플레이북 'AGC 모바일 화면 설계' §3.7)
//   데스크탑에서도 쓸 수 있다 (아래에 붙은 너비 480px 상자).
//   덮개를 누르거나 Esc · 브라우저 뒤로가기로 닫힌다.
export default function BottomSheet({
  open, // boolean
  title, // string?: 시트 제목
  onClose, // function()
  footer, // ReactNode?: 아래 고정 버튼 줄
  children,
}) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose()
    // 뒤로가기로 닫기 — 열 때 기록 한 칸을 넣고, 뒤로가면 닫는다
    window.history.pushState({ sheet: true }, '')
    const onPop = () => onClose()
    window.addEventListener('keydown', onKey)
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('popstate', onPop)
      if (window.history.state?.sheet) window.history.back()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null
  return createPortal(
    <div className={styles.wrap} role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className={styles.dim} aria-label="닫기" onClick={onClose} />
      <div className={styles.sheet}>
        <div className={styles.grab} />
        {title && <h2 className={styles.title}>{title}</h2>}
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

// 시트 안 한 줄 메뉴 (⋯ 메뉴)
export function SheetItem({ onClick, danger, sub, children }) {
  return (
    <button
      type="button"
      className={`${styles.item} ${danger ? styles.danger : ''}`}
      onClick={onClick}
    >
      <span>{children}</span>
      {sub && <small>{sub}</small>}
    </button>
  )
}
