import { useState } from 'react'

import { useMobile } from '@/hooks/useMobile'
import styles from './SectionTabs.module.css'

// 모바일에서 한 화면 = 한 섹션 (DESIGN.md §4.4) — 섹션이 여럿인 화면은 위 탭으로 하나씩 본다.
// 데스크탑에서는 탭이 없고 모든 섹션이 보인다.
//   const tabs = useSectionTabs([{ id: 'info', name: '기본 정보' }, …])
//   <SectionTabs {...tabs} />
//   <Section … className={tabs.hide('info')} fill={tabs.mobile || 데스크탑에서fill인지}>
export function useSectionTabs(list) {
  const mobile = useMobile()
  const [value, setValue] = useState(list[0]?.id)
  const current = list.some((t) => t.id === value) ? value : list[0]?.id
  return {
    list,
    value: current,
    onChange: setValue,
    mobile,
    // 모바일에서 지금 탭이 아니면 'mobile-hidden' (layout.css) — 데스크탑에서는 항상 ''
    hide: (id) => (mobile && id !== current ? 'mobile-hidden' : ''),
    // 모바일에서 지금 탭인지 (그 섹션이 남은 높이를 채운다)
    active: (id) => mobile && id === current,
  }
}

export default function SectionTabs({
  list, // Array<{ id, name }>: 섹션 (Section 의 id · name 과 같게)
  value, // string: 지금 보이는 섹션 id
  onChange, // function(id): 탭 바꿈
  mobile, // boolean: 모바일 틀인지 — 아니면 그리지 않는다
}) {
  if (!mobile || list.length < 2) return null
  return (
    <div className={styles.tabs} role="tablist" aria-label="섹션">
      {list.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          className={`${styles.tab} ${value === t.id ? styles.on : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.name}
        </button>
      ))}
    </div>
  )
}
