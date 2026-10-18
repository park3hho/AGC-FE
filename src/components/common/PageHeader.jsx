import { useNavigate } from 'react-router-dom'
import styles from './PageHeader.module.css'

export default function PageHeader({
  title, // string: 화면 제목
  back, // boolean?: 이전 버튼 표시
  action, // ReactNode?: 오른쪽 영역
}) {
  const navigate = useNavigate()

  return (
    <header className={styles.header}>
      {back && (
        <button className="btn-ghost btn-sm" onClick={() => navigate(-1)}>
          이전
        </button>
      )}
      <h1 className={styles.title}>{title}</h1>
      {action && <div className={styles.action}>{action}</div>}
    </header>
  )
}
