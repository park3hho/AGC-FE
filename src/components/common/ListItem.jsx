import styles from './ListItem.module.css'

export default function ListItem({
  left, // ReactNode?: 왼쪽 영역 (썸네일 등)
  title, // string: 행 제목
  sub, // string?: 보조 텍스트
  right, // ReactNode?: 오른쪽 영역
  disabled, // boolean?: 비활성
  onClick, // function?: 행 클릭
}) {
  return (
    <button className={styles.item} onClick={onClick} disabled={disabled}>
      {left}
      <div className={styles.body}>
        <div className={styles.title}>{title}</div>
        {sub && <div className={styles.sub}>{sub}</div>}
      </div>
      {right && <div className={styles.right}>{right}</div>}
    </button>
  )
}
