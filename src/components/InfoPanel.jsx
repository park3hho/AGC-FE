import { useEffect } from 'react'

import styles from './InfoPanel.module.css'

// 공통 › 안내 — 화면 제목 옆 ⓘ 를 누르면 뜨는 규칙 안내 (PageHeader info). 섹션 목록 그대로 보여준다.
//   sections: [{ title, items: [string] }] — 줄 앞의 '!' 는 꼭 지킬 것(강조)
export default function InfoPanel({
  title, // string: 안내 제목
  updated, // string?: 마지막 수정일
  source, // string?: 원문 위치 설명
  sections, // Array<{ title, items }>
  onClose, // function
}) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-section="공통 › 안내"
      >
        <div className={styles.head}>
          <b>{title}</b>
          {updated && <small>{updated} 기준</small>}
          <button type="button" className={styles.close} aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.body}>
          {sections.map((s) => (
            <section key={s.title} className={styles.group}>
              <h3>{s.title}</h3>
              <ul>
                {s.items.map((it) => {
                  const must = it.startsWith('!')
                  return (
                    <li key={it} className={must ? styles.must : undefined}>
                      {must ? it.slice(1) : it}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
        {source && <div className={styles.foot}>{source}</div>}
      </div>
    </>
  )
}
