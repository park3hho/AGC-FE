import { useScreen } from '@/hooks/useScreen'
import styles from './Section.module.css'

// 화면의 한 덩어리 — 이름으로 부를 수 있게 모든 내용은 섹션 안에 둔다 (DESIGN.md §4.6)
// 부르는 법: '화면 이름 › 섹션 이름' (예: 홈 › 할 일). 섹션 이름 보기를 켜면 이 이름표가 뜬다.
export default function Section({
  name, // string: 섹션 이름 (한글, 화면에 보임) — 한 화면 안에서 겹치지 않게
  id, // string: 영문 kebab-case id
  title = true, // boolean | string?: 머리 제목 — true 면 name, 문자열이면 그 글자, false 면 숨김
  sub, // ReactNode?: 제목 옆 보조 글자 (건수 등)
  action, // ReactNode?: 머리 오른쪽 (버튼 등)
  plain, // boolean?: 패널(흰 바탕 + 테두리) 없이
  flush, // boolean?: 본문 안쪽 여백 없이 (표 · 목록이 가장자리까지)
  className, // string?: 바깥 클래스 추가
  children,
}) {
  const screen = useScreen()
  const label = screen.name ? `${screen.name} › ${name}` : name
  const heading = title === true ? name : title
  const cls = [styles.section, plain ? styles.plain : styles.panel, className].filter(Boolean)

  return (
    <section id={id} data-section={label} className={cls.join(' ')}>
      {(heading || action) && (
        <div className={styles.head}>
          {heading && <h2 className={styles.title}>{heading}</h2>}
          {sub && <span className={styles.sub}>{sub}</span>}
          {action && <div className={styles.action}>{action}</div>}
        </div>
      )}
      <div className={flush ? styles.flush : styles.body}>{children}</div>
    </section>
  )
}
