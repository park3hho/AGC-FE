# AGC 디자인 시스템 — 다른 사이트(MKT)와 나눠 쓰기

> 만든 날: 2026-10-26 · 원본: AGC FE (`https://eido-agc.vercel.app`, 예전 주소 `agc-fe.vercel.app` 도 그대로)
> 받는 곳 예: MKT 사이트 (`MKT/FE`, React 18 + Vite, `agc-mkt.vercel.app`)
> 규칙의 원본은 `FE/DESIGN.md` §4 — 이 문서는 "무엇을 · 어떻게 옮기는지"만 적는다.

## 0. 한 줄 요약

`FE/design-share/` 폴더를 MKT 의 `src/shared-ui/` 로 **통째로 복사**하고, 진입점(`main.jsx`)에서 CSS 6개를 순서대로 import 하면 된다.
`design-share/` 는 `node scripts/export-design-share.mjs` 가 AGC `src/` 에서 다시 만드는 **복사본**이다 (손으로 고치지 않는다. AGC 화면 동작과는 무관).
안의 `@/…` import 는 상대 경로로 바뀌어 있어서, MKT 에 `@` 별칭이 없어도 된다.

```
AGC/FE
├── docs/design-system-share.md      ← 이 문서
├── scripts/export-design-share.mjs  ← 묶음을 다시 만드는 스크립트
└── design-share/                    ← MKT 에 복사할 묶음 (자동 생성)
    ├── index.js                     ← 컴포넌트·훅 한곳에서 import
    ├── styles/   fonts · variables · base · layout · buttons · forms (.css)
    ├── fonts/    PretendardVariable.woff2 + 라이선스(OFL)
    ├── components/ Icon · Badge · Thumb · MenuTile · ErrorBoundary
    │   └── common/ Section · SectionTabs · PageHeader · PageTabs · Pager · ListItem · HoverInfo (+ .module.css)
    ├── hooks/    useFitRows · useMobile · useTheme · useSectionLabels · useScreen
    ├── contexts/ ScreenContext
    ├── constants/ breakpoints
    └── reference/ AppLayout.module.css · Footer.jsx  ← 참고만 (그대로는 안 돌아감)
```

## 1. 공용으로 넘기는 것

### 1.1 토큰 · 전역 CSS (`styles/`, 이 순서로 import)

| 파일 | 내용 | 의존 |
|---|---|---|
| `fonts.css` | Pretendard `@font-face` (`../fonts/PretendardVariable.woff2`). **묶음에만 있는 파일** — AGC 는 설치 글꼴에 기대지만 다른 사이트는 파일을 싣는 게 안전 | 없음 |
| `variables.css` | 모든 토큰. 색(`--color-*`: 주색·상태·글자 3단·선·바탕 3단·덮개·마켓색) · 그림자(`--shadow-pop` 모달 전용) · 글꼴(`--font-family/-display/-num`, 크기 `--font-sm/md/lg/xl`) · 간격 8px 그리드(`--space-1..5` = 4/8/12/16/24) · 모서리(`--radius` 2px, 넷러너 0) · 앱 틀 치수(`--sidebar-w` `--topbar-h` `--tabbar-h` `--footer-h`) · 칸 배치(`--pane-pad-x` `--section-head-h` `--page-head-h` `--fill-min`). **테마 2개**: 기본 = `:root`, 넷러너 = `[data-theme='netrunner']` 가 색·글꼴·모서리만 덮어씀 | 없음 |
| `base.css` | 리셋(box-sizing, margin 0), `html/body/#root` 높이 100%, 폼 글꼴 상속, `@keyframes fade-in` | variables |
| `layout.css` | 칸 배치: `.page-flat`(화면 본문, 페이지 스크롤 없음) · `.fit-row`/`.fit-col`(남은 높이 나누기 + **칸 사이 1px 선**) · `.overlay` `.modal` · `.sticky-cta`(아래 고정 버튼 줄) · 섹션 이름표(`body.show-sections`) · 넷러너 장식(주사선, 제목 글꼴, `nr-glitch`, `prefers-reduced-motion`·`forced-colors` 처리) | variables |
| `buttons.css` | `.btn-primary/-secondary/-ghost/-text/-danger` × `.btn-sm/-md/-lg` × `.btn-full` (넷러너: 잘린 모서리·빛) | variables |
| `forms.css` | `.form-group` `.form-label` `.form-input` `.form-input-error` `.form-error` | variables |

### 1.2 기본 컴포넌트 (`components/`)

| 컴포넌트 | 하는 일 · 주요 props | 의존 |
|---|---|---|
| `Icon` | 패키지 없는 인라인 SVG 선 아이콘 24px. `name`(search, package, yuan, building, tag, key, users, truck, exchange, store, home, more, layout, pen, bag, sections, arrowRight, arrowLeft, plus, photo …) · `size` | 없음 |
| `Badge` | 점 + 글자 상태 상자. `tone` success·warning·danger·primary·neutral. **한 행에 하나, 진짜 경고에만** (§3 규칙) | — |
| `Thumb` | 정사각 썸네일, 사진 없으면 아이콘. `src` `size` | Icon |
| `MenuTile` | 아이콘(색 `tone`) + 제목 `label` + 보조 `sub` 타일 (지금 AGC 화면에선 안 씀) | Icon |
| `ErrorBoundary` | 화면 하나가 깨져도 앱 전체가 하얗게 안 되게. 새 배포 뒤 옛 코드 조각 오류면 30초에 한 번 자동 새로고침 (`sessionStorage 'agc.chunkReloadAt'` — 키 이름은 바꿔도 됨) | — |
| `common/Section` | **화면의 한 덩어리 = 섹션** (모든 내용은 섹션 안). `name`(한글) · `id` · `title` · `sub` · `action` · `flush`(여백 없이) · `fill`/`fill="stretch"`(남은 높이, 넘치면 본문만 스크롤) · `footer`(본문 아래 고정) · `bodyRef` | useScreen (ScreenContext 가 없으면 이름표에 화면 이름만 빠짐) |
| `common/SectionTabs` + `useSectionTabs(list)` | 모바일·태블릿(≤768px)에서 섹션을 탭으로 하나씩 (`tabs.hide(id)` 를 섹션 className 에). 데스크탑은 아무것도 안 함 | useMobile |
| `common/PageHeader` | 화면 제목줄 44px: `title` · `sub` · `back`(이전) · `action` | **react-router-dom** (useNavigate), Icon |
| `common/PageTabs` | 화면 제목 옆 작은 경로 탭 (회색 바탕 안 세그먼트, 고른 탭만 칸 바탕 + 1px 선) | **react-router-dom** (NavLink) |
| `common/Pager` | 이전 · n / 전체 · 다음. `page` `pageCount` `total` `unit` `onChange` | — |
| `common/ListItem` | 모바일 행 목록 한 줄 (56px+) | — |
| `common/HoverInfo` | 마우스를 올리면(포커스) 작은 설명 상자, body 에 fixed 로 그려 스크롤에 안 잘림. `content` | react-dom (createPortal) |

### 1.3 훅 · 문맥 · 상수

| 파일 | 하는 일 |
|---|---|
| `hooks/useTheme` | `THEMES`(기본·넷러너) · `useTheme()` · `setTheme(key)` — `localStorage 'agc.theme'` + `<html data-theme>`. MKT 에서 따로 고르게 하려면 KEY 를 `mkt.theme` 등으로 바꾸고 아래 §2.3 스크립트도 같이 |
| `hooks/useFitRows(bodyRef, {fallback})` | fill 섹션 본문 높이에 들어가는 행 수 = 한 페이지 크기 (행에 `data-fit-row`, 표 머리에 `data-fit-head`) |
| `hooks/useMobile` | `≤ 768px` 인지 (`constants/breakpoints` BP.tablet) |
| `hooks/useSectionLabels` | 섹션 이름표 켜기/끄기 (`localStorage 'agc.showSections'`, `body.show-sections`) |
| `hooks/useScreen` + `contexts/ScreenContext` | 지금 화면 `{path, name}` — 앱 틀이 넣어 주면 Section 이름표가 `화면 › 섹션` 이 된다 |
| `constants/breakpoints` | `BP = { mobile: 480, tablet: 768 }` |

### 1.4 참고만 (`reference/`, 그대로는 안 돌아감)

| 파일 | 왜 참고만 |
|---|---|
| `AppLayout.module.css` | 앱 틀(왼쪽 메뉴 216px · 위쪽 바 44px · 아래 바 28px · 모바일 아래 탭 56px) 스타일. AGC 틀 컴포넌트(`AppLayout/index·Sidebar·Topbar·TabBar`)는 AGC 메뉴(`menuConst`)·권한·로그인·환율 API 에 묶여 있어서 넘기지 않는다. 같은 틀이 필요하면 이 CSS 를 보고 MKT 메뉴로 새로 짠다 |
| `Footer.jsx` | **아래 바** 모양 예시. 내용(주문 수집 상태)은 AGC 업무라 그대로 못 쓴다. 틀의 맨 아래 한 줄 28px(`--footer-h`) · 데스크탑만 · 모바일 숨김 규칙만 가져간다 |

### 1.5 없는 것 (공용 컴포넌트로 아직 안 만듦)

- **표** — 공용 `Table` 없음. 각 화면 `.module.css` 에서 같은 규칙으로 그린다: 행 위아래 6px · 열 제목 `--color-text-weak` 12px · 행 사이 1px `--color-border` · 숫자 오른쪽 정렬 `font-variant-numeric: tabular-nums` · `--font-num`.
- **토스트** — 없음. AGC 는 섹션 안 한 줄 안내(`.hint` 류)로 대신한다.
- **모달** — 컴포넌트 없이 `layout.css` 의 `.overlay` + `.modal` 클래스.
- **글자 탭 · 드롭다운 필터** — 컴포넌트 없음, 규칙만 (§3).

## 2. MKT 로 옮기는 방법

### 2.1 복사

```powershell
# AGC 에서 묶음을 최신으로 다시 만들고
cd AGC/FE
node scripts/export-design-share.mjs
# MKT 로 통째로 복사 (기존 shared-ui 는 지우고 덮어씀 — MKT 쪽에서 손대지 않기)
Remove-Item -Recurse -Force ../../MKT/FE/src/shared-ui -ErrorAction SilentlyContinue
Copy-Item -Recurse design-share ../../MKT/FE/src/shared-ui
```
(경로는 두 저장소 위치에 맞게. `reference/` 는 안 가져가도 된다.)

### 2.2 진입점 (`MKT/FE/src/main.jsx`) — 순서 고정

```jsx
import './shared-ui/styles/fonts.css'
import './shared-ui/styles/variables.css'
import './shared-ui/styles/base.css'
import './shared-ui/styles/layout.css'
import './shared-ui/styles/buttons.css'
import './shared-ui/styles/forms.css'
```
컴포넌트는 `import { Section, PageHeader, Icon, Pager } from '@/shared-ui'` (MKT 에 `@` 별칭이 있으면) 또는 `'./shared-ui'` 상대 경로.
**바꿔야 할 import 경로는 없다** — 묶음 안은 이미 상대 경로다. MKT 가 `@/components/...` 처럼 AGC 경로를 그대로 쓰고 싶으면 `vite.config` 에 `alias: { '@': src }` 를 두고 `shared-ui` 를 `src` 바로 아래가 아니라 `src` 자체 구조로 풀어야 하므로 권하지 않는다.

### 2.3 `index.html` — 글꼴 · 테마 깜빡임 방지

```html
<!-- 테마를 그리기 전에 붙인다 (어두운 테마에서 흰 화면 번쩍임 방지) — hooks/useTheme 의 KEY 와 같은 이름 -->
<script>
  try {
    var t = localStorage.getItem('agc.theme')
    if (t) document.documentElement.setAttribute('data-theme', t)
  } catch (e) {}
</script>
<!-- 넷러너 테마 영문·숫자 글꼴 (한글은 Pretendard = fonts.css) -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&display=swap" />
```
넷러너를 안 쓰면 스크립트와 Chakra Petch 링크는 빼도 된다 (그래도 토큰은 그대로 동작).

### 2.4 의존성

- `react` `react-dom` 18 — 필수
- `react-router-dom` 6 — `PageHeader` · `PageTabs` 만 씀. 라우터가 없으면 이 둘은 빼거나 `Link`/`navigate` 를 바꿔 끼운다
- 다른 패키지 없음 (아이콘·글꼴 포함). AGC 의 `framer-motion` 은 묶음에서 안 씀
- 확인: 묶음만 따로 Vite 라이브러리 빌드가 통과함 (2026-10-26, react·react-dom·react-router-dom 은 외부로)

## 3. 같이 지켜야 하는 규칙 (DESIGN.md §4 요약)

1. **칸(pane) 배치** (§4.2-3) — 화면을 카드로 띄우지 않는다. 틀 안을 끝까지 채우고 섹션은 **1px 선으로만** 나눈다 (바깥 여백 · 섹션 사이 틈 0, 테두리 상자·그림자 없음). 선은 `.fit-row`/`.fit-col` 과 `PageHeader` 가 그린다. 칸 안 묶음도 상자 대신 세로 선 `x + x { box-shadow: inset 1px 0 0 var(--color-border) }`. 그림자는 모달·떠 있는 상자(`--shadow-pop`)에만.
2. **둥근 모서리 최소** — `var(--radius)` 만 (2px / 넷러너 0). px 둥글림·알약(`999px`) 금지, 동그라미 점 `50%` 만 예외.
3. **배지·알약 자제** (§4.2-9) — 필터·탭에 알약 칩 금지. 대신 드롭다운(`<select>`, 첫 항목 '전체') 또는 **글자 탭**(테두리·배경 없이 글자 나열, 고른 것만 진한 글자 + 밑줄 2px, 개수는 옆에 작고 연하게). 상태는 **색 점 + 글자**(`● 불일치`) 또는 글자색만. `Badge` 는 한 행에 하나, 진짜 경고에만.
4. **색은 토큰으로만** (§4.8) — 화면 CSS 에 `#fff`·`rgba()` 직접 금지. 글자 `--color-text/-sub/-weak`, 바탕 `--color-bg`(칸) `--color-bg-sub` `--color-bg-app`(틀), 선 `--color-border(-strong)`, 주색 `--color-primary(-bg/-pressed)` + 위 글자 `--color-on-primary`, 상태 `--color-success/-warning/-danger(-bg)`, 강조 `--color-accent`. 이래야 넷러너 테마가 저절로 맞는다.
5. **간격은 8px 그리드 토큰** — `var(--space-1..5)`. 머리는 얇게: 위쪽 바 44 · 화면 제목줄 44 · 섹션 제목줄 38.
6. **페이지 스크롤 금지** (§4.4) — 넘치면 ① 줄이기 → ② 페이지 넘김(`Pager` + `useFitRows`) → ③ 섹션 하나 안에서만 스크롤. 가로·중첩 스크롤 금지. 주요 버튼은 스크롤 밖 아래 고정(`.sticky-cta` / `Section footer`). **※ 앱형 화면 규칙** — 마케팅 랜딩처럼 길게 내려 읽는 페이지라면 MKT 에서 이 규칙을 따를지 따로 정한다 (토큰·버튼·폼·글자 탭 규칙은 그대로 써도 된다).
7. **섹션 이름** (§4.6) — 모든 내용은 `Section name=… id=…` 안. 부르는 법 `화면 › 섹션`. 이름표 보기는 `useSectionLabels`.
8. **터치** — 모바일(≤768px) 버튼 40px+, 목록 행 56px+. 데스크탑 버튼 30~36px.
9. **넷러너 장식** — 본문 글자에 빛·깜빡임 금지, `prefers-reduced-motion` 이면 움직임 끔 (`layout.css` 에 이미 있음).

## 4. 넘기지 않는 것 (AGC 업무)

가격 책정(`pages/pricing`, `utils/pricing`), 상세페이지 템플릿(`components/DetailTemplate`, `pages/design`, `constants/designConst`), 주문·구매·집운(`pages/orders` `purchases` `jiyun`, `constants/orderConst`), 제품 목록(`components/ProductBrowser`), 사진 입력(`PhotoInput` — AGC 업로드 API 흐름), 내 계정 모달(`AccountModal` — AGC 로그인·권한·개발자 모드), 앱 틀 컴포넌트(`AppLayout/*` — AGC 메뉴·권한·환율·주문 수집), `api/*`, `constants/menuConst` `screenConst` `permissions`.

## 5. 고칠 때

- 공용 부분을 고치면 **AGC `src/` 에서 고치고** `node scripts/export-design-share.mjs` 로 묶음을 다시 만든 뒤 커밋한다. 스크립트는 묶음 안에서 못 찾는 import 가 있으면 멈춘다 (새 의존을 `FILES` 에 넣으라는 뜻).
- MKT 는 `shared-ui/` 를 고치지 않고 다시 복사만 한다 (갈라지지 않게). MKT 전용 스타일은 MKT 의 `.module.css` 로.
