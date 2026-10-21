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
3. **Flat 레이아웃** — 그림자 금지. 섹션은 1px 옅은 테두리 패널(`Section panel`)로 묶을 수 있다. 본문 최대 너비는 `--content-max`(1280px) 하나만 쓴다. (2026-10-20 변경: 예전엔 패널·max-width 금지)
4. **공간 최대 활용** (2026-10-20 사용자 지시) — 화면은 데이터를 보여주는 자리가 가장 커야 한다.
   - **머리는 얇게**: 위쪽 바 44px(`--topbar-h`) · 화면 제목줄 한 줄 약 34px(제목 옆에 설명, 버튼은 낮게) · 섹션 제목줄 40px(`--section-head-h`) · 페이지 넘김 줄도 얇게.
   - **간격은 좁게**: 화면 여백 12/20px(`--page-pad-y/x`) · 섹션 사이 12px(`--page-gap`) · 섹션 안 여백 12/16px. 값은 토큰으로만 바꾼다.
   - **블록 안 빈 공간 없음**: 섹션은 내용만큼만 커진다 (`Section fill` = 남은 높이까지만). 항목이 적다고 빈 패널을 늘리지 않는다. 칸에 맞춰 커져야 하는 내용(사진)만 `fill="stretch"`.
   - **표는 촘촘하게**: 데스크탑 표 행은 위아래 6px, 썸네일 36px, 필터 입력칸 34px — 한 페이지에 더 많이.
   - 새 화면은 1280×800 에서 첫 섹션이 약 100px 안에서 시작하는지, 섹션 안 빈 곳이 없는지 확인한다.
5. **터치 영역은 모바일 기준** — 모바일(≤ 768px) 버튼 40px+, 리스트 행 56px+. 데스크탑(마우스)은 버튼 30~36px로 낮게 써도 된다.
6. **즉각적 피드백** — 탭 ripple, 성공 시 자동 리셋.
7. **8px 그리드** — 간격은 `var(--space-*)` 토큰만 (4 / 8 / 12 / 16 / 24).
8. **높은 명암비** — 보조 텍스트도 충분히 진하게.

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
| 디자인 | 검색·필터 `filters` · 제품 목록 `list` (가격 책정 완료 제품 + 상세페이지 상태) |
| 디자인 (제품) | 편집 `editor` (S1~S6 묶음 탭) · 휴먼 체크 `check` · 미리보기 `preview` (이 화면의 유일한 스크롤) · 저장 (아래 고정 바) |
| 배송비 | 요금 규칙 `rule` · 요금표 `table` |
| 환율 | 지금 환율 `now` · 오늘 환율 입력 `input` · 최근 기록 `history` |
| 회사 계정 (로그인 계정 탭) | 필터 `filters` · 계정 목록 `list` — 머리에 탭(로그인 계정 / API 키) |
| 회사 계정 › API 키 | 키 목록 `list` (키마다 만료·재인증 배지) |
| API 키 추가 · 수정 | 입력 `form` (저장 버튼은 섹션 아래 고정) |
| 회사 계정 추가 · 회사 계정 수정 · 사용자 추가 | 입력 `form` (저장 버튼은 섹션 아래 고정) |
| 사용자 관리 | 사용자 목록 `list` |
| 더보기 (모바일) | 메뉴 `menu` · 내 계정 `me` |
- 필터는 칩 대신 **드롭다운** (`<select>`), 첫 항목은 '전체'.

### 4.7 상세페이지 템플릿 · 휴먼 체크 — 2026-10-21
가격 책정이 끝난 제품은 **디자인**(판매 묶음, 가격 책정 다음)에서 상세페이지를 만들고, 사람이 한 번 확인(휴먼 체크)해야 승인된다. 규칙의 진실은 BE `DESIGN.md` §6.4 · `docs/api-contract.md` '상세페이지'.

- **템플릿** = `components/DetailTemplate` (S1 대표 사진 · S2 포인트 · S3 맛 선택 · S4 제품 정보 · S5 마시는 법 · S6 해외구매대행 안내 + 등록번호 머리·꼬리, 폭 `TEMPLATE_WIDTH` 860px). 2026-10-21 사용자가 승인한 디자인이 기본 구조다. 칸 값(content)만 바뀌고 모양은 모든 제품이 같다.
- **스타일 예외**: 템플릿 스타일만 CSS Modules 가 아니라 `templateCss.js` 문자열을 페이지 안 `<style>` 로 넣는다 (모든 규칙은 `.dp` 아래). PNG 내려받기(`utils/exportPng.js`)가 이 DOM 을 SVG foreignObject 로 그릴 때 페이지 안의 스타일만 따라가기 때문이다. 새 패키지(html-to-image 등)는 쓰지 않는다 (§1). 글꼴은 이 PC 에 설치된 글꼴.
- **문구 표기**: 줄바꿈 = 줄, `*글자*` = 파란 강조(헤드라인), `[[글자]]` = 노란 **확인 표시** (사람이 채우거나 확정할 자리). 확인 표시가 남아 있으면 승인 불가. 문자열은 HTML 로 넣지 않고 조각으로 그린다 (`RichText`).
- **S6 공통 안내·등록번호**는 한 곳(`/detail-pages/common`)에서만 고친다. 바꾸면 승인된 페이지가 전부 검수 대기로 돌아간다.
- **휴먼 체크** (`REVIEW_CHECKS`): 등록번호 확인 · 원재료를 실제 라벨과 대조 · 사진 속 중국 현지 프로모·문구 확인 · 효능·과장 표현 없음 · 가안 문구 확정. 전부 체크해야 '승인'이 켜진다. 등록번호가 비면 '등록번호 확인', 확인 표시가 남으면 '가안 문구 확정'을 체크할 수 없다. 저장 안 한 변경이 있으면 체크·승인 불가. BE 도 같은 조건을 다시 본다.
- 승인·수정 요청·공통 안내 저장은 `detail_review` 권한 (API 키 불가 = 사람만). 초안 작성·저장·검수 요청은 `research`.
- **PNG 다운로드**는 승인 상태이고 저장 안 한 변경이 없을 때만 켜진다 (860px 원본 크기).
- **상품 등록(다음 단계, 준비 중)은 승인(`approved`)된 상세페이지만 받는다.** 승인 안 된 제품은 등록 화면에서 고를 수 없게 만든다.
- 화면 배치: 데스크탑 왼쪽 편집(S1~S6 묶음 탭, 한 번에 한 묶음 — 맛이 여럿이면 맛 카드는 페이지 넘김) / 오른쪽 휴먼 체크 + 미리보기(칸 폭에 맞게 줄임, 이 섹션 안에서만 스크롤). 모바일은 편집 · 미리보기 · 휴먼 체크 탭.
- 홈 › 진행 단계는 6단계: 제품조사 → 가격조사 → 가격 책정 → **디자인 (검수 대기 N · 승인 M)** → 상품 등록 → 주문 처리.

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
