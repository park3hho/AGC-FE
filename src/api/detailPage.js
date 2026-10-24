import { fileUrl, postForm, request } from '@/api/client'
import { DETAIL_TEMPLATE_VERSION } from '@/constants/designConst'
import { toKstDate } from '@/utils/date'

// 상세페이지(디자인) API — 스펙: docs/api-contract.md '상세페이지'
// content(템플릿 칸 값)는 BE 와 같은 snake_case 문서 그대로 주고받는다 (DetailTemplate 이 그대로 읽는다).
// 목록·메타 값만 camelCase 로 바꾼다.

const toUser = (u) => (u ? { id: u.id, name: u.name } : null)

const toSummary = (s) =>
  s
    ? {
        status: s.status,
        updatedAt: s.updated_at,
        updatedBy: toUser(s.updated_by),
        reviewedAt: s.reviewed_at,
        reviewedBy: toUser(s.reviewed_by),
        reviewNote: s.review_note || '',
      }
    : null

// 상세 이미지 내보내기 기록 (판매처 1곳) — current: 지금 내용으로 그린 것인지
const toExport = (e) =>
  e
    ? {
        platform: e.platform,
        version: e.version,
        contentHash: e.content_hash,
        current: !!e.current,
        template: e.template || '',
        files: (e.files || []).map((f) => ({ ...f, url: fileUrl(f.url) })),
        createdAt: e.created_at,
        createdBy: toUser(e.created_by),
      }
    : null

const toPage = (p) =>
  p
    ? {
        ...toSummary(p),
        id: p.id,
        content: p.content,
        reviewChecks: p.review_checks || [],
        markerCount: p.marker_count || 0,
        contentHash: p.content_hash || '',
        exports: Object.fromEntries(
          Object.entries(p.exports || {}).map(([k, e]) => [k, toExport(e)]),
        ),
        reviews: (p.reviews || []).map((r) => ({
          action: r.action,
          user: toUser(r.user),
          note: r.note || '',
          createdAt: r.created_at,
        })),
      }
    : null

const toProductLite = (p) => ({
  id: p.id,
  code: p.code,
  titleCn: p.title_cn || '',
  titleKo: p.title_ko || '',
  photoUrl: fileUrl(p.photo_url),
  addedAt: toKstDate(p.created_at),
})

// 공통 안내는 저장할 때 그대로 다시 보내므로 snake_case 칸을 유지한다
const toCommon = (c) => ({
  reg_no: c.reg_no || '',
  seller: c.seller || '',
  notice_title: c.notice_title || '',
  notice: c.notice || [],
  regNoReady: !!c.reg_no_ready,
  regNoLinked: !!c.reg_no_linked, // 회사 정보 › 기본 정보에서 가져온 값 — S6 에서 못 고침
  updatedAt: c.updated_at,
})

export const commonBody = (c) => ({
  reg_no: c.reg_no,
  seller: c.seller,
  notice_title: c.notice_title,
  notice: c.notice,
})

// 가격 책정 완료 제품 + 상세페이지 상태. counts = 전체 기준 상태별 개수 (홈 진행 단계)
export const getDetailPages = async () => {
  const data = await request('/detail-pages', { errorMsg: '상세페이지 목록을 불러오지 못했어요' })
  return {
    items: data.items.map((it) => ({
      product: toProductLite(it.product),
      page: toSummary(it.page),
    })),
    counts: data.counts,
  }
}

// 편집 화면 — page 가 null 이면 아직 없음 (template 으로 시작)
export const getDetailPage = async (productId) => {
  const data = await request(`/detail-pages/${productId}`, {
    errorMsg: '상세페이지를 불러오지 못했어요',
  })
  return {
    product: toProductLite(data.product),
    page: toPage(data.page),
    template: data.template,
    photos: data.photos || [],
    common: toCommon(data.common),
  }
}

// 저장 (없으면 초안으로 만든다). submit = 저장 후 검수 요청
export const saveDetailPage = async (productId, content, { submit = false } = {}) => {
  const data = await request(`/detail-pages/${productId}`, {
    method: 'PUT',
    body: { content, submit },
    errorMsg: '상세페이지를 저장하지 못했어요',
  })
  return toPage(data.page)
}

// 휴먼 체크 '확인' = 승인. 초안 · 검수 대기 · 수정 필요 어디서든 된다 (체크리스트 없음)
export const approveDetailPage = async (productId, note) => {
  const data = await request(`/detail-pages/${productId}/approve`, {
    method: 'POST',
    body: { note: note || null },
    errorMsg: '확인하지 못했어요',
  })
  return toPage(data.page)
}

export const requestDetailChanges = async (productId, note) => {
  const data = await request(`/detail-pages/${productId}/request-changes`, {
    method: 'POST',
    body: { note },
    errorMsg: '수정 요청을 보내지 못했어요',
  })
  return toPage(data.page)
}

// 상세 이미지 조각(네이버 PNG · 쿠팡 JPG) 저장 — 승인된 페이지만. contentHash: 그릴 때의 page.contentHash (그 사이 바뀌면 409)
//   files: [{ name, blob }] 순서대로
export const uploadDetailExport = async (productId, platform, contentHash, files) => {
  const form = new FormData()
  form.append('platform', platform)
  form.append('content_hash', contentHash)
  form.append('template', DETAIL_TEMPLATE_VERSION)
  files.forEach((f) => form.append('files', f.blob, f.name))
  const data = await postForm(`/detail-pages/${productId}/exports`, form, {
    errorMsg: '상세 이미지를 저장하지 못했어요',
  })
  return toExport(data.export)
}

// 공통 안내 저장 — resetCount = 이 변경으로 검수 대기로 돌아간 승인 페이지 수
export const saveDetailCommon = async (common) => {
  const data = await request('/detail-pages/common', {
    method: 'PUT',
    body: commonBody(common),
    errorMsg: '공통 안내를 저장하지 못했어요',
  })
  return { common: toCommon(data.common), resetCount: data.reset_count || 0 }
}
