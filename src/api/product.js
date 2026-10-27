import { fileUrl, request, requestAll, upload } from '@/api/client'
import { getPriceResearch, toResearchSummary } from '@/api/priceResearch'
import { toKstDate } from '@/utils/date'
import { pricingStatusOf } from '@/utils/pricing'

// BE 응답(snake_case) → 화면에서 쓰는 모양(camelCase). 스펙: docs/api-contract.md
const toProduct = (p) => ({
  id: p.id,
  code: p.code,
  titleCn: p.title_cn || '',
  titleKo: p.title_ko || '',
  photoPath: p.photo_url || '', // BE 에 저장된 값 그대로 — 가격조사에 연결할 때 보낸다
  photoUrl: fileUrl(p.photo_url), // 화면에 띄울 주소
  hoverPhotoPath: p.photo_hover_url || '', // 대표이미지(전환용) — 자사몰 카드 마우스오버 연출컷 (BE 값 그대로)
  hoverPhotoUrl: fileUrl(p.photo_hover_url), // 대표이미지(전환용) — 화면에 띄울 주소
  photoPaths: p.photos || [], // 추가 사진(갤러리) — BE 에 저장된 값 그대로, 순서대로
  photos: (p.photos || []).map(fileUrl), // 추가 사진 — 화면에 띄울 주소
  // 제품 정보 — 리서치 때 함께 찾아 저장, 상세페이지 '제품 정보' 표가 쓴다
  manufacturer: p.manufacturer || '',
  ingredients: p.ingredients || '',
  allergens: p.allergens || '',
  shelfLife: p.shelf_life || '',
  storage: p.storage || '',
  addedAt: toKstDate(p.created_at), // 제품 코드 추가일
  createdAt: p.created_at, // 제품 추가 시각 (ISO) — 리서치 시작
  surveyCount: p.survey_count ?? 0,
  // 목록에서만 오는 값 (상세 응답엔 없음)
  latestSurvey: p.latest_survey
    ? {
        id: p.latest_survey.id,
        code: p.latest_survey.code,
        surveyDate: p.latest_survey.survey_date,
        optionCount: p.latest_survey.option_count,
        minPriceCny: p.latest_survey.min_price_cny, // 문자열 "39.90" · 옵션이 없으면 null
      }
    : null,
  pricedPlatforms: p.priced_platforms || [], // 판매가를 저장한 판매처 키
  bundleUnpriced: p.bundle_unpriced || 0, // 채택한 묶음 중 판매가가 빈 칸 수 (판매처 × 묶음)
  pricingStatus: pricingStatusOf(p.priced_platforms || [], !!p.latest_survey || p.survey_count > 0),
})

// 제품 전부 (BE 는 100개씩 → 페이지를 다 받아 합친다)
export const getProducts = async () => {
  const items = await requestAll('/products', { errorMsg: '제품 목록을 불러오지 못했어요' })
  return items.map(toProduct)
}

// 제품 상세 + 그 제품의 가격 조사 요약 (조사일 최근 순)
export const getProduct = async (id) => {
  const data = await request(`/products/${id}`, { errorMsg: '제품을 불러오지 못했어요' })
  return { product: toProduct(data.product), surveys: data.price_surveys.map(toResearchSummary) }
}

// 제품에 모인 사진 전부 — 대표 사진 + 추가 사진(갤러리) + 가격 조사들의 옵션(맛)별 사진. 같은 파일은 한 번만.
// 반환: [{ url, label }] (label: '대표' 또는 '옵션1 · 옵션2')
// 조사 하나를 못 불러와도 나머지 사진은 보여준다.
export const getProductPhotos = async (product, surveys) => {
  const details = await Promise.all(surveys.map((s) => getPriceResearch(s.id).catch(() => null)))
  const photos = []
  const seen = new Set()
  const add = (url, label) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    photos.push({ url, label })
  }
  add(product.photoUrl, '대표이미지')
  add(product.hoverPhotoUrl, '대표이미지(전환용)')
  const extra = product.photos || []
  extra.forEach((u, i) => add(u, `추가 ${i + 1}`))
  details.forEach((d) => {
    if (!d) return
    add(d.photoUrl, '대표')
    d.options.forEach((o) => add(o.photoUrl, [o.option1, o.option2].filter(Boolean).join(' · ')))
  })
  return photos
}

// 다음 제품 코드 미리보기 — 실제 코드는 등록 응답의 code
export const getNextProductCode = async () => {
  const data = await request('/products/next-code')
  return data.code
}

export const uploadPhoto = async (file) => {
  const data = await upload('/uploads/photos', file, { errorMsg: '사진을 올리지 못했어요' })
  return data.url
}

// 제품 정보 저장 — 빈 칸은 null 로 보내 비운다
export const updateProductInfo = async (id, info) => {
  const v = (s) => (s && s.trim() ? s.trim() : null)
  const data = await request(`/products/${id}`, {
    method: 'PATCH',
    body: {
      manufacturer: v(info.manufacturer),
      ingredients: v(info.ingredients),
      allergens: v(info.allergens),
      shelf_life: v(info.shelfLife),
      storage: v(info.storage),
    },
    errorMsg: '제품 정보를 저장하지 못했어요',
  })
  return toProduct(data.product)
}

// 대표이미지 두 장 지정 — 보낸 것만 바꾼다. 값은 BE 경로(/files/...), null 이면 비움
// 화면 주소 → BE 경로 (fileUrl 되돌리기)
const FILES_PREFIX = fileUrl('/files/').slice(0, -'/files/'.length)
export const photoPathOf = (url) =>
  url && FILES_PREFIX && url.startsWith(`${FILES_PREFIX}/files/`) ? url.slice(FILES_PREFIX.length) : url || ''

// 보고 있던 사진을 대표이미지 / 대표이미지(전환용)으로 지정.
// 대표를 바꾸면 기존 대표는 추가 사진 맨 앞으로 옮긴다 (지우지 않음, 최대 10장).
export const setMainPhoto = async (product, url, which) => {
  const path = photoPathOf(url)
  if (which === 'hover') return updateProductMainPhotos(product.id, { hoverPhotoPath: path })
  const rest = product.photoPaths.filter((p) => p !== path && p !== product.photoPath)
  const photos = [product.photoPath, ...rest].filter(Boolean).slice(0, 10)
  const data = await request(`/products/${product.id}`, {
    method: 'PATCH',
    body: {
      photo_url: path,
      photos,
      ...(product.hoverPhotoPath === path ? { photo_hover_url: null } : {}),
    },
    errorMsg: '대표이미지를 저장하지 못했어요',
  })
  return toProduct(data.product)
}

export const updateProductMainPhotos = async (id, { photoPath, hoverPhotoPath }) => {
  const body = {}
  if (photoPath !== undefined) body.photo_url = photoPath || null
  if (hoverPhotoPath !== undefined) body.photo_hover_url = hoverPhotoPath || null
  const data = await request(`/products/${id}`, { method: 'PATCH', body, errorMsg: '대표이미지를 저장하지 못했어요' })
  return toProduct(data.product)
}

// photoFile: File? — 있으면 먼저 올리고 받은 주소로 등록한다
export const createProduct = async ({ titleCn, titleKo, photoFile }) => {
  const photoUrl = photoFile ? await uploadPhoto(photoFile) : null
  const data = await request('/products', {
    method: 'POST',
    body: { title_cn: titleCn, title_ko: titleKo || null, photo_url: photoUrl },
    errorMsg: '제품을 등록하지 못했어요',
  })
  return toProduct(data.product)
}
