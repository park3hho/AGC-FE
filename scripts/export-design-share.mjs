// AGC FE 디자인 시스템 중 공용 부분을 design-share/ 로 복사한다 (MKT 등 다른 사이트용).
//   node scripts/export-design-share.mjs
// - AGC 화면 코드(src/)는 읽기만 한다. design-share/ 는 매번 지우고 다시 만든다 (손으로 고치지 말 것).
// - '@/…' import 는 design-share 안의 상대 경로로 바꾼다 → 받는 쪽은 별칭(@) 없이 폴더째 복사하면 된다.
// - 설명서: docs/design-system-share.md
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const OUT = join(ROOT, 'design-share')

// 공용으로 넘기는 파일 (src 기준). .jsx 옆 같은 이름 .module.css 는 자동으로 같이 간다
const FILES = [
  // 토큰 · 전역 CSS (이 순서로 import)
  'styles/variables.css',
  'styles/base.css',
  'styles/layout.css',
  'styles/buttons.css',
  'styles/forms.css',
  // 기본 컴포넌트
  'components/Icon.jsx',
  'components/Badge.jsx',
  'components/Thumb.jsx',
  'components/MenuTile.jsx',
  'components/ErrorBoundary.jsx',
  'components/common/Section.jsx',
  'components/common/SectionTabs.jsx',
  'components/common/PageHeader.jsx',
  'components/common/PageTabs.jsx',
  'components/common/Pager.jsx',
  'components/common/ListItem.jsx',
  'components/common/HoverInfo.jsx',
  // 훅 · 문맥 · 상수
  'hooks/useFitRows.js',
  'hooks/useMobile.js',
  'hooks/useTheme.js',
  'hooks/useSectionLabels.js',
  'hooks/useScreen.js',
  'contexts/ScreenContext.jsx',
  'constants/breakpoints.js',
]

// 참고용 (그대로는 못 씀 — AGC 메뉴·권한·주문에 묶여 있어 구조만 본다)
const REFERENCE = ['components/AppLayout/AppLayout.module.css', 'components/AppLayout/Footer.jsx']

const rewrite = (file, text) =>
  text.replace(/from '@\/([^']+)'/g, (_, target) => {
    let rel = relative(dirname(join(OUT, file)), join(OUT, target)).replace(/\\/g, '/')
    if (!rel.startsWith('.')) rel = `./${rel}`
    return `from '${rel}'`
  })

rmSync(OUT, { recursive: true, force: true })
const copied = []
const copy = (file, base = OUT, transform = true) => {
  const from = join(SRC, file)
  if (!existsSync(from)) throw new Error(`없는 파일: src/${file}`)
  const to = join(base, file)
  mkdirSync(dirname(to), { recursive: true })
  if (/\.(jsx?|css)$/.test(file) && transform)
    writeFileSync(to, rewrite(file, readFileSync(from, 'utf8')))
  else cpSync(from, to)
  copied.push(relative(ROOT, to).replace(/\\/g, '/'))
}

for (const f of FILES) {
  copy(f)
  const css = f.replace(/\.jsx$/, '.module.css')
  if (css !== f && existsSync(join(SRC, css))) copy(css)
}
for (const f of REFERENCE) copy(f, join(OUT, 'reference'), false)

// 글꼴 — AGC 화면은 설치된 Pretendard 에 기대지만(variables.css --font-family), 다른 사이트는 파일을 같이 싣는 게 안전하다
mkdirSync(join(OUT, 'fonts'), { recursive: true })
for (const f of ['PretendardVariable.woff2', 'Pretendard-LICENSE.txt']) {
  cpSync(join(ROOT, 'public', 'fonts', f), join(OUT, 'fonts', f))
  copied.push(`design-share/fonts/${f}`)
}
writeFileSync(
  join(OUT, 'styles', 'fonts.css'),
  `/* Pretendard (한글·본문) — scripts/export-design-share.mjs 가 만든 파일. variables.css 보다 먼저 import 한다.
   넷러너 테마의 영문·숫자 글꼴 Chakra Petch 는 index.html 에 Google Fonts 링크로 (docs/design-system-share.md) */
@font-face {
  font-family: 'Pretendard';
  src: url('../fonts/PretendardVariable.woff2') format('woff2-variations');
  font-weight: 45 920;
  font-style: normal;
  font-display: swap;
}
`,
)

// 빠진 import 가 없는지 — design-share 안에서 못 찾는 상대 경로가 있으면 멈춘다
for (const f of copied.filter((p) => /\.jsx?$/.test(p) && !p.includes('/reference/'))) {
  const text = readFileSync(join(ROOT, f), 'utf8')
  for (const [, target] of text.matchAll(/from '(\.[^']+)'/g)) {
    const base = join(ROOT, dirname(f), target)
    if (![base, `${base}.js`, `${base}.jsx`].some((p) => existsSync(p))) {
      throw new Error(`${f}: '${target}' 를 design-share 안에서 못 찾음 — FILES 에 추가하세요`)
    }
  }
}

writeFileSync(
  join(OUT, 'index.js'),
  `// AGC 디자인 시스템 공용 묶음 — scripts/export-design-share.mjs 가 만든 파일 (손으로 고치지 말 것)
// 전역 CSS 는 앱 진입점에서 이 순서로 한 번만 import 한다:
//   import './shared-ui/styles/fonts.css'
//   import './shared-ui/styles/variables.css'
//   import './shared-ui/styles/base.css'
//   import './shared-ui/styles/layout.css'
//   import './shared-ui/styles/buttons.css'
//   import './shared-ui/styles/forms.css'
export { default as Icon } from './components/Icon'
export { default as Badge } from './components/Badge'
export { default as Thumb } from './components/Thumb'
export { default as MenuTile } from './components/MenuTile'
export { default as ErrorBoundary } from './components/ErrorBoundary'
export { default as Section } from './components/common/Section'
export { default as SectionTabs, useSectionTabs } from './components/common/SectionTabs'
export { default as PageHeader } from './components/common/PageHeader'
export { default as PageTabs } from './components/common/PageTabs'
export { default as Pager } from './components/common/Pager'
export { default as ListItem } from './components/common/ListItem'
export { default as HoverInfo } from './components/common/HoverInfo'
export { useFitRows } from './hooks/useFitRows'
export { useMobile } from './hooks/useMobile'
export { setTheme, THEMES, useTheme } from './hooks/useTheme'
export { useSectionLabels } from './hooks/useSectionLabels'
export { useScreen } from './hooks/useScreen'
export { ScreenContext } from './contexts/ScreenContext'
export { BP } from './constants/breakpoints'
`,
)
console.log(`design-share/ — ${copied.length}개 파일 + index.js`)
