// 상세페이지 템플릿(.dp)을 판매처별 이미지 조각으로 — 새 패키지 없이 (DESIGN.md §1 · §4.7)
//   1) 요소를 복제하고 사진 · 글꼴(Pretendard)을 data URL 로 넣는다 (그림 안에서는 바깥 파일을 못 읽는다)
//   2) 복제본을 SVG foreignObject 로 2배 크기 canvas 에 그린다 (폭 860px 고정 · 앱에 실은 글꼴 → 어느 PC 든 같은 그림)
//   3) 섹션 경계에서 3000px 이하로 자르고, 판매처 폭으로 줄인다 — 네이버 860 PNG(무손실) · 쿠팡 780 JPG(품질 100)
//      2배 그림 → 판매처 폭으로 한 번에 줄이기 (1배·단계별 축소와 비교해 글자가 가장 또렷했다, 2026-10-24)
// 자르는 위치는 두 판매처가 같다 — 조각 n 은 판매처가 달라도 같은 내용이다.
import {
  EXPORT_MAX_HEIGHT,
  EXPORT_PLATFORMS,
  TEMPLATE_FONT_FAMILY,
  TEMPLATE_FONT_URL,
  TEMPLATE_WIDTH,
} from '@/constants/designConst'

// 섹션 안에서라도 자를 수 있는 줄 — 섹션 하나가 3000px 를 넘을 때만 쓴다.
//   사진 카드·구성 사진·라벨 사진은 요소 위쪽에서 자르므로 사진 한가운데가 잘리지 않는다
const ROW_SELECTOR =
  '.dp-point, .dp-flavor, .dp-gallery, .dp-gal, .dp-gal-item, .dp-label-photo, .dp-info, .dp-info tr, .dp-nutri, .dp-how, .dp-s6 li, .dp-note, h2, .dp-lead'
const MIN_SLICE = 300 // 이보다 짧은 조각이 생기지 않게 (섹션 경계를 고를 때)
const MAX_RENDER_SCALE = 2
const MAX_CANVAS_SIDE = 32000 // 브라우저 canvas 한 변 한도(32767) 안쪽

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })

const fetchDataUrl = async (url, what) => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error(`${what}을 불러오지 못했어요`)
  return blobToDataUrl(await res.blob())
}

let fontDataUrl = null // 글꼴 2MB — 한 번만 받는다
const getFontDataUrl = async () => {
  fontDataUrl = fontDataUrl || (await fetchDataUrl(TEMPLATE_FONT_URL, '글꼴'))
  return fontDataUrl
}

// 화면의 글꼴이 다 받아졌는지 — 자르는 위치를 재기 전에 기다린다 (글꼴이 바뀌면 높이가 바뀐다)
export async function waitTemplateFont() {
  await Promise.all(
    ['400', '500', '600', '700', '800'].map((w) =>
      document.fonts.load(`${w} 20px "${TEMPLATE_FONT_FAMILY}"`, '가A1'),
    ),
  )
  await document.fonts.ready
  if (!document.fonts.check(`800 20px "${TEMPLATE_FONT_FAMILY}"`, '가')) {
    throw new Error('템플릿 글꼴(Pretendard)을 불러오지 못했어요')
  }
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()))

// 사진이 다 들어오고 비율별 배치(data-ratio)까지 끝났는지 — 배치가 바뀌면 높이가 바뀐다 (DESIGN §4.7 no-crop)
export async function waitTemplateImages(node, timeoutMs = 8000) {
  const imgs = [...node.querySelectorAll('img')]
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((r) => {
            img.addEventListener('load', r, { once: true })
            img.addEventListener('error', r, { once: true })
          }),
    ),
  )
  await Promise.all(imgs.map((img) => (img.decode ? img.decode().catch(() => {}) : null)))
  const until = Date.now() + timeoutMs
  // 비율을 재는 사진(data-ratio 속성이 있는 것)이 모두 값을 가질 때까지
  while (Date.now() < until) {
    const pending = [...node.querySelectorAll('img[data-ratio]')].filter(
      (img) => !img.getAttribute('data-ratio') && img.naturalWidth > 0,
    )
    if (pending.length === 0) break
    await nextFrame()
  }
  await nextFrame()
  await nextFrame()
}

// 자르는 위치 (860px 기준 y) — [0, …, 전체 높이]. 섹션 경계 → 줄 경계 → 강제 순으로 고른다
export function planCuts(node, maxHeight = EXPORT_MAX_HEIGHT) {
  const root = node.getBoundingClientRect()
  const k = root.width / node.offsetWidth || 1 // 미리보기가 줄여 보여줘도(transform) 원래 px 로
  const total = Math.ceil(node.scrollHeight)
  const yOf = (el) => Math.round((el.getBoundingClientRect().top - root.top) / k)
  const blocks = [...node.children].filter((el) => el.tagName !== 'STYLE').map(yOf)
  const rows = [...node.querySelectorAll(ROW_SELECTOR)].map(yOf)

  const cuts = [0]
  let start = 0
  while (total - start > maxHeight) {
    const limit = start + maxHeight
    const pick = (ys) => Math.max(-1, ...ys.filter((y) => y >= start + MIN_SLICE && y <= limit))
    let cut = pick(blocks)
    if (cut < 0) cut = pick(rows)
    if (cut < 0) cut = limit
    cuts.push(cut)
    start = cut
  }
  cuts.push(total)
  return cuts
}

const loadImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('이미지로 바꾸지 못했어요'))
    img.src = url
  })

// 요소 전체를 scale 배 canvas 로
async function renderCanvas(node, height, scale) {
  const clone = node.cloneNode(true)
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
  const [font] = await Promise.all([
    getFontDataUrl(),
    ...[...clone.querySelectorAll('img')].map(async (img) => {
      const src = img.getAttribute('src')
      if (src && !src.startsWith('data:')) img.setAttribute('src', await fetchDataUrl(src, '사진'))
    }),
  ])
  const style = clone.querySelector('style')
  if (!style || !style.textContent.includes(TEMPLATE_FONT_URL)) {
    throw new Error('템플릿 스타일을 찾지 못했어요')
  }
  style.textContent = style.textContent.split(TEMPLATE_FONT_URL).join(font)

  const html = new XMLSerializer().serializeToString(clone)
  const w = TEMPLATE_WIDTH
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w * scale}" height="${height * scale}" viewBox="0 0 ${w} ${height}">` +
    `<foreignObject x="0" y="0" width="${w}" height="${height}">${html}</foreignObject></svg>`
  const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
  if (img.decode) await img.decode().catch(() => {})

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}

// 판매처 형식으로 — PNG 는 무손실, JPG 는 pf.quality (1 = 최고)
const toBlob = (canvas, pf) =>
  new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error(`${pf.ext.toUpperCase()} 를 만들지 못했어요`))),
      pf.mime,
      pf.quality,
    ),
  )

// node: 상세페이지 템플릿(.dp) · code: 파일 이름 앞부분(제품 코드)
// → { cuts, sets: { naver: [{ name, blob, width, height }], coupang: [...] } }
export async function renderDetailImages(node, code) {
  await waitTemplateFont()
  await waitTemplateImages(node)
  const cuts = planCuts(node)
  const height = cuts[cuts.length - 1]
  const scale = Math.min(MAX_RENDER_SCALE, MAX_CANVAS_SIDE / height)
  const full = await renderCanvas(node, height, scale)

  const sets = {}
  for (const pf of EXPORT_PLATFORMS) {
    const r = pf.width / TEMPLATE_WIDTH
    sets[pf.key] = []
    for (let i = 0; i < cuts.length - 1; i += 1) {
      // 판매처 px 로 위·아래를 각각 반올림 — 조각을 이어 붙이면 빈틈 없이 맞는다
      const top = Math.round(cuts[i] * r)
      const h = Math.round(cuts[i + 1] * r) - top
      const c = document.createElement('canvas')
      c.width = pf.width
      c.height = h
      const ctx = c.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, c.width, c.height)
      const sy = (top / r) * scale
      const sh = (h / r) * scale
      ctx.drawImage(full, 0, sy, full.width, Math.min(sh, full.height - sy), 0, 0, pf.width, h)
      const blob = await toBlob(c, pf)
      if (blob.size > pf.maxFileBytes) {
        throw new Error(
          `${pf.label} ${i + 1}번째 조각이 ${(blob.size / 1024 / 1024).toFixed(1)}MB 예요 (최대 ${pf.maxFileBytes / 1024 / 1024}MB)`,
        )
      }
      sets[pf.key].push({
        name: `${code}_${pf.key}_${String(i + 1).padStart(2, '0')}.${pf.ext}`,
        blob,
        width: pf.width,
        height: h,
      })
    }
  }
  return { cuts, sets }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
