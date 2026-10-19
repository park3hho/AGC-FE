import { useEffect, useState } from 'react'

import { BP } from '@/constants/breakpoints'

// 모바일·태블릿 틀(아래 탭)인지 — AppLayout 과 같은 기준 (≤ BP.tablet)
const QUERY = `(max-width: ${BP.tablet}px)`

export function useMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia(QUERY).matches)

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return mobile
}
