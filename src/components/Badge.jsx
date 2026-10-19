import styles from './Badge.module.css'

// 상태 배지 (점 + 글자)
export default function Badge({
  tone = 'neutral', // string?: 'success' | 'warning' | 'primary' | 'neutral'
  children,
}) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>
}
