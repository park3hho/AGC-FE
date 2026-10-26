import { useEffect, useState } from 'react'

const KEY = 'agc.showSections'

// 섹션 이름 보기 켜기/끄기 (DESIGN.md §4.6) — 브라우저에 기억, body 에 .show-sections 를 붙인다
export function useSectionLabels() {
  const [on, setOn] = useState(() => localStorage.getItem(KEY) === '1')

  useEffect(() => {
    document.body.classList.toggle('show-sections', on)
    localStorage.setItem(KEY, on ? '1' : '0')
  }, [on])

  return [on, () => setOn((v) => !v)]
}
