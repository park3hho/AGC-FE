import { useLayoutEffect, useRef, useState } from 'react'

const padY = (s) => parseFloat(s.paddingTop) + parseFloat(s.paddingBottom)

// 본문이 쓸 수 있는 최대 높이 — 섹션이 내용만큼 줄어든 상태(Section fill)에서도
// '부모의 남은 높이'로 잰다. 부모가 grid(.fit-row)면 칸 높이, flex 세로면 형제를 뺀 높이.
function availableBodyHeight(body) {
  const section = body.closest('section') || body
  const parent = section.parentElement
  if (!parent) return body.clientHeight
  const ps = getComputedStyle(parent)
  let avail
  if (ps.display.includes('grid')) {
    avail = parent.clientHeight - padY(ps)
  } else {
    const gap = parseFloat(ps.rowGap) || 0
    const others = [...parent.children].filter(
      (c) =>
        c !== section &&
        c.getBoundingClientRect().height > 0 &&
        getComputedStyle(c).position !== 'absolute',
    )
    const used = others.reduce((sum, c) => sum + c.getBoundingClientRect().height, 0)
    avail = parent.clientHeight - padY(ps) - used - gap * others.length
  }
  // 섹션에서 본문을 뺀 부분 (머리 · footer) — 칸이 늘어나 본문 아래가 비어 있어도 그 빈 곳은 빼지 않는다
  const chrome =
    section === body
      ? 0
      : [...section.children]
          .filter(
            (c) => c !== body && !c.contains(body) && getComputedStyle(c).position !== 'absolute',
          )
          .reduce((sum, c) => sum + c.getBoundingClientRect().height, 0)
  return Math.max(0, avail - chrome)
}

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
  // 행 높이는 '지금 칸 높이에서 본 가장 큰 행'으로 고정한다 — 행마다 높이가 다르면(비고 줄이 있는 카드 등)
  //   페이지마다 첫 행 높이가 달라져 한 페이지 행 수 ↔ 페이지 수가 서로 바뀌며 끝없이 다시 그려진다 (React #185, 2026-10-27).
  //   칸 높이가 바뀌면(창 크기) 다시 잰다.
  const stable = useRef({ avail: -1, rowH: 0 })

  measure.current = () => {
    const el = ref.current
    if (!el || !el.getBoundingClientRect().height) return
    const firstVisible = (sel) =>
      [...el.querySelectorAll(sel)].find((n) => n.getBoundingClientRect().height > 0)
    const rowHs = [...el.querySelectorAll(rowSelector)]
      .map((n) => n.getBoundingClientRect().height)
      .filter((h) => h > 0)
    const avail = availableBodyHeight(el)
    const s = stable.current
    if (Math.round(avail) !== s.avail) {
      s.avail = Math.round(avail)
      s.rowH = 0
    }
    s.rowH = Math.max(s.rowH, rowHs.length ? Math.max(...rowHs) : 0)
    const rowH = s.rowH || fallback
    const headH = firstVisible(headSelector)?.getBoundingClientRect().height || 0
    const style = getComputedStyle(el)
    const pad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
    const inner = avail - pad - headH
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
