import { useState } from 'react'

import { REVIEW_ACTION_LABEL } from '@/constants/designConst'
import styles from './Design.module.css'

const kst = (iso) =>
  iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 16) : ''

// 디자인(제품) › 휴먼 체크 — 사람이 미리보기를 보고 아래 바의 '확인' 한 번 누르면 저장 + 검수 완료 (승인).
//   '확인' 버튼은 아래 저장 바에만 둔다 (2026-10-29 사용자: 저장·확인 버튼 중복 정리). 여기는 메모 · 수정 요청 · 상태만.
//   체크리스트 없음 (2026-10-22 사용자 결정). 초안 · 검수 대기 · 수정 필요 어디서든 바로 확인할 수 있다.
//   등록번호 미입력은 경고만. 확인 표시([[...]])가 남으면 확인을 잠근다 — 고객 이미지에 그대로 찍히므로 (2026-10-26, BE 409).
//   수정 요청은 메모 필수. BE 규칙은 docs/api-contract.md approve.
export default function ReviewPanel({
  page, // object?: 저장된 상세페이지 (없으면 null)
  canReview, // boolean: 검수 권한 (detail_review)
  dirty, // boolean: 저장 안 한 변경이 있음 (내용 또는 공통 안내)
  markerCount, // number: 남은 확인 표시 [[...]] 수 (내용 + 공통 안내)
  regNoReady, // boolean: 공통 안내에 실제 등록번호가 있음
  busy, // boolean: 요청 중
  onRequestChanges, // function(note)
}) {
  const [note, setNote] = useState('')
  const status = page?.status || 'none'
  const approved = status === 'approved'
  const canChange = canReview && ['review', 'approved'].includes(status) && !busy

  const warn = [!regNoReady && '등록번호 미입력'].filter(Boolean)
  // 남은 확인 표시 자리 (저장된 내용 기준, BE markers) — 버튼 힌트로
  const spots = (page?.markers || []).map((m) => `${m.where} ${m.text}`).join('\n')

  const reason = !page
    ? '먼저 저장해요'
    : !canReview
      ? '검수 권한이 없어요'
      : approved
        ? `확인됨 — ${page.reviewedBy?.name || '-'} · ${kst(page.reviewedAt)}`
        : markerCount > 0
            ? '[[...]] 표시를 채우고 저장하면 확인할 수 있어요'
            : dirty
              ? '바꾼 내용이 있어요 — 아래 확인을 누르면 저장하고 검수 완료'
              : '미리보기를 보고 아래 확인을 누르면 검수 완료'

  return (
    <div className={styles.review}>
      <div className={styles.reviewBar}>
        <input
          className={styles.in}
          value={note}
          disabled={!canReview || !page || busy}
          onChange={(e) => setNote(e.target.value)}
          placeholder="메모 (수정 요청은 필수)"
        />
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={!canChange || !note.trim()}
          onClick={() => onRequestChanges(note.trim())}
        >
          수정 요청
        </button>
        {markerCount > 0 && (
          <span className={styles.markNeed} title={spots || undefined}>
            확인 필요 {markerCount}칸
          </span>
        )}
      </div>
      {markerCount > 0 && (
        <p className={styles.reviewWarn}>
          [[...]] 표시 {markerCount}칸이 남아 있어 확인 · 이미지 내보내기를 잠갔어요
          {approved ? ' (이미 확인된 페이지도 채우기 전엔 내보낼 수 없어요)' : ''}
        </p>
      )}
      {!approved && warn.length > 0 && (
        <p className={styles.reviewWarn}>{warn.join(' · ')} — 이미지에 그대로 나가요</p>
      )}
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
