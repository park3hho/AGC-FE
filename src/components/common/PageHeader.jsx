import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Icon from '@/components/Icon'
import InfoPanel from '@/components/InfoPanel'
import { useScreen } from '@/hooks/useScreen'
import styles from './PageHeader.module.css'

// 화면 머리 — 제목 · 한 줄 설명 · 오른쪽 버튼. 섹션이 아니라 화면 이름 자리라 이름표를 달지 않는다.
export default function PageHeader({
  title, // string: 화면 제목
  sub, // ReactNode?: 제목 아래 한 줄 설명 — 모바일에서는 숨긴다
  subKeep, // boolean?: 모바일에서도 sub 를 보인다 (sub 가 화면 탭일 때 — 예: 배송 ShippingTabs)
  back, // boolean?: 이전 버튼 표시
  action, // ReactNode?: 오른쪽 영역
  info, // { title, updated?, source?, sections }?: 제목 옆 ⓘ — 누르면 이 화면 작업 규칙 패널 (components/InfoPanel)
}) {
  const navigate = useNavigate()
  const screen = useScreen()
  const [infoOpen, setInfoOpen] = useState(false)
  // 뒤로 — 앱 안에서 온 기록이 있으면 그 화면으로, 링크로 바로 열었으면(기록 없음) 상위 화면으로 (앱 밖으로 나가지 않게)
  const goBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
    else navigate(screen?.parent || '/')
  }

  return (
    // data-page-header — 모바일에서는 이 줄이 위쪽 바 자리를 대신한다 (AppLayout.module.css, 플레이북 '모바일' §3.2)
    <header className={styles.header} data-page-header>
      {back && (
        <button
          type="button"
          className={styles.back}
          onClick={goBack}
          aria-label="이전"
        >
          <Icon name="arrowLeft" size={20} />
        </button>
      )}
      <div className={styles.text}>
        <h1 className={styles.title}>
          {/* 제목 글자만 줄임표 — ⓘ 는 잘리지 않게 따로 (모바일에서 긴 제품명) */}
          <span className={styles.titleText}>{title}</span>
          {info && (
            <button
              type="button"
              className={styles.info}
              onClick={() => setInfoOpen(true)}
              aria-label={`${info.title} 보기`}
              title={info.title}
            >
              <Icon name="info" size={16} />
            </button>
          )}
        </h1>
        {sub && <div className={`${styles.sub} ${subKeep ? styles.subKeep : ''}`}>{sub}</div>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
      {infoOpen && <InfoPanel {...info} onClose={() => setInfoOpen(false)} />}
    </header>
  )
}
