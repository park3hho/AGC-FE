import { useLayoutEffect, useRef, useState } from 'react'

// 섹션 본문 높이에 맞는 행 수 — 페이지 넘김의 한 페이지 크기 (DESIGN.md §4.4)
//   const bodyRef = useRef(null)
//   const size = useFitRows(bodyRef, { fallback: 65 })
//   <Section fill bodyRef={bodyRef} footer={<Pager … />}> … <tr data-fit-row> … </Section>
// ref: 높이를 잴 본문 (Section bodyRef) — 스크롤 영역이라 내용과 상관없이 높이가 정해져 있어야 한다
// rowSelector: 행 요소 (화면에 보이는 첫 행의 높이를 잰다) — 기본: data-fit-row 를 단 행, data-fit-list 의 자식
// headSelector: 본문 안 고정 머리 (표 thead 등)
// fallback: 행을 아직 못 잴 때 높이(px) · min: 최소 행 수 (들어가는 것보다 크면 그만큼 섹션 안 스크롤이 생긴다)
export function useFitRows(
  ref,
  {
    rowSelector = '[data-fit-row], [data-fit-list] > *',
    headSelector = '[data-fit-head]',
    fallback = 56,
    min = 1,
  } = {},
) {
  const [rows, setRows] = useState(min)
  const measure = useRef(() => {})
  const observer = useRef({ ro: null, el: null })

  measure.current = () => {
    const el = ref.current
    if (!el) return
    const firstVisible = (sel) =>
      [...el.querySelectorAll(sel)].find((n) => n.getBoundingClientRect().height > 0)
    const rowH = firstVisible(rowSelector)?.getBoundingClientRect().height || fallback
    const headH = firstVisible(headSelector)?.getBoundingClientRect().height || 0
    const style = getComputedStyle(el)
    const inner =
      el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - headH
    const n = Math.max(min, Math.floor(inner / rowH))
    setRows((prev) => (prev === n ? prev : n))
  }

  // 그릴 때마다 다시 잰다 (행이 처음 그려지면 실제 높이로 바뀜) — 값이 같으면 다시 그리지 않는다.
  // 본문 요소가 바뀌면(데이터를 받은 뒤 섹션이 처음 그려지는 화면) 크기 감시도 새 요소로 옮긴다
  useLayoutEffect(() => {
    const el = ref.current
    const o = observer.current
    if (el !== o.el) {
      o.ro?.disconnect()
      o.ro = el ? new ResizeObserver(() => measure.current()) : null
      o.ro?.observe(el)
      o.el = el
    }
    measure.current()
  })

  // 화면을 떠날 때 감시 끄기
  useLayoutEffect(() => () => observer.current.ro?.disconnect(), [])

  return rows
}
