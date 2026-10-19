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

## 4. 스타일 시스템 (Toss-Flat)

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
3. **Flat 레이아웃** — 그림자 금지. 섹션은 1px 옅은 테두리 패널(`Section panel`)로 묶을 수 있다. 본문 최대 너비는 `--content-max`(1180px) 하나만 쓴다. (2026-10-20 변경: 예전엔 패널·max-width 금지)
4. **큰 터치 영역** — 버튼 44px+, 리스트 행 56px+.
5. **즉각적 피드백** — 탭 ripple, 성공 시 자동 리셋.
6. **8px 그리드** — 간격은 `var(--space-*)` 토큰만 (4 / 8 / 12 / 16 / 24).
7. **높은 명암비** — 보조 텍스트도 충분히 진하게.

### 4.3 버튼
```jsx
<button className="btn-primary btn-lg btn-full">확인</button>
<button className="btn-secondary btn-md">취소</button>
<button className="btn-ghost btn-sm">이전</button>
<button className="btn-text">링크형</button>
<button className="btn-danger btn-lg btn-full">삭제</button>
```
인라인 `style` 은 JS 로 계산되는 동적 값(색상·너비)만 허용.

### 4.4 화면 맞춤 · 반응형
- 데스크탑: **스크롤 없이 한 화면** → 안 되면 섹션 + 페이지네이션(`Pager`, `useFitRows`) → 마지막 수단으로 스크롤.
- 목록은 데스크탑에서 **표**(열 제목 + 한 줄에 한 항목), 모바일에서는 **행 목록**(`ListItem`)으로 보여준다. 위에 검색 + 드롭다운 필터, 아래에 페이지 넘김.
- 모바일(≤ 480px): 한 화면 = 한 섹션, 섹션 안 세로 스크롤 1개. **가로 스크롤·중첩 스크롤 금지**, 주요 버튼은 하단 고정.

### 4.5 앱 틀 (AppLayout) — 2026-10-20
로그인 후 모든 화면은 같은 틀 안에 들어간다. 화면마다 틀을 다시 만들지 않는다.

| 영역 (섹션 이름) | 데스크탑 (> 768px) | 모바일·태블릿 (≤ 768px) |
|---|---|---|
| **왼쪽 메뉴** | 고정 사이드바. 업무 순서대로 묶음: 홈 / 소싱 / 판매 / 설정. 아래에 사용자·로그아웃 | 숨김 |
| **위쪽 바** | 위치(빵가루) · 제품 검색 · 현재 환율 · 섹션 이름 보기 | 화면 이름 · 환율 |
| **아래 탭** | 없음 | 홈 · 제품 · 가격조사 · 가격 책정 · 더보기 |

- 메뉴 목록은 `constants/menuConst.js` 의 `MENU`(그룹 포함) 하나로 사이드바·아래 탭·더보기를 모두 그린다.
- 화면 이름·빵가루는 `constants/screenConst.js` 의 `SCREENS`(경로 → 이름·그룹·상위 화면)에서만 가져온다. 새 화면을 만들면 여기에 먼저 추가한다.
- 아직 없는 기능(상품 등록·주문)은 메뉴에 '준비 중'으로 두고 누를 수 없게 한다.

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
| 공통 | 왼쪽 메뉴 `sidebar` · 위쪽 바 `topbar` · 아래 탭 `tabbar` |
| 홈 | 현황 숫자 `stats` · 진행 단계 `flow` · 최근 제품 `recent` · 할 일 `todo` |
| 제품조사 | 검색·필터 `filters` · 제품 목록 `list` |
| 제품 상세 | 사진 `photos` · 기본 정보 `info` · 판매가 요약 `price-summary` · 옵션 `options` · 가격조사 `surveys` |
| 제품 추가 | 입력 `form` |
| 가격조사 | 조사 목록 `list` |
| 가격조사 상세 | 연결된 제품 `product` · 기본 정보 `info` · 옵션 `options` · 국내 최저가 `domestic` |
| 가격조사 추가 | 기본 정보 `info` · 타오바오 링크 `taobao` · 옵션 `options` · 국내 최저가 `domestic` |
| 가격 책정 | 검색·필터 `filters` · 제품 목록 `list` (처음엔 대기만) |
| 가격 책정 (제품) | 제품 `product` · 환율 `fx` · 한 번에 맞추기 `bulk` · 옵션별 판매가 `prices` · 저장 (아래 고정 바) |
| 배송비 | 요금 규칙 `rule` · 요금표 `table` |
| 환율 | 지금 환율 `now` · 오늘 환율 입력 `input` · 최근 기록 `history` |
| 회사 계정 | 필터 `filters` · 계정 목록 `list` |
| 회사 계정 추가 · 사용자 추가 | 입력 `form` |
| 사용자 관리 | 사용자 목록 `list` |
| 더보기 (모바일) | 메뉴 `menu` · 내 계정 `me` |
- 필터는 칩 대신 **드롭다운** (`<select>`), 첫 항목은 '전체'.

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
