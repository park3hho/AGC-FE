// 화면의 한 요소(상세페이지 템플릿)를 PNG 로 — 새 패키지 없이 (DESIGN.md §1 · §4.7)
//   1) 요소를 복제하고 그 안의 사진을 data URL 로 바꾼다 (그림 안에서는 바깥 파일을 못 읽는다)
//   2) 복제본을 SVG foreignObject 에 넣어 이미지로 그리고 → canvas → PNG
// 요소 안의 <style> 만 함께 들어가므로 템플릿 스타일은 요소 안에 있어야 한다 (DetailTemplate 이 그렇게 만든다).
// 글꼴은 이 PC 에 설치된 글꼴로 그려진다 (웹 글꼴을 따로 불러오지 않음).

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })

async function inlineImages(root) {
  const imgs = [...root.querySelectorAll('img')]
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src')
      if (!src || src.startsWith('data:')) return
      const res = await fetch(src, { credentials: 'include' })
      if (!res.ok) throw new Error('사진을 불러오지 못했어요')
      img.setAttribute('src', await blobToDataUrl(await res.blob()))
    }),
  )
}

const loadImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('이미지로 바꾸지 못했어요'))
    img.src = url
  })

// node: 그릴 요소 · width: 결과 폭(px) — 높이는 요소 높이 그대로
export async function nodeToPngBlob(node, width) {
  const height = Math.ceil(node.scrollHeight)
  const clone = node.cloneNode(true)
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
  await inlineImages(clone)
  const html = new XMLSerializer().serializeToString(clone)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%">${html}</foreignObject></svg>`
  const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('PNG 를 만들지 못했어요'))),
      'image/png',
    ),
  )
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
