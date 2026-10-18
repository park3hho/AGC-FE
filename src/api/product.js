import { todayKst } from '@/utils/date'

// 목업 — BE 연결 전까지 메모리에 보관한다. 연결 시 각 함수를 request() 호출로 바꾼다.
// 새로고침하면 처음 상태로 돌아간다.
let products = [
  { code: 'P-0002', titleCn: '硅胶厨具五件套', titleKo: '실리콘 주방 조리도구 5종 세트', photoUrl: '', addedAt: '2026-10-17' },
  { code: 'P-0001', titleCn: '户外折叠椅 超轻便携', titleKo: '접이식 캠핑 의자 초경량', photoUrl: '', addedAt: '2026-10-16' },
]

const respond = (data) =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), 100))

const codeOf = (n) => `P-${String(n).padStart(4, '0')}`

export const getProducts = () => respond(products)

// 다음 제품 코드 미리보기 (실제 발급은 BE)
export const getNextProductCode = () => respond(codeOf(products.length + 1))

// photoFile: File? — 목업은 브라우저 안 임시 URL. BE 연결 시 업로드 후 받은 URL 로 바꾼다.
export const createProduct = ({ titleCn, titleKo, photoFile }) => {
  const item = {
    code: codeOf(products.length + 1),
    titleCn,
    titleKo,
    photoUrl: photoFile ? URL.createObjectURL(photoFile) : '',
    addedAt: todayKst(),
  }
  products = [item, ...products]
  return respond(item)
}
