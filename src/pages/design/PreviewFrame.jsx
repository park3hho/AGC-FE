import { forwardRef, useLayoutEffect, useRef, useState } from 'react'

import DetailTemplate from '@/components/DetailTemplate'
import { TEMPLATE_WIDTH } from '@/constants/designConst'
import styles from './Design.module.css'

// 디자인(제품) › 미리보기 — 860px 페이지를 칸 폭에 맞게 줄여 보여준다.
// 칸 높이는 줄인 높이만큼 잡히고, 섹션 본문(Section fill)이 그 안에서 스크롤된다.
// ref 는 줄이지 않은 원본 페이지(.dp) — JPG 내보내기에 쓴다.
const PreviewFrame = forwardRef(function PreviewFrame(
  {
    content, // object: DetailContent
    common, // object: 공통 안내
  },
  ref,
) {
  const boxRef = useRef(null)
  const innerRef = useRef(null)
  const [scale, setScale] = useState(0.5)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    const box = boxRef.current
    const inner = innerRef.current
    if (!box || !inner) return undefined
    const measure = () => {
      const cs = getComputedStyle(box)
      const w = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      if (w <= 0) return // 모바일 탭으로 가려진 동안은 재지 않는다
      const s = Math.min(1, w / TEMPLATE_WIDTH)
      setScale(s)
      setHeight(inner.offsetHeight * s)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    ro.observe(inner)
    measure()
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={boxRef} className={styles.previewBox}>
      <div className={styles.previewSize} style={{ height }}>
        <div
          ref={innerRef}
          className={styles.previewInner}
          style={{ transform: `scale(${scale})`, width: TEMPLATE_WIDTH }}
        >
          <DetailTemplate ref={ref} content={content} common={common} />
        </div>
      </div>
    </div>
  )
})

export default PreviewFrame
