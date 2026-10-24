import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { getCollectStatus, ORDERS_COLLECTED_EVENT } from '@/api/order'
import { FEATURE, hasFeature } from '@/constants/permissions'
import { MARKETS } from '@/constants/orderConst'
import { useAuth } from '@/hooks/useAuth'
import styles from './AppLayout.module.css'

const REFRESH_MS = 60000 // 1분마다 다시 읽기

// 'MM-DD HH:mm' (KST)
const kstShort = (iso) =>
  iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(5, 16) : '-'

// 마켓 1곳 — 마지막으로 가져온 시각 · 수동/자동. 그때 건수는 마우스를 올리면, 실패면 빨갛게
function MarketRun({
  market, // 'naver' | 'coupang'
  run, // object | null: 마지막 수집
}) {
  if (!run) return <span className={styles.footWeak}>{MARKETS[market].label} 아직 안 가져옴</span>
  const when = `${kstShort(run.finishedAt || run.startedAt)} ${run.trigger === 'poller' ? '자동' : '수동'}`
  if (run.ok === false) {
    return (
      <span className={styles.footBad} title={run.error}>
        {MARKETS[market].label} 실패 · {when}
      </span>
    )
  }
  return (
    <span
      title={`마지막 가져오기 결과 — 받은 ${run.fetched} · 새 주문 ${run.created} · 변경 ${run.changed} · 통관부호 검증 ${run.checked}`}
    >
      {MARKETS[market].label}{' '}
      <span className={styles.footWeak}>{run.ok === null ? '가져오는 중' : when}</span>
    </span>
  )
}

// 공통 › 아래 바 — 모든 화면 맨 아래 한 줄 (왼쪽 메뉴·위쪽 바처럼 틀의 일부, 데스크탑만)
// 지금은 주문 수집 상태. 누르면 주문 접수로
export default function Footer() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const canOrder = hasFeature(user, FEATURE.ORDER)
  const [status, setStatus] = useState(null) // { lastRuns, pollMinutes }

  const load = useCallback(() => {
    if (!canOrder) return
    getCollectStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
  }, [canOrder])

  useEffect(() => {
    load()
  }, [load, pathname])

  useEffect(() => {
    if (!canOrder) return undefined
    const timer = setInterval(load, REFRESH_MS)
    window.addEventListener(ORDERS_COLLECTED_EVENT, load)
    return () => {
      clearInterval(timer)
      window.removeEventListener(ORDERS_COLLECTED_EVENT, load)
    }
  }, [canOrder, load])

  return (
    <footer className={styles.footer} data-section="공통 › 아래 바">
      {canOrder && status && (
        <Link to="/orders" className={styles.footItem}>
          <b>주문 수집</b>
          <MarketRun market="naver" run={status.lastRuns.naver} />
          <MarketRun market="coupang" run={status.lastRuns.coupang} />
          <span className={styles.footWeak}>
            자동 {status.pollMinutes ? `${status.pollMinutes}분마다` : '꺼짐'}
          </span>
        </Link>
      )}
      <span className={styles.footRight}>AGC 구매대행</span>
    </footer>
  )
}
