# AGC Frontend 설계 문서

> 참조: `park3hho/MES_FE` (FD MES 프론트엔드) — 기술 스택·폴더 구조·규칙을 그대로 가져오고,
> MES_FE 운영 중 드러난 문제점은 처음부터 고쳐서 시작한다.
> 작성: 2026-10-18 · 상태: 초안 (도메인 기능은 미정)

---

## 1. 기술 스택

| 구분 | 선택 | 참조 버전 (MES_FE) | 비고 |
|---|---|---|---|
| UI | React | 18.3 | 함수형 컴포넌트 + 훅만 사용 |
| 빌드 | Vite | 5.4 | `@vitejs/plugin-react` |
| 라우팅 | react-router-dom | 6.26 | `BrowserRouter` |
| 애니메이션 | framer-motion | 11 | 화면 전환·모달 |
| 스타일 | 순수 CSS + CSS Modules | — | `.scss`·CSS-in-JS 금지 |
| PWA | vite-plugin-pwa | 0.21 | 필요할 때만 켠다 (§8) |
| 포맷터 | Prettier | — | 아래 설정 |
| 배포 | Vercel | — | SPA rewrite (`vercel.json`) |
| 언어 | JavaScript (JSX) | — | TypeScript 미사용 (MES_FE 동일) |

**추가 패키지 규칙:** 새 npm 패키지는 사전 합의 후에만 설치한다. `axios` 는 쓰지 않는다 (`fetch` 래퍼 사용).

**Prettier (`.prettierrc`)**
```json
{ "semi": false, "singleQuote": true, "tabWidth": 2, "trailingComma": "all", "printWidth": 100 }
```

---

## 2. 폴더 구조

```
FE/
├── public/                  # 정적 파일 (favicon, PWA 아이콘, 로고)
├── src/
│   ├── main.jsx             # 진입점 — 글로벌 CSS 임포트(순서 고정) + BrowserRouter
│   ├── App.jsx              # 라우트 정의 + 인증 체크 + 레이아웃
│   ├── api/                 # ★ 모든 API 호출은 여기에만
│   │   ├── client.js        #   공통 fetch 래퍼 (credentials, 401 처리, 에러 정규화)
│   │   └── {domain}.js      #   도메인별 API 함수 (auth.js, user.js, ...)
│   ├── pages/               # 화면 단위 — pages/{영역}/{기능}/XXXPage.jsx
│   │   ├── auth/LoginPage.jsx
│   │   └── home/HomePage.jsx
│   ├── components/
│   │   ├── common/          # PageHeader, PageSection, SectionTabs, Pager, ListItem
│   │   ├── {Name}.jsx       # 평면 컴포넌트 + {Name}.module.css
│   │   └── {Name}/          # 하위 파일 3개 이상일 때만 폴더 (index.jsx 진입)
│   ├── contexts/            # ToastContext, ConfirmDialogContext 등 전역 상태
│   ├── hooks/               # use{Name}.js — useAuth, useMobile, useFitRows, ...
│   ├── constants/           # {category}Const.js, permissions.js, breakpoints.js
│   ├── utils/               # 순수 함수 (dateConvert 등)
│   └── styles/              # 글로벌 CSS 6종 (§4)
├── index.html
├── vite.config.js
├── vercel.json
├── Dockerfile               # 로컬 dev 컨테이너용
├── .prettierrc
├── CLAUDE.md                # 개발 가이드 (how-to)
└── DESIGN.md                # 이 문서
```

**MES_FE 대비 변경점**

| MES_FE | AGC | 이유 |
|---|---|---|
| `api/index.js` 한 파일 (140KB) | `api/client.js` + 도메인별 파일 | 한 파일에 모든 API가 쌓여 찾기·리뷰가 어려웠음 |
| `App.jsx` 정적 import 100여 개 (58KB) | 라우트 단위 `React.lazy` 코드 스플리팅 | 메인 번들 2MB 초과로 PWA 빌드 실패 이력 |
| 도메인 특화 폴더 (`process/produce` 등) | 도메인 확정 후 `pages/{영역}/` 정의 | AGC 도메인 미정 |

---

## 3. 핵심 규칙

### 3.1 진실의 원천 (Single Source of Truth)
- **API 엔드포인트** → `src/api/` 에만. 페이지·컴포넌트에서 `fetch` 직접 호출 금지.
- **도메인 상수** (코드 목록, 상태값, 단계 정의) → `constants/{category}Const.js` 에만. 컴포넌트에 배열·객체 하드코딩 금지.
- **디자인 토큰** (색상·타이포·간격) → `styles/variables.css` 에만.
- **브레이크포인트** → `constants/breakpoints.js` (`BP.mobile = 480`, `BP.tablet = 768`). JS 에서 숫자 하드코딩 금지.
- **권한(Feature)** → `constants/permissions.js`. BE `core/permissions.py` 와 문자열 동기 필수.

### 3.2 API 호출 패턴
```js
// api/client.js
const BASE_URL = import.meta.env.VITE_API_URL || ''

export async function request(path, { method = 'GET', body, errorMsg } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',                       // 세션 쿠키 인증
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  // 401 → 로그인 화면으로, 4xx/5xx → BE detail 을 사람이 읽을 문장으로 정규화
  return handleResponse(res, errorMsg)
}

// api/user.js
export const getUsers = () => request('/users')
export const createUser = (data) => request('/users', { method: 'POST', body: data })
```
- 401 응답 → 저장된 사용자 정보 삭제 + `/login` 이동 (중복 알림 방지 플래그).
- FastAPI 422 의 `detail` 배열은 문자열로 합쳐서 보여준다 (`[object Object]` 방지).

### 3.3 페이지 패턴
- **순서 있는 작업** (입력 → 확인 → 완료): `step` 상태머신 — `step` / `error` / `done` 상태 + 자동 리셋 (에러 1.5초, 성공 1.2초, `useAutoReset` 훅).
- **순서 없는 내용** (기본 정보 / 권한 / 설정): `PageSection` 으로 나누고 모바일에선 `SectionTabs` 로 전환.
- 섹션은 화면에 보이는 한글 이름 + 영문 `id`(`?section=id`) 를 가진다. 부르는 법: `페이지 이름 › 섹션 이름`. 자세한 규칙과 섹션 지도는 §4.6.

### 3.4 컴포넌트 규칙
- props 는 분해 + 한 줄 타입 주석 필수.
  ```jsx
  function ListItem({
    title,     // string: 행 제목
    sub,       // string?: 보조 텍스트
    onClick,   // function: 행 클릭
  }) { ... }
  ```
- 파일 길이: 컴포넌트 500줄, 페이지 800줄을 넘으면 분리.
- 예외: 오류 경계 `components/ErrorBoundary.jsx` 만 클래스 컴포넌트 (React 에 함수형 API 없음). 화면 오류가 앱 전체를 하얗게 만들지 않게 AppLayout 이 화면마다 감싼다.
- `useEffect` 는 정리 함수 말고는 아무것도 반환하지 않는다 — `useEffect(() => fn(), [])` 처럼 쓰지 말고 중괄호로 감싼다 (scrollTo 가 Promise 를 반환해 앱 전체가 하얗게 된 적 있음, 2026-10-20).

---

## 4. 스타일 시스템 (칸 배치 · 테마 2개)

### 4.1 글로벌 CSS — `main.jsx` 임포트 순서 고정
```
variables.css → base.css → layout.css → buttons.css → forms.css → (도메인 공통).css
```

| 파일 | 담당 | 금지 |
|---|---|---|
| `variables.css` | 색상·타이포·간격·브레이크포인트 토큰 | 클래스 정의 |
| `base.css` | 리셋, `@keyframes` | 컴포넌트 클래스 |
| `layout.css` | `.page-flat`, `.overlay`, `.modal`, `.sticky-cta` | 버튼·폼 |
| `buttons.css` | `.btn-{variant}` × `.btn-{size}` × `.btn-full` | 레이아웃 |
| `forms.css` | `.form-label`, `.form-input`, `.form-group` | 버튼 |
| `XXX.module.css` | 해당 화면·컴포넌트 고유 스타일 | 다른 곳에서도 쓰는 패턴 |

새 글로벌 CSS 파일은 만들지 않는다.

### 4.2 디자인 원칙 (MES_FE `DESIGN_SYSTEM.md` 계승)
1. **1 화면 = 1 질문** — 각 화면은 한 가지 결정만.
2. **대화형 카피** — "입력하세요" ❌ → "어떤 걸로 할까요?" ✅
3. **칸(pane) 레이아웃** (2026-10-24 사용자 지시) — 화면을 카드로 띄우지 않는다. 앱 틀 안을 끝까지 채우고(최대 너비 없음), 섹션은 **1px 선으로만** 나눈다: 바깥 여백·섹션 사이 틈 0, 테두리 상자·둥근 모서리·그림자 없음. 선은 공통이 그린다 — `.fit-row` 칸끼리 왼쪽 선, `.fit-col`·화면에 쌓인 섹션끼리 위 선, 화면 제목줄(`PageHeader`) 아래 선. 칸 안 묶음(현황 숫자 등)도 상자 대신 세로 선(`x + x { box-shadow: inset 1px 0 0 var(--color-border) }`). 그림자는 모달·떠 있는 상자(`--shadow-pop`)에만.
   - **둥근 모서리 최소** — `--radius` 는 기본 2px · 넷러너 0. 화면 CSS 에 px 둥글림을 쓰지 않는다 (동그라미 점 `50%` 만 예외). 알약(999px) 금지.
4. **공간 최대 활용** (2026-10-20 사용자 지시) — 화면은 데이터를 보여주는 자리가 가장 커야 한다.
   - **머리는 얇게**: 위쪽 바 44px(`--topbar-h`) · 화면 제목줄 44px(`--page-head-h`, 제목 옆에 설명, 버튼은 낮게) · 섹션 제목줄 38px(`--section-head-h`) · 페이지 넘김 줄도 얇게.
   - **간격**: 화면 여백·섹션 사이 0(`--page-pad-y/x`, `--page-gap`) · 칸 안 좌우 여백 16px(`--pane-pad-x`) · 섹션 안 위아래 12px. 값은 토큰으로만 바꾼다.
   - **블록 안 빈 공간 없음**: 세로로 쌓인 섹션은 내용만큼만 커진다 (`Section fill` = 남은 높이까지만). 가로로 나란한 칸(`.fit-row`)은 칸 사이 선이 끝까지 이어지게 높이를 채우되, 내용은 위에서부터 (상자가 없어서 빈 카드처럼 보이지 않는다). `useFitRows` 는 칸이 늘어나도 머리·footer 만 빼고 잰다.
   - **표는 촘촘하게**: 데스크탑 표 행은 위아래 6px, 썸네일 36px, 필터 입력칸 34px — 한 페이지에 더 많이.
   - 새 화면은 1280×800 에서 첫 섹션이 약 100px 안에서 시작하는지, 섹션 안 빈 곳이 없는지 확인한다.
5. **터치 영역은 모바일 기준** — 모바일(≤ 768px) 버튼 40px+, 리스트 행 56px+. 데스크탑(마우스)은 버튼 30~36px로 낮게 써도 된다.
6. **즉각적 피드백** — 탭 ripple, 성공 시 자동 리셋.
7. **8px 그리드** — 간격은 `var(--space-*)` 토큰만 (4 / 8 / 12 / 16 / 24).
8. **높은 명암비** — 보조 텍스트도 충분히 진하게.
9. **배지·알약(pill) 모양은 최대한 자제** (2026-10-24 사용자 지시) — 테두리·배경을 두른 둥근 상자는 글자보다 자리를 많이 먹고, 모아 두면 지저분하다.
   - **필터·탭에 알약 칩 금지** (`전체 0` 같은 테두리 둥근 버튼). 대신 ① 드롭다운(`<select>`, 첫 항목 '전체') 또는 ② **글자만 있는 탭** — 테두리·배경 없이 글자 나열, 고른 것만 진한 글자 + 밑줄 2px, 개수는 글자 옆에 작고 연하게 (`전체 12  불일치 1  일치 3`). 항목 사이는 간격만, 구분선·상자 없음.
   - **상태 표시는 색 점 + 글자** (`● 불일치`) 또는 **글자색만**. `Badge` 컴포넌트(배경 있는 상자)는 한 행에 하나까지, 정말 눈에 띄어야 하는 경고(만료·위험)에만. 목록 머리·필터 줄·탭에는 쓰지 않는다.
   - 건수·코드 같은 보조 정보도 상자로 감싸지 않고 작은 글자(`--color-text-weak`)로.

### 4.3 버튼
```jsx
<button className="btn-primary btn-lg btn-full">확인</button>
<button className="btn-secondary btn-md">취소</button>
<button className="btn-ghost btn-sm">이전</button>
<button className="btn-text">링크형</button>
<button className="btn-danger btn-lg btn-full">삭제</button>
```
인라인 `style` 은 JS 로 계산되는 동적 값(색상·너비)만 허용.

### 4.4 화면 맞춤 · 스크롤 · 반응형 (2026-10-20 사용자 지시로 강화)

**전체 화면(페이지) 스크롤 금지 — 모든 화면 · 모든 기기.** 화면은 브라우저 창 높이 안에 들어와야 하고, 페이지 자체에 스크롤바가 생기면 안 된다.

내용이 한 화면을 넘치면 **이 순서대로** 푼다:
1. **줄이기** — 간격·글자·보조 정보 정리, 자주 안 보는 내용은 접기·요약.
2. **페이지네이션** — 목록·표는 `components/common/Pager.jsx` 로 나눈다. 한 페이지 행 수는 섹션 높이에 맞춘다 (`hooks/useFitRows.js` — 필요할 때 만든다).
3. **섹션 안 스크롤** — 1·2 로도 안 될 때만. 그 섹션만 `overflow-y: auto` 로 스크롤하고, 화면의 나머지(머리·다른 섹션·저장 바)는 제자리에 고정된다.

- 스크롤하는 섹션은 **한 화면에 하나**. 가로 스크롤 · 중첩 스크롤(스크롤 안의 스크롤) 금지.
- 저장 · 확인 같은 주요 버튼은 스크롤 영역 밖(화면 아래 고정)에 둔다.
- 목록은 데스크탑에서 **표**(열 제목 + 한 줄에 한 항목), 모바일에서는 **행 목록**(`ListItem`)으로 보여준다. 위에 검색 + 드롭다운 필터, 아래에 페이지 넘김.
- 모바일(≤ 480px): 한 화면 = 한 섹션 (섹션이 여럿이면 `SectionTabs` 로 전환). 섹션 안 세로 스크롤은 위 3번일 때만, 주요 버튼은 하단 고정.
- **완료 전 확인**: 데스크탑 1280×800 · 모바일 375×667 에서 페이지 스크롤바가 없는지, 스크롤이 있다면 섹션 하나 안에서만 생기는지.

**만드는 법 (공통 장치)**

| 장치 | 하는 일 |
|---|---|
| 앱 틀 (`AppLayout`) | 창 높이(`100dvh`)에 고정. 문서(`html`)는 스크롤되지 않는다. 화면은 위쪽 바 아래 남은 높이를 쓴다 |
| `.page-flat` | 화면 본문. 높이 고정, 자식은 줄어들지 않는다. `overflow-y: auto` 는 **비상용** — 창이 너무 낮아 fill 섹션 최소 높이(`--fill-min`)도 안 나올 때만. 정상 크기에서 이 스크롤이 생기면 버그 |
| `<Section fill>` | 남은 높이 안에서 **내용만큼** 커지고, 넘치면 본문만 스크롤 (머리·`footer` 는 고정). `fill="stretch"` 는 항상 남은 높이를 꽉 채움 (사진 등) |
| `<Section footer={…}>` | 본문 아래 고정 자리 — `Pager` 를 여기에 |
| `useFitRows(bodyRef)` | fill 섹션 본문 높이에 들어가는 행 수 = 한 페이지 크기. 행에 `data-fit-row`(또는 목록 틀에 `data-fit-list`), 표 머리에 `data-fit-head` |
| `.fit-row` / `.fit-col` | fill 섹션을 감싼 가로·세로 틀 (남은 높이를 넘겨줌). 열 너비는 화면 CSS 에서 |
| `SectionTabs` + `useSectionTabs(list)` | 모바일에서 섹션을 탭으로 하나씩. `tabs.hide(id)` 를 섹션 `className` 에, 데스크탑에서는 아무것도 안 함 |
| `.sticky-cta` | 저장 등 주요 버튼 줄 — 본문 맨 아래 고정 (fill 섹션 밖) |
| `Pager` `unit` | 건수 단위 ('개' 기본, '건' · '명' · '구간') |

- 모바일 탭 글자는 짧게 줄여도 된다 (예: 제품 상세 사진·정보·판매가·옵션·조사). 부르는 이름은 섹션 `name` 그대로.
- 가격 책정(제품) › 옵션별 판매가는 일괄 적용·대표 옵션을 한눈에 비교해야 해서 페이지로 나누지 않고 섹션 안에서 스크롤한다 (3번).

목록 예:
```jsx
const bodyRef = useRef(null)
const size = useFitRows(bodyRef, { fallback: 65 })
const rows = items.slice((page - 1) * size, page * size)
<Section name="제품 목록" id="list" flush fill bodyRef={bodyRef}
  footer={<Pager page={page} pageCount={Math.ceil(items.length / size)} onChange={setPage} />}>
  <table><thead data-fit-head>…</thead><tbody>{rows.map((r) => <tr data-fit-row … />)}</tbody></table>
</Section>
```

### 4.5 앱 틀 (AppLayout) — 2026-10-20
로그인 후 모든 화면은 같은 틀 안에 들어간다. 화면마다 틀을 다시 만들지 않는다.

| 영역 (섹션 이름) | 데스크탑 (> 768px) | 모바일·태블릿 (≤ 768px) |
|---|---|---|
| **왼쪽 메뉴** | 고정 사이드바. 업무 순서대로 묶음: 홈 / 소싱 / 판매 / 설정. 아래에 사용자·로그아웃 | 숨김 |
| **위쪽 바** | 위치(빵가루) · 제품 검색 · 현재 환율 · 섹션 이름 보기 | 화면 이름 · 환율 |
| **아래 탭** | 없음 | 홈 · 제품 · 가격조사 · 가격 책정 · 더보기 |
| **아래 바** (2026-10-24) | 모든 화면 맨 아래 한 줄 28px(`--footer-h`), 틀의 일부 — 본문은 그 위 남은 높이만 쓴다. 지금은 주문 수집 상태(마켓별 마지막 시각·자동 주기, 누르면 주문 접수 · 건수는 마우스 올리면 · 실패면 빨강). 1분마다 · 화면 이동 · 주문 가져오기 뒤 다시 읽음 | 숨김 (아래 탭이 있음) |

- 메뉴 목록은 `constants/menuConst.js` 의 `MENU`(그룹 포함) 하나로 사이드바·아래 탭·더보기를 모두 그린다.
- 화면 이름·빵가루는 `constants/screenConst.js` 의 `SCREENS`(경로 → 이름·그룹·상위 화면)에서만 가져온다. 새 화면을 만들면 여기에 먼저 추가한다.
- 아직 없는 기능(주문)은 메뉴에 '준비 중'으로 두고 누를 수 없게 한다.
- **개발자 모드** (2026-10-24): 내 계정 모달에서 켠다 (이 브라우저 localStorage, 권한 아님). `menuConst` 의 `dev: true` 메뉴는 개발자 모드일 때만 보이고 글씨는 보라색(`--color-dev`). 지금 dev 메뉴: 타오바오 구매기록 · 집운 기록 · 플레이북.

### 4.6 섹션 이름 규칙 — 2026-10-20
사용자가 "제품 상세 › 사진 고쳐줘"처럼 **이름으로 바로 부를 수 있게** 화면을 나눈다.

1. 모든 화면은 **섹션**으로 나눈다. 화면에 보이는 내용은 전부 어떤 섹션 안에 있어야 한다.
2. 섹션은 반드시 `components/common/Section.jsx` 로 만든다 — `name`(한글, 화면에 보이는 이름) + `id`(영문 kebab-case).
   ```jsx
   <Section name="할 일" id="todo" panel action={<button>…</button>}>…</Section>
   ```
3. 부르는 법: `화면 이름 › 섹션 이름` (예: `홈 › 할 일`). 틀은 `공통 › 왼쪽 메뉴`.
4. 한 화면 안에서 섹션 이름은 겹치지 않는다. 이름을 바꾸면 아래 섹션 지도도 같이 고친다.
5. 위쪽 바의 **섹션 이름 보기** 버튼을 켜면 모든 섹션에 점선 테두리와 `화면 › 섹션` 이름표가 뜬다 (설정은 브라우저에 기억).

**섹션 지도**

| 화면 | 섹션 (이름 · id) |
|---|---|
| 공통 | 왼쪽 메뉴 `sidebar` · 위쪽 바 `topbar` · 아래 바 `footer` · 아래 탭 `tabbar` · 내 계정 모달 (왼쪽 메뉴 맨 아래 / 더보기 › 내 계정을 누르면: 개발자 모드 켜기 · 로그아웃) |
| 홈 | 현황 숫자 `stats` · 진행 단계 `flow` · 최근 제품 `recent` · 할 일 `todo` |
| 제품조사 | 검색·필터 `filters` · 제품 목록 `list` |
| 제품 상세 | 사진 `photos` · 기본 정보 `info` · 판매가 요약 `price-summary` · 옵션 `options` · 가격조사 `surveys` |
| 제품 추가 | 입력 `form` |
| 가격조사 | 조사 목록 `list` |
| 가격조사 상세 | 연결된 제품 `product` · 기본 정보 `info` · 옵션 `options` · 국내 최저가 `domestic` |
| 가격조사 추가 | 기본 정보 `info` · 타오바오 링크 `taobao` · 옵션 `options` · 국내 최저가 `domestic` |
| 가격 책정 | 검색·필터 `filters` · 제품 목록 `list` (처음엔 대기만) |
| 가격 책정 (제품) | 제품 `product` (한 줄: 사진·이름·코드·조사·환율 + 배송비·환율 링크) · 옵션별 판매가 `prices` (탭 없이 **쿠팡·네이버 나란히**: 옵션 · 원가(올리면 구성) · 판매처마다 한 칸 = 판매가 입력(+네이버 대표·추가금·상품 번호) 위, 가격 구조 막대·차익·마진 아래. 머리에 상태 점 · 수수료 %) · 오른쪽 열: 요약 `summary` (쿠팡·네이버 두 칸) · 한 번에 맞추기 `bulk` (방식 + 판매처별 값, 목표 차익 기본 2,000원) · 저장 `save` (적용 → 되돌리기 · 저장 · 다음, 맨 아래). **수수료는 화면에서 안 고친다** (2026-10-25 사용자 결정 — 자주 안 바뀜, 저장값·BE 기본값 그대로) |
| 디자인 | 검색·필터 `filters` · 제품 목록 `list` (가격 책정 완료 제품 + 상세페이지 상태) |
| 디자인 (제품) | 왼쪽 열: 편집 `editor` (S1~S6 묶음 탭) + 휴먼 체크 `check` · 오른쪽 열: 미리보기 `preview` (열 하나를 다 씀, 이 화면의 유일한 스크롤) · 저장 (아래 고정 바) |
| 상품 | 검색 `filters` · 상품 목록 `list` (디자인 승인된 제품만, 누르면 상품 상세로) |
| 상품 상세 | 요약 `summary` (사진 + 숫자 4개: 판매가·차익·마진·제품 추가→업로드) · 정보 `info` (탭: 가격 = 옵션별 원가·판매가 총액만, 마우스 올리면 구성 막대 / 진행 = 4단계와 사이 걸린 시간 / 마켓 = 올린 상품 한 줄씩·불러오기·직접 추가) · 상세설명 `detail` (오른쪽 열, 승인된 상세 이미지, 이 섹션만 스크롤) — 2026-10-24 목업 A 채택 (`docs/product-detail-mockup.html`) |
| 주문 접수 | 수집 `collect` · 접수 목록 `list` (자사 코드 `OR-…` 먼저, 자사 코드·마켓 주문번호 검색) · 추적 기록 `trace` (fill, 머리 탭 기록·주문 상세·마켓 원본 — 위 진행 막대 11칸, 타오바오 구매 칸·기록을 누르면 구매 추가·수정 화면. 한 줄엔 시각·단계·종류만, 마우스를 올리면 내용·누가·출처·관련 번호) · 목록 단계 탭 접수·처리·완료·전체 |
| 타오바오 구매기록 (개발자 모드 메뉴) | 검색·필터 `filters` · 구매 목록 `list` (결제 · 실제 청구) |
| 플레이북 (개발자 모드 메뉴, 설정) | 목록 `playbook-list` · 본문 `playbook-body`. 문서는 `src/playbooks/*.md` (코드와 같이 커밋, 폴더에 넣으면 목록에 자동 추가, 순서는 `src/playbooks/index.js` 의 ORDER). 마크다운은 `utils/markdown.js` 가 그린다 (패키지 없이 · HTML 이스케이프). 2026-10-27 첫 문서: 자사몰 디자인 시스템 |
| 집운 기록 (개발자 모드 메뉴) | 검색·필터 `filters` · 집운 목록 `list` (배송비 · 실제 청구). 추가·수정은 주문 접수 › 추적 기록의 국제 발송 칸·집운 기록 줄에서 |
| 타오바오 구매 추가 · 수정 | 입력 `form` — 고객 주문(자사 코드) · 타오바오 구매(주문번호만 필수) · 중국 내 배송(판매처 → 집운 창고, 상태 고르면 시각 자동) · 저장은 아래 고정 |
| 배송 › 배송비 | 요금 규칙 `rule` · 요금표 `table` — 머리에 탭(배송비 / 출고지·반품지) |
| 배송 › 출고지·반품지 | 구매대행 점검 `check` · 주소 `address` (출고지·반품지 = 배대지 주소 하나) |
| 주소 수정 | 입력 `form` (마켓 × 출고지/반품지 번호 칸, 저장 버튼은 섹션 아래 고정) |
| 환율 | 지금 환율 `now` (직접 입력은 접어 둠) · 추이 `trend` (서버 저장 기록, 1주·1달·3달·1년) · 최근 기록 `history` |
| 회사 정보 › 기본 정보 | 목록 `list` — 분류마다 묶음(`기본 정보 › 계좌` 처럼 부름), 맨 위 분류 바로가기. 값은 그대로 보임(복사), 서류 파일은 로그인해야 열림. 머리에 탭(기본 정보 / 로그인 계정 / API 키) |
| 회사 정보 › 로그인 계정 | 필터 `filters` · 계정 목록 `list` |
| 회사 정보 › API 키 | 키 목록 `list` (키마다 만료·재인증 배지) |
| 기본 정보 추가 · 수정 | 입력 `form` (분류 자유 입력 · 세부 값 · 만료 알림 · 앱에서 쓰는 곳 · 서류 파일, 저장 버튼은 섹션 아래 고정) |
| API 키 추가 · 수정 | 입력 `form` (저장 버튼은 섹션 아래 고정) |
| 로그인 계정 추가 · 수정 · 사용자 추가 | 입력 `form` (저장 버튼은 섹션 아래 고정) |
| 사용자 관리 | 사용자 목록 `list` |
| 더보기 (모바일) | 메뉴 `menu` · 내 계정 `me` |
- 필터는 칩 대신 **드롭다운** (`<select>`), 첫 항목은 '전체'. 값이 적고 자주 바꾸면 **글자 탭**(밑줄) — 알약 칩은 쓰지 않는다 (§4.2-9).

### 4.8 테마 — 기본 / 넷러너 (2026-10-24)
- 고르는 곳: **내 계정 모달 › 화면 테마** (왼쪽 메뉴 맨 아래 · 모바일 더보기 › 내 계정). 이 브라우저에만 저장 (`localStorage 'agc.theme'`, `hooks/useTheme`). `<html data-theme="netrunner">` 를 붙이고, `index.html` 이 그리기 전에 먼저 붙여 어두운 테마에서 흰 화면이 번쩍이지 않게 한다.
- 배치(칸)·크기·간격은 두 테마가 같다. 테마는 **색 · 글꼴 · 모서리 · 장식**만 바꾼다 → `styles/variables.css` 의 `[data-theme='netrunner']` 가 토큰을 덮어쓴다.
- **화면 CSS 는 색을 직접 쓰지 않는다** — `#fff`·`rgba()` 금지, 반드시 토큰: 글자 `--color-text/-sub/-weak` · 바탕 `--color-bg`(칸) `--color-bg-sub` `--color-bg-app`(틀) · 선 `--color-border(-strong)` · 주색 `--color-primary(-bg/-pressed)` + 그 위 글자 `--color-on-primary` · 상태 `--color-success/-warning/-danger(-bg)` · 코드·숫자 강조 `--color-accent` · 마켓 `--color-naver/-coupang` · 덮개 `--color-overlay` · 그림자 `--shadow-pop`. 글꼴 `--font-display`(제목) `--font-num`(코드·금액).
- **넷러너** (사이버펑크, 목업 A안): 숯검정 바탕(#0B0D10 틀 · #12151A 칸) · 주색 빨강 #FF4B55 (버튼·고른 메뉴·불일치) · 보조 시안 #43E3FF (코드·숫자·일치) · 경고 노랑 #F2E94E · 개발자 보라 #C084FC · 모서리 0 · 영문·숫자 Chakra Petch(한글 Pretendard).
  - 장식: 칸 머리 왼쪽 위 빨간 2px 표식 · 고른 메뉴 왼쪽 빨간 선 · 주요 버튼 오른쪽 위 잘린 모서리 + 약한 빛 · 마우스를 올리면 0.3초 RGB 갈라짐 · 화면 전체 아주 옅은 주사선. **본문 글자에는 빛·깜빡임 금지.** `prefers-reduced-motion: reduce` 면 움직임 전부 멈춤, `forced-colors` 면 주사선 끔.
- **상세페이지 템플릿(디자인 › 미리보기)은 테마와 상관없이 밝은 판매용 디자인 그대로** — 마켓에 올라가는 이미지다.

### 4.7 상세페이지 템플릿 · 휴먼 체크 — 2026-10-21
가격 책정이 끝난 제품은 **디자인**(판매 묶음, 가격 책정 다음)에서 상세페이지를 만들고, 사람이 한 번 확인(휴먼 체크)해야 승인된다. 규칙의 진실은 BE `DESIGN.md` §6.4 · `docs/api-contract.md` '상세페이지'.

- **템플릿** = `components/DetailTemplate` (S1 대표 사진 · S2 포인트 · S3 맛 선택 · S4 제품 정보 · S5 마시는 법 · S6 해외구매대행 안내 + 등록번호 머리·꼬리, 폭 `TEMPLATE_WIDTH` 860px). 2026-10-21 사용자가 승인한 디자인이 기본 구조다. 칸 값(content)만 바뀌고 모양은 모든 제품이 같다.
- **스타일 예외**: 템플릿 스타일만 CSS Modules 가 아니라 `templateCss.js` 문자열을 페이지 안 `<style>` 로 넣는다 (모든 규칙은 `.dp` 아래). 이미지 내보내기(`utils/exportImages.js`)가 이 DOM 을 SVG foreignObject 로 그릴 때 페이지 안의 스타일만 따라가기 때문이다. 새 패키지(html-to-image · jszip 등)는 쓰지 않는다 (§1, zip 은 `utils/zip.js`).
- **글꼴**: 템플릿은 앱에 실은 Pretendard 만 쓴다 (`public/fonts/PretendardVariable.woff2`, OFL — `Pretendard-LICENSE.txt`, 글꼴 이름 `AGC Pretendard` 로 설치된 Pretendard 와 안 섞임). 미리보기는 `@font-face` 로, 내보내는 이미지는 같은 파일을 data URL 로 넣어 그린다 → 어느 PC 에서나 같은 그림. 글꼴이 안 받아지면 내보내기를 멈춘다.
- **문구 표기**: 줄바꿈 = 줄, `*글자*` = 파란 강조(헤드라인), `[[글자]]` = 노란 **확인 표시** (사람이 채우거나 확정할 자리), `_{글자}` = 아래첨자 (예: `VB_{6}`, 2026-10-22). 확인 표시가 남아 있어도 확인은 되고 경고만 뜬다. 문자열은 HTML 로 넣지 않고 조각으로 그린다 (`RichText`).
- **사진 칸** (2026-10-25, 제품 사진 최대 5장 반영 · `s1-s6@2026-10-25`): S1 대표 사진은 원래 비율(860 폭, 최대 1100px, 넘으면 위 기준 자름). S2 포인트에 사진을 고르면 사진 카드(사진 440px 위 · 글 아래). S3 맛 카드 사진은 제품 사진 아무거나. S3 끝 '구성 사진'(`flavors.gallery`, 0~4장 — 1장 전체 폭 · 2장+ 2열). S4 정보 표 위 '현지 라벨 원본'(`info.label_photo_url`). 모두 비면 안 그린다 — 기존 페이지는 그대로 보인다. 편집 화면은 각 S 탭에 사진 고르기(전체 사진 + 없음). 이미지 자르기는 사진 카드·구성 사진·라벨 사진의 위쪽을 자를 자리로 써서 사진 한가운데를 자르지 않는다.
- **사진은 자르지 않는다** (2026-10-25, `s1-s6@2026-10-25b`, 사용자 지시 — cover 크롭으로 제품이 안 보이던 문제): 모든 사진 칸(대표·포인트·맛 카드·구성 사진·라벨)은 원본 비율 통째로(contain, 연한 배경). 배치는 사진 비율로 고른다 — 가로(w/h ≥ 1.2) · 세로(≤ 0.83) · 정사각. S1 대표: 가로는 860 폭, 세로는 높이 1100 안으로 줄여 가운데. S2 포인트: 가로 → 위 전체 폭(최대 600px), 세로·정사각 → 사진 45% 칸 + 글 나란히(좌우 번갈아). S3 맛 카드: 세로·정사각 → 왼쪽 340 칸, 가로 → 위 전체 폭; 카드 높이는 내용에 맞춤. 구성 사진 2장+: 2열 격자, 같은 줄은 큰 쪽 높이에 맞추고 작은 사진은 가운데. 비율은 템플릿이 사진을 불러온 뒤 재며(`data-ratio`), 이미지 내보내기는 사진·배치가 다 끝난 뒤에 자를 위치를 잰다(`waitTemplateImages`). 편집 화면 사진 고르기는 썸네일을 통째로 보여주고 '가로/세로/정사각'을 표시한다.
- **S3 사진 없는 맛 카드** (2026-10-24): `photo_url` 이 없으면 사진 칸 없이 글만 있는 카드(왼쪽 파란 띠)로 그린다. 템플릿·내보낸 이미지에는 '사진 없음' 을 절대 넣지 않는다 — 그 안내는 편집 화면 S3 탭에만 작게 보인다.
- **S1 무료배송 띠** (2026-10-25): 배지 3개 바로 아래에 남색 알약 띠(노란 "무료배송" + "국제배송비 · 국내 택배비 모두 포함된 가격이에요"). 모든 페이지 공통이고 제품 데이터를 읽지 않는다. 대표 사진 아래 전체 폭 띠 안(f170476)은 사용자 결정으로 되돌렸다. 마켓 목록의 "무료배송" 표시는 마켓 배송비 설정(무료)에서 나온다 — BE DESIGN §6.7.
- **S6 공통 안내·등록번호**는 한 곳(`/detail-pages/common`)에서만 고친다. 바꾸면 승인된 페이지가 전부 검수 대기로 돌아간다.
- **휴먼 체크 = '확인' 버튼 하나** (2026-10-22 사용자 결정, 5개 체크리스트 폐지). 섹션 = 메모 · '수정 요청' · '확인'(primary) 한 줄 + 안내/마지막 기록 한 줄. '확인'은 저장된 페이지가 있고 저장 안 한 변경이 없고 아직 승인 전이면 초안 · 검수 대기 · 수정 필요 어디서든 켜진다 (누르면 승인 + 상세 이미지 저장). 등록번호 미입력 · 확인 표시 남음은 버튼을 막지 않고 노란 경고 한 줄만 (`확인 표시 N개 남음 · 등록번호 미입력 — 이미지에 그대로 나가요`). 데이터 상태 이름은 그대로 '승인'.
- 승인·수정 요청·공통 안내 저장은 `detail_review` 권한 (API 키 불가 = 사람만). 초안 작성·저장·검수 요청은 `research`.
- **이미지 내보내기** — 2026-10-22 조각 내보내기, 2026-10-24 **품질 최대**로 형식 변경 (사용자: "품질 최대한 좋게" — 손해는 용량뿐, 판매처 한도보다 한참 작다). 승인 상태이고 저장 안 한 변경이 없을 때만 켜진다.
  - 형식: **네이버 PNG 무손실 860px** (네이버는 PNG 를 받는다, 장당 20MB) · **쿠팡 JPG 품질 100, 780px** (쿠팡 상세 이미지는 JPG 만, 장당 10MB · 높이 합계 30,000px). PDF 는 두 판매처 모두 상세 이미지로 못 올려 쓰지 않는다.
  - 선명도: 2배로 그린 뒤 판매처 폭으로 한 번에 줄인다 (`imageSmoothingQuality: high`). 1배 · 단계별 축소와 비교해 글자가 가장 또렷했다 (2026-10-24, 0005 페이지).
  - 860px 폭 고정 · 2배 크기로 그린 뒤 **섹션 경계에서 3000px 이하**로 자른다 (섹션 하나가 3000 을 넘으면 그 안의 줄 경계 → 그래도 없으면 3000 에서). 자르는 위치는 두 판매처가 같다.
  - 네이버 860px PNG · 쿠팡 780px JPG(줄임) 두 묶음, 이름 `PR-261019-0005_naver_01.png` · `PR-261019-0005_coupang_01.jpg` … → zip 하나(`상세이미지_{코드}.zip`)로 내려받는다.
  - **승인하면 바로** 같은 조각을 BE 에 올린다 (`POST /detail-pages/{id}/exports`, 판매처별 버전 + content_hash). 실패하면 승인은 그대로고 '이미지 내보내기'가 지금 내용의 이미지가 없는 판매처만 다시 올린다. 미리보기 이름표 옆에 `이미지 네이버 v1 · 쿠팡 v1` (지금 내용과 다르면 `(예전)`).
- **판매 › 상품 › 상품 상세** (2026-10-24): 행을 누르면 디자인이 아니라 상품 상세(`/products/:id`)로 간다 — 가격 · 링크 · 업로드 일시 · 디자인 시간 · 리서치 기간 · 상세설명(상세 이미지)을 한 화면에. 업로드 기록은 BE `/listings` (쿠팡은 SKU `{제품 코드}-{옵션 id}` 로 불러옴, 네이버는 직접 추가).
- **판매 › 상품 = 디자인(상세페이지)이 승인(`approved`)된 제품 목록.** 승인 안 된 제품은 상품에 보이지 않는다. 마켓(네이버·쿠팡) 등록 기능은 다음 단계로, 이 화면 안에 붙인다 (2026-10-24 결정: 메뉴 이름은 '상품'으로 줄임).
- 화면 배치: 데스크탑 왼쪽 편집(S1~S6 묶음 탭, 한 번에 한 묶음 — 맛이 여럿이면 맛 카드는 페이지 넘김) / 오른쪽 휴먼 체크 + 미리보기(칸 폭에 맞게 줄임, 이 섹션 안에서만 스크롤). 모바일은 편집 · 미리보기 · 휴먼 체크 탭.
- 홈 › 진행 단계는 6단계: 제품조사 → 가격조사 → 가격 책정 → **디자인 (검수 대기 N · 승인 M)** → 상품 (승인 N개) → 주문 처리.

---

## 5. 인증 · 권한

- 인증: BE 세션 쿠키 (`credentials: 'include'`). 앱 로드 시 `/auth/check` 로 확인, 결과는 `useAuth` 훅이 보관.
- 권한: Role → Feature RBAC.
  - FE 숨김은 편의일 뿐 보안이 아니다 — BE 라우터도 반드시 `require_feature()` 로 막는다.
  - 화면 진입 카드 게이트와 라우트 가드(`<RequireFeature feature=...>`)는 **같은 feature** 를 쓴다 (불일치 시 "보이는데 튕김" 사고).
- 새 화면 완료 전 체크: Feature 신설 여부 → FE `permissions.js` + BE `permissions.py` 동기 → 라우트 가드 → BE 게이트.

---

## 6. 명명 규칙

| 대상 | 규칙 | 예 |
|---|---|---|
| 페이지 | `{Name}Page.jsx` | `LoginPage.jsx` |
| 컴포넌트 | `PascalCase.jsx` | `PageHeader.jsx` |
| CSS Module | `{Name}.module.css` | `PageHeader.module.css` |
| 훅 | `use{Name}.js` | `useAuth.js` |
| 상수 | `{category}Const.js` | `etcConst.js` |
| CSS 클래스 | kebab-case | `.form-input-error` |
| 콜백 props | `on{Action}` | `onSubmit`, `onConfirm` |
| 상태 | `[value, setValue]` | `[step, setStep]` |
| 경로 alias | `@/` = `src/` | `import x from '@/api/user'` |

---

## 7. 환경 · 실행

| 변수 | 용도 |
|---|---|
| `VITE_API_URL` | BE 주소. 비우면 같은 origin 의 `/api` (dev 에서는 Vite proxy 가 `localhost:8000` 으로 전달) |

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 배포 전 빌드 확인
```

- `vite.config.js`: `@` alias, dev 서버 `0.0.0.0:5173`, `/api` proxy, 빌드 시각 기반 버전(`__APP_VERSION__`) 주입.
- `vercel.json`: 모든 경로 → `/index.html` rewrite (SPA).
- `.gitignore`: `node_modules/`, `dist/`, `.env*`.

---

## 8. 미정 · 결정 필요

- [ ] AGC 서비스 도메인과 주요 화면 목록 → `pages/` 영역 구조 확정
- [ ] PWA 필요 여부 (현장 기기 설치·오프라인이 필요하면 켬)
- [ ] 브랜드 색상 → `variables.css` 토큰 값
- [ ] QR 스캔 등 기기 기능 필요 여부 (`html5-qrcode`)
- [ ] 배포 도메인 (Vercel 프로젝트 신규 생성)
