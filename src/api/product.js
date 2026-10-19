import { fileUrl, request, upload } from '@/api/client'
import { getPriceResearch, toResearchSummary } from '@/api/priceResearch'
import { toKstDate } from '@/utils/date'

// BE 응답(snake_case) → 화면에서 쓰는 모양(camelCase). 스펙: docs/api-contract.md
const toProduct = (p) => ({
  id: p.id,
  code: p.code,
  titleCn: p.title_cn || '',
  titleKo: p.title_ko || '',
  photoPath: p.photo_url || '', // BE 에 저장된 값 그대로 — 가격조사에 연결할 때 보낸다
  photoUrl: fileUrl(p.photo_url), // 화면에 띄울 주소
  addedAt: toKstDate(p.created_at), // 제품 코드 추가일
  surveyCount: p.survey_count ?? 0,
})

// TODO: 제품이 100개를 넘으면 화면에 페이지 넘김을 붙인다 (BE 는 page/size 지원)
export const getProducts = async () => {
  const data = await request('/products?size=100', { errorMsg: '제품 목록을 불러오지 못했어요' })
  return data.items.map(toProduct)
}

// 제품 상세 + 그 제품의 가격 조사 요약 (조사일 최근 순)
export const getProduct = async (id) => {
  const data = await request(`/products/${id}`, { errorMsg: '제품을 불러오지 못했어요' })
  return { product: toProduct(data.product), surveys: data.price_surveys.map(toResearchSummary) }
}

// 제품에 모인 사진 전부 — 대표 사진 + 가격 조사들의 옵션(맛)별 사진. 같은 파일은 한 번만.
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
  add(product.photoUrl, '대표')
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
