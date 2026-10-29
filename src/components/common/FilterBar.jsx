import { useState } from 'react'

import { useMobile } from '@/hooks/useMobile'
import BottomSheet from './BottomSheet'
import styles from './FilterBar.module.css'

// 목록 위 검색 + 필터 (플레이북 'AGC 모바일 화면 설계' §3.4)
//   데스크탑: 검색칸 옆에 드롭다운을 그대로 나란히 — 지금 화면 모양 그대로.
//   모바일: 검색칸 + '필터 n' 버튼 → 아래 시트 안에 같은 드롭다운.
//   <FilterBar search={<input …/>} active={기본값이 아닌 필터 수} onReset={…} className={화면 CSS}>{드롭다운들}</FilterBar>
export default function FilterBar({
  search, // ReactNode?: 검색 입력
  active = 0, // number: 기본값이 아닌 필터 수
  onReset, // function()?: 시트의 '초기화'
  count, // string?: 시트 아래 버튼 글자 (예: '275개 보기')
  className = '',
  children, // 필터 드롭다운들
}) {
  const mobile = useMobile()
  const [open, setOpen] = useState(false)
  if (!mobile) {
    return (
      <div className={className}>
        {search}
        {children}
      </div>
    )
  }
  return (
    <div className={`${styles.bar} ${className}`}>
      {search}
      {children && (
        <button type="button" className={styles.fbtn} onClick={() => setOpen(true)}>
          필터{active > 0 && <b>{active}</b>}
        </button>
      )}
      <BottomSheet
        open={open}
        title="필터"
        onClose={() => setOpen(false)}
        footer={
          <>
            {onReset && (
              <button type="button" className="btn-secondary btn-md" onClick={onReset}>
                초기화
              </button>
            )}
            <button type="button" className="btn-primary btn-md" onClick={() => setOpen(false)}>
              {count || '보기'}
            </button>
          </>
        }
      >
        <div className={styles.sheetFields}>{children}</div>
      </BottomSheet>
    </div>
  )
}
