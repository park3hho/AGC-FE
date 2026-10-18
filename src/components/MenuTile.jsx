import Icon from '@/components/Icon'
import styles from './MenuTile.module.css'

export default function MenuTile({
  icon, // string: Icon 이름
  label, // string: 타일 제목
  sub, // string?: 보조 텍스트
  onClick, // function: 타일 클릭
}) {
  return (
    <button className={styles.tile} onClick={onClick}>
      <span className={styles.icon}>
        <Icon name={icon} />
      </span>
      <span>
        <span className={styles.label}>{label}</span>
        {sub && <span className={styles.sub}>{sub}</span>}
      </span>
    </button>
  )
}
