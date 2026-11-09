import { useState } from 'react'

import { thumbUrl } from '@/api/client'
import Icon from '@/components/Icon'
import styles from './Thumb.module.css'

// 목록 사진 칸 — 업로드 사진은 BE 가 줄인 작은 사진(/thumbs)으로 받는다 (2026-11-09 로딩 속도).
//   작은 사진을 못 받으면 원본으로 한 번 더. 화면 밖 사진은 스크롤해서 보일 때 받는다 (lazy)
export default function Thumb({
  src, // string?: 이미지 URL — 없으면 빈 칸 아이콘
  size = 52, // number?: 픽셀 크기
}) {
  const [failed, setFailed] = useState(null) // 작은 사진을 못 받은 원본 주소
  const url = src && failed !== src ? thumbUrl(src, size) : src
  return (
    <span className={styles.thumb} style={{ width: size, height: size }}>
      {src ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => url !== src && setFailed(src)}
        />
      ) : (
        <Icon name="photo" size={size * 0.4} />
      )}
    </span>
  )
}
