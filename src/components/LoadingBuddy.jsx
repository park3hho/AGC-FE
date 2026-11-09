import { useEffect, useState, useSyncExternalStore } from 'react'

import { useLocation } from 'react-router-dom'

import { pendingCount, subscribePending } from '@/api/client'
import styles from './LoadingBuddy.module.css'

const LINES = ['불러오는 중이에요', '보바 건지는 중…', '조금만 기다려 주세요', '거의 다 왔어요']

// 로딩 캐릭터 '보바' — 버블티 컵이 통통 튀며 기다린다 (2026-11-09 사용자 요청 "귀여운 로딩 캐릭터")
//   색은 테마 토큰만 (기본 · 넷러너 둘 다). 빨리 끝나는 로딩은 깜빡이지 않게 delay 뒤에 나온다
export default function LoadingBuddy({
  delay = 300, // number?: 이 시간(ms)보다 오래 걸릴 때만 보인다
  overlay = false, // boolean?: true = 부모 칸 가운데 위에 띄움 (뒤 화면은 그대로, 클릭은 통과)
  full = false, // boolean?: true = 창 전체 가운데 (앱을 처음 열 때)
}) {
  const [shown, setShown] = useState(delay <= 0)
  const [line, setLine] = useState(0)
  useEffect(() => {
    if (delay <= 0) return undefined
    const t = setTimeout(() => setShown(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  useEffect(() => {
    if (!shown) return undefined
    const t = setInterval(() => setLine((n) => (n + 1) % LINES.length), 1800)
    return () => clearInterval(t)
  }, [shown])
  if (!shown) return null

  const cls = [styles.wrap, overlay && styles.overlay, full && styles.full]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls} role="status" aria-live="polite">
      <div className={styles.buddy}>
        <svg viewBox="0 0 80 96" width="72" height="86" aria-hidden="true">
          {/* 빨대 */}
          <rect
            className={styles.straw}
            x="44"
            y="2"
            width="7"
            height="30"
            rx="3"
            transform="rotate(12 47 17)"
          />
          {/* 뚜껑 */}
          <path className={styles.lid} d="M14 30 Q40 14 66 30 Z" />
          <rect className={styles.lid} x="11" y="29" width="58" height="7" rx="3.5" />
          {/* 컵 */}
          <path className={styles.cup} d="M15 36 H65 L59 88 Q58 92 54 92 H26 Q22 92 21 88 Z" />
          {/* 밀크티 */}
          <path
            className={styles.tea}
            d="M17.6 58 H62.4 L59 88 Q58 90.5 54 90.5 H26 Q22 90.5 21 88 Z"
          />
          {/* 보바 */}
          <g className={styles.boba}>
            <circle cx="28" cy="84" r="3.6" />
            <circle cx="37" cy="86" r="3.6" />
            <circle cx="46" cy="84.5" r="3.6" />
            <circle cx="54" cy="81" r="3.6" />
            <circle cx="33" cy="78" r="3.6" />
            <circle cx="49" cy="76.5" r="3.6" />
          </g>
          {/* 얼굴 */}
          <g className={styles.eyes}>
            <ellipse cx="31" cy="48" rx="3.2" ry="4" />
            <ellipse cx="49" cy="48" rx="3.2" ry="4" />
          </g>
          <circle className={styles.shine} cx="32.2" cy="46.6" r="1.1" />
          <circle className={styles.shine} cx="50.2" cy="46.6" r="1.1" />
          <ellipse className={styles.cheek} cx="24.5" cy="54" rx="4" ry="2.4" />
          <ellipse className={styles.cheek} cx="55.5" cy="54" rx="4" ry="2.4" />
          <path className={styles.mouth} d="M36.5 53.5 Q40 57 43.5 53.5" />
        </svg>
        <span className={styles.shadow} />
      </div>
      <p className={styles.text}>{LINES[line]}</p>
    </div>
  )
}

// 화면이 API 를 기다리는 동안 본문 가운데에 보바를 띄운다 (AppLayout). 빨리 끝나면 안 보인다
//   화면을 연 뒤 8초 안의 로딩만 — 1분마다 도는 뒤쪽 새로고침(아래 바 · 탭 숫자)에는 안 뜬다
export function PendingBuddy() {
  const { pathname } = useLocation()
  const n = useSyncExternalStore(subscribePending, pendingCount, () => 0)
  const [navAt, setNavAt] = useState(() => Date.now())
  useEffect(() => setNavAt(Date.now()), [pathname])
  return n > 0 && Date.now() - navAt < 8000 ? <LoadingBuddy overlay delay={400} /> : null
}
