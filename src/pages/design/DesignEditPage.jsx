import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import {
  approveDetailPage,
  commonBody,
  getDetailPage,
  requestDetailChanges,
  saveDetailCommon,
  saveDetailPage,
  uploadDetailExport,
} from '@/api/detailPage'
import Badge from '@/components/Badge'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import SectionTabs, { useSectionTabs } from '@/components/common/SectionTabs'
import {
  DETAIL_STATUS,
  EXPORT_MAX_UPLOAD_BYTES,
  EXPORT_PLATFORMS,
  MARKER_RE,
  TEMPLATE_WIDTH,
} from '@/constants/designConst'
import { FEATURE, hasFeature } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import { useScreen } from '@/hooks/useScreen'
import { downloadBlob, renderDetailImages } from '@/utils/exportImages'
import { makeZip } from '@/utils/zip'
import DetailEditor from './DetailEditor'
import PreviewFrame from './PreviewFrame'
import ReviewPanel from './ReviewPanel'
import styles from './Design.module.css'

// 모바일 섹션 탭 — 한 화면 = 한 섹션 (DESIGN.md §4.4)
const TABS = [
  { id: 'editor', name: '편집' },
  { id: 'preview', name: '미리보기' },
  { id: 'check', name: '휴먼 체크' },
]

// 문자열 안의 [[...]] 개수 (객체·배열 안까지)
const countMarks = (v) => {
  if (typeof v === 'string') return (v.match(MARKER_RE) || []).length
  if (Array.isArray(v)) return v.reduce((s, x) => s + countMarks(x), 0)
  if (v && typeof v === 'object') return Object.values(v).reduce((s, x) => s + countMarks(x), 0)
  return 0
}

// path 위치 값을 바꾼 새 객체 (원본은 그대로)
const setAt = (obj, [key, ...rest], value) => {
  const base = Array.isArray(obj) ? [...obj] : { ...(obj || {}) }
  base[key] = rest.length ? setAt(base[key], rest, value) : value
  return base
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// 디자인(제품) — 섹션: 편집 · 휴먼 체크 · 미리보기 · 저장 (아래 고정 바)
// 데스크탑: 왼쪽 편집 / 오른쪽 휴먼 체크 + 미리보기 (스크롤은 미리보기 안에서만)
export default function DesignEditPage() {
  const { productId } = useParams()
  const { user } = useAuth()
  const screen = useScreen()
  const canReview = hasFeature(user, FEATURE.DETAIL_REVIEW)
  const tabs = useSectionTabs(TABS)
  const pageRef = useRef(null)

  const [data, setData] = useState(null) // getDetailPage 결과
  const [error, setError] = useState('')
  const [content, setContent] = useState(null) // 편집 중
  const [saved, setSaved] = useState(null) // 마지막 저장된 content (없으면 null)
  const [common, setCommon] = useState(null) // 편집 중 공통 안내
  const [savedCommon, setSavedCommon] = useState(null)
  const [busy, setBusy] = useState('') // '' | 'save' | 'submit' | 'review' | 'common' | 'export'
  const [msg, setMsg] = useState('')

  useEffect(() => {
    getDetailPage(productId)
      .then((d) => {
        setData(d)
        setContent(d.page?.content || d.template)
        setSaved(d.page?.content || null)
        setCommon(d.common)
        setSavedCommon(d.common)
      })
      .catch((err) => setError(err.message))
  }, [productId])

  const page = data?.page || null
  const status = page?.status || 'none'
  const dirty = !saved || !same(content, saved)
  const commonDirty = !!common && !same(commonBody(common), commonBody(savedCommon))
  const markerCount = useMemo(
    () => (content && common ? countMarks(content) + countMarks(commonBody(common)) : 0),
    [content, common],
  )
  const regNoReady = !!savedCommon?.regNoReady && !commonDirty

  const flash = (text) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 2500)
  }
  const run = async (kind, fn) => {
    setBusy(kind)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }
  const applyPage = (p) => {
    setData((d) => ({ ...d, page: p }))
    setContent(p.content)
    setSaved(p.content)
  }

  const save = (submit) =>
    run(submit ? 'submit' : 'save', async () => {
      const p = await saveDetailPage(productId, content, { submit })
      applyPage(p)
      flash(submit ? '검수를 요청했어요' : '저장했어요')
    })
  // 이미지 조각(네이버 PNG · 쿠팡 JPG)을 그리고, 지금 내용의 이미지가 BE 에 없는 판매처는 올린다 (검수 권한이 있을 때만)
  //   p: 승인된 page (contentHash · exports) → 그린 조각 sets
  const exportImages = async (p) => {
    const { sets } = await renderDetailImages(pageRef.current, data.product.code)
    if (canReview) {
      const next = { ...(p.exports || {}) }
      for (const pf of EXPORT_PLATFORMS) {
        if (next[pf.key]?.current) continue
        const files = sets[pf.key]
        if (files.reduce((s, f) => s + f.blob.size, 0) > EXPORT_MAX_UPLOAD_BYTES) {
          throw new Error(
            `${pf.label} 이미지 합계가 ${EXPORT_MAX_UPLOAD_BYTES / 1024 / 1024}MB 를 넘어요`,
          )
        }
        next[pf.key] = await uploadDetailExport(productId, pf.key, p.contentHash, files)
      }
      setData((d) => ({ ...d, page: { ...d.page, exports: next } }))
    }
    return sets
  }

  // 휴먼 체크 '확인' — 승인 후 상세 이미지(네이버 PNG · 쿠팡 JPG)를 바로 저장한다
  const approve = (note) =>
    run('review', async () => {
      const p = await approveDetailPage(productId, note)
      applyPage(p)
      try {
        await exportImages(p)
      } catch (err) {
        throw new Error(
          `확인했어요. 상세 이미지 저장은 실패 — ${err.message} (이미지 내보내기로 다시)`,
        )
      }
      flash('확인했어요 · 상세 이미지를 저장했어요')
    })
  const requestChanges = (note) =>
    run('review', async () => {
      applyPage(await requestDetailChanges(productId, note))
      flash('수정을 요청했어요')
    })
  const saveCommon = () =>
    run('common', async () => {
      const { common: c, resetCount } = await saveDetailCommon(common)
      setCommon(c)
      setSavedCommon(c)
      // 이 페이지가 승인 상태였다면 검수 대기로 돌아갔다 — 다시 읽는다
      if (resetCount) setData(await getDetailPage(productId))
      flash(
        resetCount
          ? `공통 안내 저장 · 승인된 ${resetCount}개가 검수 대기로 돌아갔어요`
          : '공통 안내를 저장했어요',
      )
    })
  // 이미지 내보내기 — 네이버 860 PNG · 쿠팡 780 JPG 조각을 zip 하나로 내려받는다 (저장 안 된 판매처는 올리기도)
  const downloadImages = () =>
    run('export', async () => {
      const sets = await exportImages(page)
      const files = EXPORT_PLATFORMS.flatMap((pf) => sets[pf.key])
      downloadBlob(await makeZip(files), `상세이미지_${data.product.code}.zip`)
      flash(`이미지 ${files.length}장을 내려받았어요`)
    })

  if (!data) {
    return (
      <main className="page-flat">
        <PageHeader back title="상세페이지" />
        {error && <p className="form-error">{error}</p>}
      </main>
    )
  }

  const st = DETAIL_STATUS[status]
  const exportReady = status === 'approved' && !dirty && !commonDirty
  // 미리보기 이름표 옆 — 저장된 상세 이미지 버전 (지금 내용과 다르면 '예전')
  const exportNote = EXPORT_PLATFORMS.map((pf) => {
    const e = page?.exports?.[pf.key]
    return e ? `${pf.label} v${e.version}${e.current ? '' : '(예전)'}` : null
  })
    .filter(Boolean)
    .join(' · ')
  const canSubmit = !['review', 'approved'].includes(status) || dirty

  return (
    <main className="page-flat">
      <PageHeader
        back
        title={data.product.titleKo || data.product.titleCn}
        sub={
          <>
            {data.product.code} · <Badge tone={st.tone}>{st.label}</Badge>
            {markerCount > 0 && (
              <span className={styles.markCount}> 확인 표시 {markerCount}개</span>
            )}
          </>
        }
      />
      <SectionTabs {...tabs} />

      {/* 왼쪽 열: 편집 + 휴먼 체크 · 오른쪽 열: 미리보기 (열 하나를 다 쓴다) */}
      <div className={`fit-row ${styles.layout}`}>
        <div
          className={`fit-col ${tabs.mobile && tabs.value === 'preview' ? 'mobile-hidden' : ''}`}
        >
          <Section name="편집" id="editor" fill="stretch" className={tabs.hide('editor')}>
            <DetailEditor
              content={content}
              onChange={(path, value) => setContent((c) => setAt(c, path, value))}
              photos={data.photos}
              common={common}
              setCommon={setCommon}
              commonProps={{
                canEdit: canReview,
                dirty: commonDirty,
                saving: busy === 'common',
                onSave: saveCommon,
              }}
            />
          </Section>

          <Section name="휴먼 체크" id="check" className={tabs.hide('check')}>
            <ReviewPanel
              key={`${page?.status}-${page?.updatedAt}`}
              page={page}
              canReview={canReview}
              dirty={dirty || commonDirty}
              markerCount={markerCount}
              regNoReady={regNoReady}
              busy={!!busy}
              onApprove={approve}
              onRequestChanges={requestChanges}
            />
          </Section>
        </div>

        <Section
          name="미리보기"
          id="preview"
          sub={exportNote ? `${TEMPLATE_WIDTH}px · 이미지 ${exportNote}` : `${TEMPLATE_WIDTH}px`}
          flush
          fill="stretch"
          className={tabs.hide('preview')}
          action={
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={!exportReady || !!busy}
              title={
                exportReady
                  ? '네이버 860px PNG(무손실) · 쿠팡 780px JPG(품질 100), 3000px 이하 조각 (zip)'
                  : '휴먼 체크에서 확인한 상세페이지만 내보낼 수 있어요'
              }
              onClick={downloadImages}
            >
              {busy === 'export' ? '만드는 중…' : '이미지 내보내기'}
            </button>
          }
        >
          <PreviewFrame ref={pageRef} content={content} common={common} />
        </Section>
      </div>

      {/* 저장 바는 화면 아래에 붙어 있어야 해서 Section 대신 이름표만 단다 */}
      <div className={`sticky-cta ${styles.saveBar}`} data-section={`${screen.name} › 저장`}>
        <span className={styles.saveStatus}>
          {error ? (
            <span className="form-error">{error}</span>
          ) : (
            msg ||
            (!page
              ? '아직 저장 안 함 — 템플릿으로 채운 초안이에요'
              : dirty
                ? status === 'approved'
                  ? '바꾼 내용을 저장하면 다시 확인해야 해요'
                  : '저장 안 한 변경이 있어요'
                : `${page.updatedBy?.name || '-'} 저장`)
          )}
        </span>
        <span className={styles.saveButtons}>
          <button
            type="button"
            className="btn-secondary btn-md"
            disabled={(!dirty && !!page) || !!busy}
            onClick={() => save(false)}
          >
            {busy === 'save' ? '저장 중…' : '저장'}
          </button>
          <button
            type="button"
            className="btn-primary btn-md"
            disabled={!canSubmit || !!busy}
            onClick={() => save(true)}
          >
            {busy === 'submit' ? '요청 중…' : '저장하고 검수 요청'}
          </button>
        </span>
      </div>
    </main>
  )
}
