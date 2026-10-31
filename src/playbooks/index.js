// 플레이북 — 앞으로 반복할 작업 방식 문서 (설정 › 플레이북, 개발자 모드에서만 메뉴가 보임)
// 이 폴더에 .md 를 넣으면 목록에 자동으로 붙는다. 제목은 첫 '# ' 줄, 순서는 아래 ORDER (없으면 이름순)
const files = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true })

const ORDER = ['agc-mobile-design', 'jiyun-rules', 'shop-design-system']

export const PLAYBOOKS = Object.entries(files)
  .map(([path, text]) => {
    const key = path.replace(/^\.\//, '').replace(/\.md$/, '')
    const title = (text.match(/^#\s+(.+)$/m) || [])[1] || key
    const summary = (text.match(/^>\s*(.+)$/m) || [])[1] || ''
    return { key, title, summary, text }
  })
  .sort((a, b) => {
    const ia = ORDER.indexOf(a.key)
    const ib = ORDER.indexOf(b.key)
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.key.localeCompare(b.key)
  })
