// 아주 작은 ZIP 만들기 (압축 없음 · STORE) — 새 패키지 없이 (DESIGN.md §1)
//   PNG·JPG 는 이미 압축된 파일이라 다시 압축해도 거의 줄지 않는다. 파일 이름은 UTF-8 로 적는다.

let CRC_TABLE = null
const crcTable = () => {
  if (CRC_TABLE) return CRC_TABLE
  CRC_TABLE = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    CRC_TABLE[n] = c >>> 0
  }
  return CRC_TABLE
}

const crc32 = (bytes) => {
  const t = crcTable()
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) c = t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// DOS 날짜·시간 (ZIP 머리에 들어가는 형식)
const dosTime = (d) =>
  ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff
const dosDate = (d) =>
  (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff

// files: [{ name: string, blob: Blob }] → Blob (application/zip)
export async function makeZip(files) {
  const enc = new TextEncoder()
  const now = new Date()
  const parts = []
  const central = []
  let offset = 0

  for (const f of files) {
    const data = new Uint8Array(await f.blob.arrayBuffer())
    const name = enc.encode(f.name)
    const crc = crc32(data)

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true) // 필요한 버전
    local.setUint16(6, 0x0800, true) // 이름 UTF-8
    local.setUint16(8, 0, true) // STORE
    local.setUint16(10, dosTime(now), true)
    local.setUint16(12, dosDate(now), true)
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, data.length, true)
    local.setUint16(26, name.length, true)
    local.setUint16(28, 0, true)
    parts.push(local.buffer, name, data)

    const cd = new DataView(new ArrayBuffer(46))
    cd.setUint32(0, 0x02014b50, true)
    cd.setUint16(4, 20, true)
    cd.setUint16(6, 20, true)
    cd.setUint16(8, 0x0800, true)
    cd.setUint16(10, 0, true)
    cd.setUint16(12, dosTime(now), true)
    cd.setUint16(14, dosDate(now), true)
    cd.setUint32(16, crc, true)
    cd.setUint32(20, data.length, true)
    cd.setUint32(24, data.length, true)
    cd.setUint16(28, name.length, true)
    cd.setUint32(42, offset, true)
    central.push(cd.buffer, name)

    offset += 30 + name.length + data.length
  }

  const cdSize = central.reduce((s, p) => s + p.byteLength, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, cdSize, true)
  end.setUint32(16, offset, true)

  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' })
}
