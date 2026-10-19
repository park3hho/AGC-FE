import { useNavigate } from 'react-router-dom'

import Icon from '@/components/Icon'
import styles from './PageHeader.module.css'

// 화면 머리 — 제목 · 한 줄 설명 · 오른쪽 버튼. 섹션이 아니라 화면 이름 자리라 이름표를 달지 않는다.
export default function PageHeader({
  title, // string: 화면 제목
  sub, // ReactNode?: 제목 아래 한 줄 설명
  back, // boolean?: 이전 버튼 표시
  action, // ReactNode?: 오른쪽 영역
}) {
  const navigate = useNavigate()

  return (
    <header className={styles.header}>
      {back && (
        <button
          type="button"
          className={styles.back}
          onClick={() => navigate(-1)}
          aria-label="이전"
        >
          <Icon name="arrowLeft" size={20} />
        </button>
      )}
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {sub && <p className={styles.sub}>{sub}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </header>
  )
}
