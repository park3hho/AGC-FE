import { useState } from 'react'

import { REVIEW_ACTION_LABEL, REVIEW_CHECKS } from '@/constants/designConst'
import styles from './Design.module.css'

const kst = (iso) =>
  iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 16) : ''

// 디자인(제품) › 휴먼 체크 — 사람이 미리보기를 보며 항목을 전부 체크해야 '승인'이 켜진다.
// BE 도 같은 조건을 다시 확인한다 (docs/api-contract.md approve). 수정 요청은 메모 필수.
export default function ReviewPanel({
  page, // object?: 저장된 상세페이지 (없으면 null)
  canReview, // boolean: 검수 권한 (detail_review)
  dirty, // boolean: 저장 안 한 변경이 있음 (내용 또는 공통 안내)
  markerCount, // number: 남은 확인 표시 [[...]] 수 (내용 + 공통 안내)
  regNoReady, // boolean: 공통 안내에 실제 등록번호가 있음
  busy, // boolean: 요청 중
  onApprove, // function(checks, note)
  onRequestChanges, // function(note)
}) {
  const [checked, setChecked] = useState({})
  const [note, setNote] = useState('')
  const status = page?.status || 'none'
  const inReview = status === 'review'

  const blockedBy = (c) => {
    if (c.needs === 'regNo' && !regNoReady)
      return '등록번호가 아직 비어 있어요 — S6 공통 안내에서 넣어요'
    if (c.needs === 'noMarks' && markerCount > 0)
      return `노란 확인 표시가 ${markerCount}개 남아 있어요`
    return ''
  }
  const canTick = canReview && inReview && !dirty
  const allTicked = REVIEW_CHECKS.every((c) => checked[c.key] && !blockedBy(c))
  const canApprove = canTick && allTicked && !busy

  const reason = !page
    ? '먼저 저장하고 검수를 요청해요'
    : !canReview
      ? '검수 권한이 없어요'
      : status === 'approved'
        ? `승인됨 — ${page.reviewedBy?.name || '-'} · ${kst(page.reviewedAt)}`
        : !inReview
          ? '검수 요청을 하면 체크할 수 있어요'
          : dirty
            ? '저장 안 한 변경이 있어요 — 저장한 뒤 체크해요'
            : allTicked
              ? '모두 확인했어요'
              : '미리보기를 보며 하나씩 확인해요'

  return (
    <div className={styles.review}>
      <ul className={styles.checks}>
        {REVIEW_CHECKS.map((c) => {
          const block = blockedBy(c)
          const isOn =
            status === 'approved' ? page.reviewChecks.includes(c.key) : !!checked[c.key] && !block
          return (
            <li key={c.key}>
              <label
                className={`${styles.check} ${block ? styles.checkBlocked : ''}`}
                title={c.hint}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  disabled={!canTick || !!block}
                  onChange={(e) => setChecked({ ...checked, [c.key]: e.target.checked })}
                />
                <span>
                  <b>{c.label}</b>
                  <small>{block || c.hint}</small>
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      <div className={styles.reviewBar}>
        <input
          className={styles.in}
          value={note}
          disabled={!canReview || !['review', 'approved'].includes(status) || busy}
          onChange={(e) => setNote(e.target.value)}
          placeholder="메모 (수정 요청은 필수)"
        />
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={!canReview || !['review', 'approved'].includes(status) || !note.trim() || busy}
          onClick={() => onRequestChanges(note.trim())}
        >
          수정 요청
        </button>
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={!canApprove}
          onClick={() =>
            onApprove(
              REVIEW_CHECKS.map((c) => c.key),
              note.trim(),
            )
          }
        >
          승인
        </button>
      </div>
      <p className={styles.reviewReason}>
        {reason}
        {page?.reviewNote && status === 'changes' && ` · 요청: ${page.reviewNote}`}
        {page?.reviews?.[0] &&
          ` · 마지막 기록: ${REVIEW_ACTION_LABEL[page.reviews[0].action] || page.reviews[0].action} (${
            page.reviews[0].user?.name || '자동'
          } ${kst(page.reviews[0].createdAt)})`}
      </p>
    </div>
  )
}
