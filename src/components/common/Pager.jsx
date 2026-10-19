import styles from './Pager.module.css'

// 페이지 넘김 — 이전 · n / 전체 · 다음
export default function Pager({
  page, // number: 지금 페이지 (1부터)
  pageCount, // number: 전체 페이지 수
  total, // number?: 전체 건수 (왼쪽에 표시)
  onChange, // function(page): 페이지 바꿈
}) {
  if (pageCount <= 1) return total != null ? <div className={styles.pager}>{total}개</div> : null
  return (
    <div className={styles.pager}>
      <span>{total != null && `${total}개`}</span>
      <span className={styles.ctrl}>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          이전
        </button>
        <b>
          {page} / {pageCount}
        </b>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
        >
          다음
        </button>
      </span>
    </div>
  )
}
