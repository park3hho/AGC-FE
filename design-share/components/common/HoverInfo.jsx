import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import styles from './HoverInfo.module.css'

// 마우스를 올리면(또는 눌러서 포커스하면) 아래에 작은 설명 상자를 띄운다 — 첫 화면엔 숫자만, 구성은 여기서.
// 섹션 안 스크롤에 잘리지 않게 body 에 fixed 로 그린다.
//   <HoverInfo content={<div>…</div>}><b>18,400원</b></HoverInfo>
const WIDTH = 248

export default function HoverInfo({
  content, // ReactNode: 띄울 내용 — 없으면 그냥 children
  children,
}) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  if (!content) return children

  const open = () => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const left = Math.max(
      8,
      Math.min(r.left + r.width / 2 - WIDTH / 2, window.innerWidth - WIDTH - 8),
    )
    const below = r.bottom + 8
    // 아래 자리가 모자라면 위로
    setPos(
      window.innerHeight - below < 200
        ? { left, bottom: window.innerHeight - r.top + 8 }
        : { left, top: below },
    )
  }
  const close = () => setPos(null)

  return (
    <>
      <span
        ref={ref}
        className={styles.target}
        tabIndex={0}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
      >
        {children}
      </span>
      {pos &&
        createPortal(
          <div className={styles.box} style={{ ...pos, width: WIDTH }} role="tooltip">
            {content}
          </div>,
          document.body,
        )}
    </>
  )
}
