import Icon from '@/components/Icon'
import styles from './Thumb.module.css'

export default function Thumb({
  src, // string?: 이미지 URL — 없으면 빈 칸 아이콘
  size = 52, // number?: 픽셀 크기
}) {
  return (
    <span className={styles.thumb} style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" /> : <Icon name="photo" size={size * 0.4} />}
    </span>
  )
}
