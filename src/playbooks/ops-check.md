# AGC 30분 운영 점검

> 30분 점검 루틴이 매 회차 이 문서대로 한다. 규칙을 바꾸려면 루틴 지시문이 아니라 이 문서를 고친다.

- 루틴 지시문은 "이 플레이북과 아래 연결 문서를 읽고 그대로 실행"만 한다. 할 일·규칙·순서는 전부 여기.
- 연결 문서(해당 단계에서 반드시 읽고 따른다): `import-declaration.md`(수입신고), `jiyun-rules.md`(집운 배송 요청·취소·재발송).
- 이 문서와 루틴 메모(MEMORY.md)가 다르면 **이 문서가 우선**.
- **상태는 DB 에, 메모에는 안 적는다 (사용자 원칙 2026-11-19).** 무엇을 할지는 `GET /ops/tasks` 가, 무엇을 이미 알렸는지는 `/ops/alerts` 가 안다(0-1절). 루틴 메모에 '다음:' · 'jy/tp/decl/문서 max' · '보고함·재보고 금지' · 물류 문구 목록을 적지 않는다. 물류 문구는 구매 `cn_last_text` · 소포 `last_text` 에, 안내 시각은 묶음 `notified_at` 에, 환불은 구매 `refund_*` 에, 기한 단계는 주문 `deadline_stage` 에.
- 루틴 메모에는 '최신 회차' 한 단락(무엇을 처리했는지 · 막힌 것 · 새로 배운 요령)만 덮어쓴다. 사용자가 내린 건별 결정(📌)은 메모 대신 그 구매·묶음의 memo 칸이나 알림 body 에 남긴다.
- 새 일이 없으면 보고 없이 끝낸다. 처리한 일 · 사용자가 할 일 · 막힌 일이 있을 때만 한국어로 짧게 보고. **보고할 것은 전부 먼저 `POST /ops/alerts` 로 올리고 new=true 인 것만 보고한다.**
- 개인정보: 고객 이름·전화·주소·통관부호·카드값은 절대 출력·보고하지 않는다. 이름은 "박*"처럼 가린다. 고객 정보 임시파일은 쓰고 바로 지운다(컨테이너 /tmp 포함).

## 0. 환경

- AGC FE https://agc-fe.vercel.app — 브라우저 로그인 쿠키로 `fetch('/api/...')`. 서버는 이 PC Docker(agc_app, agc_db, fin_db).
- 마켓 API: `docker exec -i -w /app -e PYTHONPATH=/app agc_app python -` 에서 `from services.order.market_clients import _naver_auth, NAVER_BASE, _coupang_call`. `_naver_auth()` 는 토큰 문자열 → 헤더 `{"Authorization": f"Bearer {t}", "Content-Type": "application/json"}`. `_coupang_call(method, path, query="", body=None)` — body 는 4번째 인자. 쿠팡 vendorId A01774978.
- HQ 키: `C:\Users\iwill\.hq\agent_key` (헤더 X-Service-Key) → http://127.0.0.1:8400/svc. 비밀번호·카드값은 HQ 에서 읽고 출력하지 않는다.
- 영수증 폴더: `C:\Users\iwill\AGC\receipts\` (세션 폴더 아님 — 옛 세션 폴더는 11-12 세션 삭제로 사라짐. git 에는 안 올라감) — 파일명 `{YYYYMMDD}_{주문코드}_{구매|집운}_주문상세_{타오바오번호}.pdf`.
- AGC `/api/orders` 의 receiver 는 가린 값 → 고객 원본은 마켓 API(네이버 product-orders/query 의 shippingAddress·individualCustomUniqueCode, 쿠팡 ordersheets 의 receiver·overseaShippingInfoDto)로.

## 0-1. 할 일 · 알림 API (2026-11-19, 매 회차 맨 앞)

- 로컬 서버 `http://127.0.0.1:8000`, 헤더 `X-API-Key` = `C:\Users\iwill\.agc\api_key` (값 출력 금지). `/ops/*` 는 API 키로 된다. 그 밖의 주문 API(`/orders` 등)는 지금처럼 agc-fe 탭 로그인 쿠키로 `fetch('/api/...')`. (키 파일을 못 읽으면 `/ops/*` 도 agc-fe 탭에서 `/api/ops/...`.)
- **회차 모드 (비용 줄이기, 2026-11-19)**: 루틴 지시문 0단계에서 `GET /ops/check-mode` 가 full 일 때만 이 문서를 읽는다. full 조건(서버 계산): 급한 할 일(클레임·발주확인·네이버 발송지연·수입신고·취소 후속·구매·집운 결제 안내·송장, 안 알린 기한·재고) · 안 전한 알림 · 최근 40분 새 주문·클레임 중 하나라도 있으면 / 집운 결제 대기·출고 대기·수입신고 접수 전이 있으면 매시 첫 회차 / **강제 정식 점검은 하루 한 번 04:46 회차(04:30 이후 첫 회차, 사용자 11-19) — 이 회차에는 10-1절 '주문 놓침 점검'도 한다(따로 돌던 04:00 루틴은 사용자 지시로 없앰고 여기로 합침, 11-19)**. 그 밖은 idle·skip(아무것도 안 하고 끝).
  - 위험: 서버가 모르는 변화(판매처 발송·창고 입고·유니패스 오류통보·旺旺 답)는 일이 없는 날엔 최대 하루 늦게 잡힐 수 있다. 그래서 정식 점검 회차에는 이 문서의 브라우저 확인(3·5·6·8·9절)을 빠짐없이 한다.
- **서버 조회 실패 시(서버 꺼짐 · 500 · 연결 안 됨, 11-19 14:47 실제 있었음)**: 그 회차는 예전 방식으로 확인한다 — agc-fe 탭에서 `GET /api/orders?stage=received&include_test=true` · `?stage=processing` · `?stage=cancelled`, `GET /api/taobao-purchases`(cn_status ordered·shipped), `GET /api/jiyun-bundles?status=active`, `GET /api/jiyun-shipments`, `GET /api/import-declarations/pending` 을 직접 보고 아래 4~10절대로 처리. agc-fe 도 안 되면(`docker ps` 로 agc_app·agc_db 상태 확인) 마켓 API(0절)로 새 주문·클레임만 확인하고 "AGC 서버 다운 — {상태}"를 보고(알림 기록은 서버가 살아나면 다음 회차에). 알림 POST 가 실패하면 보고는 그대로 하되 다음 회차에 같은 내용이 다시 보고될 수 있음을 감수한다.
- **시작: `GET /ops/tasks`** → items 를 priority 순서로 처리한다. type 별로 이 문서의 해당 절을 따른다:
  | type | 절 | 끝낸 뒤 서버에 남길 것 |
  |---|---|---|
  | claim | 9 | 처리 결과 알림(kind claim) |
  | confirm · naver_delay · purchase | 4 | 발주확인 API · `POST /ops/orders/{id}/mark {delay_requested_at}` · 구매 기록(stock_ids 있으면 재고 사용) |
  | import_decl · import_status | 8 | 신고 기록 POST/PATCH |
  | cancel_followup · refund_wait | 9 | 구매 `refund_status/refund_no` PATCH 또는 집운 재고 |
  | cn_track | 5 | 구매 PATCH(cn_status · cn_last_text) · 소포 API |
  | jiyun_pay_notice · jiyun_pay_wait | 6 | 안내 후 `POST /ops/bundles/{code}/notified` |
  | dispatch_check · invoice | 7 | 집운 PATCH · 마켓 발송처리 |
  | deadline | 10 | 알림 후 `POST /ops/orders/{id}/mark {deadline_stage}` |
  | stock_aging | 9 | 알림(kind stock_aging) |
- tasks 에 안 나오는 확인은 그대로 한다(타오바오 계정 확인 3절, 사용자가 결제한 집운 찾기 6절, 쿠팡 RU·CC · 환불 목록 9절, 유니패스 처리현황 8절, 알리페이 잔액 2절).
- **알림(재보고 막기)**: 보고할 일마다 `POST /ops/alerts {key, kind, title, body?, level?, order_codes, target, source:"routine:qDZcwsTKTD0rQZrq"}` (reported 는 보내지 않음) → **new=true 인 것만 이번 보고에 넣는다**, new=false 면 이미 알린 것(보고 안 함). **최종 보고를 쓰기 직전에** 이번 보고에 넣은 알림 id 전부 `PATCH /ops/alerts/{id} {reported:true}` → 그다음 바로 최종 답. (먼저 reported 로 찍고 회차가 끊기면 사용자에게 안 간 채 "전함"으로 남는다 — 11-19 Manager2 지적. 반대로 PATCH 전에 끊기면 다음 회차 unreported 로 다시 잡혀 한 번 더 보고될 뿐.) key = `{kind}:{대상}[:{단계·숫자}]`:
  - 새 주문 `order_new:OR-…` · 구매 막힘 `purchase_blocked:OR-…:{사유코드}` · 로그인 `login_needed:{taobao|unipass|agc}:{YYYYMMDD}` · 잔액 `alipay_low:{날짜}`
  - 집운 결제 안내 `jiyun_pay_needed:PRE_LP…` · 묶음 일부 입고 `bundle_partial:PRE_LP…:{n}/{m}` · 소포 일부 `package_partial:purchase:{id}:{n}/{m}`
  - 집운 결제 기록 `jiyun_paid:LP…` · 출고 `dispatched:{jiyun_no}` · 송장 `invoice_sent:OR-…` · 신고 `import_sent:{신청번호}` · 오류 `import_error:{신청번호}`
  - 클레임 `claim:OR-…:{상태}` · 환불 `refund:purchase:{id}:{requested|success|rejected}` · 기한 `deadline_{d3|d1|over}:OR-…` · 재고 `stock_aging:{stock_id}`
- **안 전한 알림도 전한다**: 매 회차 `GET /ops/alerts?unreported=true` (서버 자동 처리 결과 card_confirmed · 쿠팡 클레임 claim, 지난 회차에 끊겨 못 전한 것) → 이번 보고에 한 줄씩 넣고, 위와 같이 최종 보고 직전에 `PATCH {reported:true}`.
- 상황이 끝났으면(예: 결제 안내한 묶음이 결제됨) `PATCH /ops/alerts/{id} {resolved:true}` — 같은 key 가 나중에 다시 생기면 새 알림으로 열린다.
- 같은 상태 반복 보고 금지는 key 가 막아 준다(숫자가 바뀌면 key 도 바뀌어 새로 알림).
- 사람용 확인 화면: 판매 › 오늘 할 일 https://eido-agc.vercel.app/ops (왼쪽 할 일 = /ops/tasks, 오른쪽 AI 알림 = /ops/alerts). 사용자가 '끝남'으로 바꾼 알림은 resolved.

## 1. 테스트 주문

- 목록 API(/api/orders, /api/taobao-purchases, /api/jiyun-shipments, /api/domestic-shipments)는 테스트 주문(is_test — 박찬호 본인 시험 주문 OR-261025-0001·0002, OR-261027-0002)을 기본으로 뺀다. 점검은 기본값(테스트 제외)으로 부른다.
- 테스트 주문과 그 상자(993101629730, 집운 8·10·11)는 추적·송장 처리·보고를 하지 않는다(사용자 11-06). **단 발송기한 관리(9단계)는 테스트 주문도 똑같이.**
- 새 테스트 주문(받는 사람 박찬호 본인)이 들어오면 결제하지 말고 `update market_order set is_test=true where code='OR-…'` 후 한 번 보고.

## 2. 결제 수단 · 원화 기록

- 타오바오 상품은 **알리페이 잔액(账户余额)** 으로 결제(사용자가 1위안≈202원에 충전). 잔액이 결제액보다 적을 때만 연동 현대카드로 결제하고 "알리페이 잔액 부족 — 충전 필요(잔액 ¥…)" 보고. 잔액이 ¥300 아래로 내려가면 한 번 "잔액 ¥… 남음" 보고.
- 결제는 한 회차에 필요한 만큼 한 번에(1건씩 나누지 않음). 알리페이 '앱 QR 스캔 인증'이 뜨면 그 회차 멈추고 QR 캡처 1회 보고, 사용자가 '결제해'라고 할 때까지 그 주문 결제 재시도 금지.
- 집운 운임은 사용자가 직접 낸다(에이전트는 집운 운임을 결제하지 않는다). 사용자가 결제수단을 말하지 않았으면 잔액으로 기록.
- 원화: 알리페이 잔액 결제(상품·집운) = 위안×202 반올림, charged_status "settled", charged_source "알리페이 잔액 결제(1위안 202원 충전분)", pay_method "alipay". FIN 지출 method 가 '알리페이(현대카드)'로 들어오면 `PATCH /svc/expenses/by-key/{ext_key} {method:"알리페이 잔액"}`. 微信支付(위챗페이) 집운만 위안×201.02, pay_method "other", settled.
- 카드 결제(VISA 8904): 직후 추정(위안×204.4, "none", "추정: 알리페이 연동 현대카드, 카드 승인내역 대조 전")로 기록만 한다. **카드 승인 대조는 서버가 10분마다 자동으로 한다(2026-11-19, FIN 카드 승인 ±15분·±5% → approved, 알림 card_confirmed)** → 루틴은 0-1절대로 unreported 알림의 "카드값 확정"만 보고한다. FIN 카드 내역을 직접 대조하지 않는다. (아래는 서버가 하는 일 — 참고용) FIN 카드 내역(`select used_date, used_time, merchant, amount from card_transaction where merchant ilike '%taobao%' and not canceled order by used_date desc, used_time desc limit 20;` on fin_db)에서 결제 시각 ±15분·금액 ±5% 승인을 찾아 PATCH {charged_krw, charged_status:"approved", charged_source:"현대카드 승인 {금액}원 ({merchant} {날짜 시각}, FIN 카드 대조)"} 후 "카드값 확정" 보고. 이미 approved/settled 면 건드리지 않음. 아직 없으면 다음 회차(보고 안 함).

## 3. 타오바오 계정

- 결제용 ediopur01(집운 ID QVKDNMN3), 리서치용 eido_pur(집운 ID YIEVGIN3). 로그인 계정은 https://pcs.i56.taobao.com/user/consolidation/conso_order_list 왼쪽 위로 확인.
- **리서치용으로 로그인돼 있으면 절대 로그아웃·전환하지 않는다**(리서치 우선, 11-04). 결제용 단계(구매, 결제용 집운·구매목록 확인)는 건너뛰고, 새 주문이 있으면 발주확인·발송지연까지만 하고 "리서치 계정 로그인 중 — 결제 대기 주문: {코드}" 1회 보고(대기 코드가 바뀔 때만 다시).
- 로그아웃 상태면 **자동 로그인·슬라이더 시도 금지**(11-09). 아이디 입력만 해 두고 "결제용 로그인 필요 — 아이디 입력해 둘 테니 슬라이더만 밀어 주세요" 1회 보고. 로그인 화면 탭은 닫지 않는다.
- 결제용으로 로그인돼 있으면 아래 단계 모두 진행.

## 4. 새 주문

`GET /api/orders?stage=received&include_test=true`. 클레임(claim_type)이 있으면 처리하지 말고 보고. 실제 고객 주문마다:

1. 발주확인: `POST /api/orders/{id}/confirm`.
2. 네이버면 발송지연 1회(tasks 의 naver_delay — 성공하면 `POST /ops/orders/{id}/mark {delay_requested_at}`, 마켓 원본에 이미 보이면 서버가 알아서 채움): `POST {NAVER_BASE}/v1/pay-order/seller/product-orders/{line_no}/delay` body `{dispatchDueDate: 주문일+14일 "YYYY-MM-DDT23:59:59.000+09:00", delayedDispatchReason:"OVERSEA_DELIVERY", dispatchDelayedDetailedReason:"해외 구매대행 상품으로 중국 현지 구매 후 국제 배송(해운) 진행 중입니다. M월 D일까지 발송 예정입니다."}` → 조회로 반영 확인.
3. 쿠팡 받는 사람·통관부호가 빈값이면(11-10~ 쿠팡 API 현상): Wing 배송관리 → 상품준비중 → '엑셀 다운'(사유 5자 이상) 배송리스트에서 수취인이름(AA)·우편번호(AC)·주소(AD)·개인통관번호(AJ)·통관용수취인전화번호(AK, 010 — AB 안심번호 말고). AGC 가 비어 있으면 채우고(`_enc`·`run_pccc_check`, `norm_phone`·`receiver_fingerprint`) 통관 검증 '일치' 확인. 엑셀은 바로 지운다.
4. **매입처 예외 (조사 URL 대신 이걸 산다):** ⚠️ 11-14 기준 천묘→집운 창고 직접 주소 방식은 **미검증(구매 43 시험 중)**. 검증될 때까지 과일C 18·36포(`859xN` 등)는 **루이싱 공식점 ¥9.9 3袋 https://detail.tmall.com/item.htm?id=1074590269896 (수량 제한 없음, 韩国 集运 가능) × N개를 고객 한국 주소 + 集运-海运으로** 사고, 판매처 旺旺에 "최신 생산분으로" 요청(생산 5~6월·180일이라 유통기한 짧음). 천묘 시험이 성공하면 아래 천묘 방식으로 바꾼다. (이하 천묘 방식) 루이싱 과일C 아메리카노 `PR-261030-0028-{859 오렌지C·860 포멜로C·862 포도C}xN` 에서 N≥2(18포·36포) → 공식점 3포(¥19.9)는 1인 1개 한정이라 못 삼 → **천묘마트(天猫超市) https://detail.tmall.com/item.htm?id=987926818768 의 같은 맛 9袋 × (N÷3)개**(18포=2개, 36포=4개). 천묘는 한국 주소+集运이 안 돼서 받는 곳을 결제용 집운 창고 주소(`电美世路180号（韩国海运集运）@QVKDNMN3`, 수취인=그 고객 이름·전화)로 저장해 결제, 입고 뒤 집운 결제 때 고객 한국 주소 선택(11-14 OR-261113-0002 첫 사례). N=1(3포 1개)은 공식점 그대로. 진한 아메리카노(861)는 천묘에 없음 → 막히면 보고.
5. **사기 전에 집운 재고 먼저 (2026-11-18):** `GET /api/jiyun-stock/match?order_id={id}` — 같은 SKU(상품코드·옵션·묶음 수)의 보관 중(available) 재고가 있으면 **타오바오에서 사지 말고** 가장 오래된 것부터 `POST /api/jiyun-stock/{stock_id}/use {order_id}` → 그 소포의 타오바오 구매가 이 주문로 옮겨 감(원가도). 소포가 이미 창고 입고면 곧바로 6장 집운 결제 안내(새 고객 주소 置顶), 이동 중이면 입고 대기. "재고에서 씀"으로 1회 보고. 재고 목록: `GET /api/jiyun-stock?status=available` (화면: 판매 › 집운 재고).
6. 타오바오 구매(결제용 로그인일 때만): seller_code `PR-...-{옵션id}[xN]` → product_option(옵션명·현재 원가, id 고정 — 2026-11-18)·price_survey.taobao_url (그 제품 최근 조사). 상세에서 옵션 → 领券购买 → 주문서 使用新地址 → 切换(첫 클릭이 자주 안 먹음 — GHIJ 가 안 보이면 한 번 더) → GHIJ → 韩国 → 确定 → 시/구(iframe member1.tmall.com, 광주는 '전남광주통합특별시') → 상세주소·우편번호·이름·**통관부호(P+12)**·전화(+82, 숫자만) 입력·저장 → 그 주소 카드 선택 확인. 이미 저장된 고객이면 그 카드(`getByText(이름,{exact:true})`)를 누르고 자동으로 채워진 个人通关号 앞4·뒤5자리가 주문 통관부호와 같은지 확인.
   - 跨境段物流方式 **集运-海运**(直邮 아님, 합계에 跨境段运费가 없어야 함), 人民币 체크, 데이터 전송 동의 체크박스(ant-checkbox) checked 확인 후 提交订单(버튼 위치는 클릭 직전에 다시 잰다).
   - 알리페이 캐셔: 기본 VISA****8904 → '其他方式付款' → '账户余额' 라디오(잔액 ≥ 결제액) → iframe(pcauth-site.alipay.com/PASSWORD…) `#input_otp` 에 결제 비밀번호 6자리 pressSequentially(HQ `/svc/company-info/17` '결제 비밀번호', 출력 금지) → '确 定' → 支付成功. 잔액 부족일 때만 카드(HQ `/svc/company-info/15` 유효기간·CVC).
   - 같은 상품 연속 구매는 함수(toConfirm→pickCard→prepSubmit→submitAndPay)로 묶으면 빠르다.
   - 조사 판매처에서 못 사면(한도·품절) 결제하지 말고 보고. 예외: 비타 레몬티(PR-261019-0003)는 欢乐开怀食品旗舰店(787539058020) '【原箱15瓶】原味柠檬茶' ¥59.90 근처면 사도 됨(11-03).
  - 오레오 구름 케이크(PR-261115-0003): 조사 판매처(亿滋 공식 1091512708095)가 PC에서 앱 전용(请扫描二维码, 百亿补贴)이면, **바닐라 밀크(옵션 1010)** 는 悠乐食品专营店(970182052610) '【1盒/12枚】香草牛乳味' ¥18 이하면 **1박스 주문만** 사도 됨 (한도 50, 한국 주소 집운-해상 확인, 11-18 리서처 조사). 1박스는 이익 약 1,500원, **3박스·12박스 묶음은 ¥17.5로 사면 손해(3박스 약 -250원, 12박스 약 -6,700원)** → 결제하지 말고 보고. **딸기(옵션 1011)** 는 PC로 살 대체 판매처 없음 → 결제하지 말고 보고.
   - 안전장치: 실결제가 조사가보다 20% 넘게 비싸거나 ¥400 초과, 옵션 애매, 슬라이더 외 캡챠면 결제하지 말고 보고.
7. 기록: `trade.tmall.com/detail/orderDetail.htm?bizOrderId={번호}` PDF → `POST /api/taobao-purchases {order_id, taobao_order_no, shop_name, item_url, items, paid_cny, purchased_at, pay_method:"alipay", pay_currency:"CNY", pay_amount, charged_krw, charged_status, charged_source, memo}` → `POST /api/orders/{id}/documents` (kind=purchase, purchase_id). FIN 지출은 서버가 자동 전송, 증빙 링크가 빠졌으면 `PATCH http://127.0.0.1:8300/svc/expenses/by-key/AGC-purchase-{id} {evidence:"해외 영수증", evidence_url:"https://agc-fe.vercel.app/api/orders/{id}/documents/{doc}/file"}` (키: HQ `/svc/api-credentials/by-code/fin_expense/values` 의 credential.secrets.agc).
8. 집운 묶음은 서버가 주문 들어올 때 자동으로 정한다 — 묶음 번호 **PRE_LP + 10자리**(2026-11-16). 같은 받는 사람(이름+우편번호)의 '모으는 중(open)' 묶음이 있으면 날짜 상관없이 합류, 예상 무게가 25kg(JIYUN_BUNDLE_MAX_KG)를 넘게 되면 새 묶음. 주문의 `bundle_key` = 묶음 번호. 확인만. 묶음 번호는 **에이전트 작업용**이라 사용자 화면에는 안 보인다(사용자 결정 2026-11-16) — 조회·보고는 API `GET /api/jiyun-bundles?status=active` 등(jiyun-rules '묶음 번호' 절).

## 5. 중국 내 배송 · 창고 입고

tasks 의 cn_track(구매 cn_status ordered·shipped, 묶음 일부 입고)을 결제용 계정의 구매목록·물류 화면(`market.m.taobao.com/app/dinamic/pc-trade-logistics/home.html?orderId=`)에서 확인. 판매처 발송(운송장)·창고 입고가 새로 보이면 `PATCH /api/taobao-purchases/{id}` (cn_status shipped/arrived, cn_tracking_no, shipped_at/arrived_at — 화면의 실제 시각). **변화가 없어도 마지막 물류 문구는 `cn_last_text`(예: "已安检待入库 11-19 08:53")로 남긴다 — 메모에 물류 문구 목록을 적지 않는다.** PC 待集运 화면은 소포 목록이 안 보인다(앱 전용).
- **소포가 여러 개("N个包裹", 包裹1·包裹2)면**: `PATCH /api/taobao-purchases/{id} {package_count:N}` + 소포마다 `POST /api/taobao-purchases/{id}/packages {tracking_no, courier, status:"shipped"|"arrived", shipped_at, arrived_at, last_text}` (처음 추가하면 구매에 있던 운송장이 소포 1 로 자동 등록). 입고되면 `PATCH /api/taobao-purchases/packages/{pid} {status:"arrived", arrived_at}`. 서버가 전부 입고됐을 때만 구매를 arrived 로 바꾼다(일부만이면 cn_status arrived PATCH 는 409). 메모 태그 "[추가 소포 …]"는 더 쓰지 않는다.

## 6. 집운 (묶음 기준)

- **집운 결제 안내 = tasks 의 jiyun_pay_notice** (서버가 묶음 전부 입고 + 소포 전부 입고 + 아직 안내 안 함을 계산). 안내를 보내면 `POST /ops/bundles/{code}/notified {note:"받는 곳 {시·구}, 置顶 함"}` + 알림 `jiyun_pay_needed:{code}`. 그러면 다음 회차부터 jiyun_pay_wait(사용자 결제 대기)로 바뀜다. 구매 memo 태그 "[집운결제 안내 …]"는 더 쓰지 않는다. 아래는 그 규칙의 설명:
- **집운 결제 안내는 묶음 상자가 전부 입고됐을 때만 1회**: `/api/orders` 의 `progress.bundle.ready` 가 true(묶음 2건 이상) 또는 묶음 없는 주문의 소포 입고. 묶음 일부만 입고되면 결제 안내 금지 — "묶음 n/m 입고, 기다리는 중"으로만(같은 숫자 반복 보고 금지).
- **판매처가 한 구매를 소포 여러 개로 나눠 보낸 경우(사용자 규칙 2026-11-19): 소포가 전부 입고될 때까지 집운 결제 안내 금지.** AGC 구매기록은 운송장을 1개만 담아서, 첫 소포만 들어와도 묶음이 ready 로 보일 수 있다(11-19 OR-261117-0001 재스민차 12병×2박스: 첫 박스만 입고됐는데 안내 → 따로 결제돼 운임 2번). 그래서 입고 보고 전에 묶음의 구매마다 물류 화면(pc-trade-logistics)에서 **포장 개수("N个包裹", 탭 包裹1·包裹2)** 를 보고, 2개 이상이면 모든 운송장이 집운 창고 顺利入库 일 때만 안내한다. 추가 운송장은 구매 memo 에 "[추가 소포 {택배사} {운송장}]"로 적고, 일부만 입고되면 "소포 n/m 입고, 기다리는 중"으로만(보고는 처음 한 번). 주문 수량·묶음 수(예: ×2박스, 2개)가 2 이상이면 특히 꼭 확인.
- 안내 문구: "집운 결제 필요: {주문코드들} {상품} — 이 고객 소포만 한 묶음, 받는 곳 = 고객 주소(시·구까지), 알리페이 잔액, 30kg 이하로(넘으면 大件操作费 ¥60 → 약 3박스=25kg 단위로 나눠 묶기)". 입고된 그 회차에 바로 보낸다(발송 점수 대부분이 입고~결제 대기). **안내 끝에 꼭 붙인다: "결제 화면 주소는 맨 위(가장 최근 저장) 주소가 자동 선택돼요 — 받는 사람 이름 확인 후 결제"** (11-12 사고: 새 주문 고객 주소가 맨 위에 저장돼 있어 OR-261110-0001 집운이 다른 고객 주소로 결제됨 → 退款 후 재결제). **안내 보내기 전에 결제용 주소록(https://i.taobao.com/my_itaobao/receiver-address-pc)에서 그 고객 주소 행의 \"置顶\"을 눌러 한국 주소 중 맨 위로 올려 둔다**(주소가 27개 넘게 쌓여 묻힘, 11-14 사용자 \"저장 안 돼 있네\"). 사용자가 집운을 결제하면 그 회차에 상세(conso_order_detail?tradeId=…)의 收货地址 이름·시·구가 그 주문 고객과 같은지 반드시 보고, 다르면 AGC 기록 전에 바로 보고(拣货 전 退款/投诉 가능). 같은 주문 재보고 방지: 구매기록 memo 끝 "[집운결제 안내 YYYY-MM-DD HH:MM]".
- 보고는 묶음 번호로: "집운 결제 필요: PRE_LP… ({주문코드들}) …". 집운 결제 기록을 저장하면 그 묶음에 LP 번호가 붙고 상태가 '집운 결제'로 바뀐다(서버가 자동).
- 한 상자가 크게 늦어 따로 보내야 할 것 같으면 보고만(바꾸기는 사용자 결정 후 `POST /api/jiyun-bundles/move {order_id, target:null}` — target 은 다른 묶음 번호 PRE_LP… 또는 주문 코드). 묶음을 더 안 받으려면 `POST /api/jiyun-bundles/{code}/confirm`.
- 반품·취소로 환불 신청한 주문의 소포는 "반품 건 창고 도착 — 처리 결정 필요" 보고.
- 사용자가 결제한 집운 기록(conso_order_list 에 있는데 AGC `/api/jiyun-shipments?include_test=true` 에 LP 번호가 없는 것): `conso_order_detail?tradeId={집운주문번호}&channel=1` 에서 LP 번호·묶인 타오바오 주문·운송장·무게·운임·받는 곳 확인 → 운임 주문상세 PDF(`trade.taobao.com/trade/detail/trade_order_detail.htm?biz_order_id=`; 支付宝 vs 微信支付 확인) 저장 →
  - 주문 1건이면 `POST /api/jiyun-shipments`.
  - **여러 주문(같은 고객)이면 `POST /api/jiyun-shipments/bundle`** `{jiyun_no, orders:[{order_id, packages, weight_kg}], fee_cny(합계), pay_method, pay_currency, pay_amount(합계), charged_krw(합계), charged_status, charged_source, transport:"sea", requested_at}` — 금액은 무게 비율로 자동 분배, 번호 -2·-3 자동.
  - **실측 기록 (2026-11-18, 비공개)**: 같은 집운 상세(conso_order_detail)에 나오는 상자 **무게(重量, kg)와 가로·세로·높이(长·宽·高, cm)** 를 주문마다 `POST /api/option-measures` `{order_id, jiyun_no, weight_kg, length_cm, width_cm, height_cm, source:"jiyun"}` 로 넣는다(또는 `docker exec agc_app python -m scripts.measure_record --jiyun {LP…} --weight {kg} --l {cm} --w {cm} --h {cm}`). 소포별 크기가 따로 나오면 주문(소포)별로, 합포장 상자 하나만 나오면 첫 주문에 넣는다(서버가 합포장을 자동 표시해 평균에서 뺌). 크기가 화면에 없으면 무게만. 옵션·묶음 수는 주문 판매자 상품코드로 서버가 찾는다. 이 값은 보고·외부 출력에 쓰지 않는다.
  - 문서 업로드 kind=jiyun(jiyun_id), FIN AGC-jiyun-{id} 증빙 링크 '없음'이면 PATCH. 받는 곳이 고객이 아니면 바로 보고. 차·티백·차음료는 식품 요금(첫 1kg ¥33 + 0.5kg당 ¥2).

## 7. 출고 · 국내 송장 → 마켓 발송처리

- 집운 기록 중 kr_tracking_no 없는 것마다 트레이스 `https://detail.i56.taobao.com/trace/trace_detail.htm?tId={집운주문번호}&userId=3472039790` ("网络貌似出问题"면 2~3번 재시도). 출고됐으면 `PATCH /api/jiyun-shipments/{id} {status:"dispatched", dispatched_at, hbl: '最新物流单号'}` — **묶음이면 `PATCH /api/jiyun-shipments/{id}/bundle`** 로 묶음 전체에.
- **출고 즉시 송장 등록(11-10 사용자 "jiyun 보내면 바로 환불 불가 처리")**: 송장 전에는 쿠팡이 고객 취소를 자동 승인해 출고된 상자를 공짜로 받게 된다.
  - CJ 12자리(30…, kr.cjlogistics 200 — '방문예정'만 있어도 유효)면 국내 집화를 기다리지 말고 바로 발송처리.
  - 99 로 시작하는 투데이 번호(한국 도착 전 조회 404): 쿠팡·네이버 모두 출고 즉시 TODAY 코드로 한 번 시도. 성공하면 기록·보고, 거절되면 국내 이력 나오면 등록하고 거절 메시지 1회 보고(같은 시도 반복 금지). 네이버 굿서비스는 결제~발송처리 48시간 100점, 이후 12시간마다 −4점.
  - 그 밖의 번호는 `https://apis.tracker.delivery/carriers/{kr.today|kr.cjlogistics|kr.hanjin|kr.lotte|kr.logen|kr.epost|kr.kdexp}/tracks/{번호}` 200 인 택배사만 인정(약 1.5초 간격, 연달아 부르면 403).
- 택배사 코드: 투데이 TODAY, CJ대한통운 CJGLS, 한진 HANJIN, 롯데 HYUNDAI, 우체국 EPOST, 로젠 KGB, 경동 KDEXP.
- 쿠팡: AGC ship_unit_no=shipmentBoxId, order_no=orderId, market_option_id=vendorItemId → `POST /v2/providers/openapi/apis/api/v4/vendors/A01774978/orders/invoices` `{vendorId:"A01774978", orderSheetInvoiceApplyDtos:[{shipmentBoxId, orderId, vendorItemId, deliveryCompanyCode, invoiceNumber, splitShipping:false, preSplitShipped:false, estimatedShippingDate:""}]}` → `GET .../ordersheets/{shipmentBoxId}` status DEPARTURE 확인.
- 네이버: `POST {NAVER_BASE}/v1/pay-order/seller/product-orders/dispatch {dispatchProductOrders:[{productOrderId: line_no, deliveryMethod:"DELIVERY", deliveryCompanyCode, trackingNumber, dispatchDate: 지금 ISO+09:00}]}` → 조회로 확인.
- 그 뒤 AGC `PATCH {kr_tracking_no, kr_courier}`(묶음이면 bundle PATCH). 같은 고객 여러 주문이 한 상자면 같은 송장을 모두에. 허위 송장 금지(LP 번호·조회 안 되는 번호는 넣지 않음). 보고(주문코드·택배사·송장).

## 8. 수입식품 구매대행 수입신고 (최우선 — 빠뜨리면 시정명령 → 영업정지)

- **절차·칸 값은 `import-declaration.md` 를 매번 읽고 따른다.**
- 매 회차 `GET /api/import-declarations/pending` (집운 출고 · B/L 있음 · 통관 전 · 그 B/L 신고 없음).
- **pending 에 B/L 이 보이면 그 회차에 바로 사전신고(pre)를 낸다 — 관세청 화물 조회에 잡힐 때까지 기다리지 않는다**(11-12 사용자 "수입신고 하라고"). 사전신고는 선명·보관창고·입항일·반입일이 유니패스 고정값으로 자동 입력돼서 B/L 만 있으면 된다. 이미 입항(`customs.cargo_progress` 에 입항보고 수리)했으면 본신고(main). 통관은 보통 출고 이틀 뒤 저녁이라 늦으면 못 낸다.
- 같은 B/L 로 온 같은 고객 주문은 신고서 1장에 품목 여러 줄.
- 전송 후 처리현황 '기관발송(전송완료)' 확인 → `POST /api/import-declarations {order_ids, decl_no, kind, status:"sent", bl_no, vessel, arrival_date, items:[{name_en, maker_en, country, qty, unit}], seller_site, shipper_site}` + 신고서 캡처를 주문 증빙(`POST /api/orders/{id}/documents`, kind=import_decl). 낸 건 1회 보고.
- **제품 URL 은 우리 네이버 상품 상세 주소(로그인 없이 보임) + 품목 사진 첨부** — 티몰·타오바오 주소는 오류통보 사유(11-12).
- **매 회차 처리현황(신청일자 1주일)에서 '오류통보'를 찾는다** — 오류내역은 팝업 textarea 값. 보이면 그 회차에 고쳐서 새 원본으로 다시 내고(import-declaration.md 8절) 보고. 통관 전에 못 고치면 끝이다.
- 다음 회차부터 처리현황에서 접수·수리를 보면 `PATCH /api/import-declarations/{id} {status:"accepted"|"approved", receipt_no}`. 보완 요청이면 status "fix" + 보고.
- 통관(수입신고수리)까지 못 냈으면 `POST ... {status:"missed", kind:"main", bl_no, order_ids, memo:사유}` 기록하고 **바로 보고**.
- 유니패스 로그인·인증서에서 막히면 그 회차 멈추고 바로 보고(통관 전에 사람이 내야 함).

## 9. 취소 · 출고중지 · 반품 · 환불

- **취소 요청이 오면 먼저 집운 상태를 본다**:
  - (a) 집운 결제 전 + 타오바오 소포 창고 입고 전 → 승인(쿠팡 출고중지 `PUT .../returnRequests/{receiptId}/stoppedShipment {vendorId, receiptId, cancelCount}`, 네이버 `POST .../product-orders/{line_no}/claim/cancel/approve`) → 조회로 확인 → 보고 → 아래 타오바오 환불.
  - (b) 중국 창고에서 이미 출고 → **승인 금지**. 쿠팡 `PATCH .../returnRequests/{receiptId}/completedShipment {vendorId, receiptId, deliveryCompanyCode, invoiceNumber}`(이미출고 → 반품으로), 네이버는 그 송장으로 발송처리(취소 거부). 보고.
  - (c) 집운 결제됐는데 출고 전 → 승인하지 말고 보고(집운 취소 가능 여부는 사용자 판단).
- **쿠팡 취소·출고중지·반품 감지는 서버가 한다 (2026-11-19, 30분마다 auto:claims)**: returnRequests 최근 30일의 RU(출고중지 요청)·UC(반품 접수)·CC 인데 releaseStopStatus "미처리" 를 찾아 알림 kind claim(level action, key `claim:coupang:{receiptId}:{stop|return|unrel}`, 본문에 접수 시각·사유·중국 출고 여부)을 올리고, 처리돼 목록에서 빠지면 자동으로 끝낸다. → 루틴은 tasks 의 claim(열린 auto:claims 알림 포함)을 위 (a)(b)(c) 규칙대로 처리한다(승인·거부·이미출고 판단은 AI). 직접 RU·CC 를 매 회차 조회하지 않는다. 네이버 클레임과 AGC stage cancelled 후속(cancel_followup)은 그대로. (참고 — 예전 방식: 쿠팡은 발주확인 뒤 고객 앱 취소가 RU 없이 바로 CC(RETURNS_COMPLETED)가 됨, 11-13 누락 사고. CC 의 releaseStopStatus "미처리"면 Wing 출고중지요청 목록에 남음 → 중국 출고 전이면 `PUT .../returnRequests/{receiptId}/stoppedShipment` 승인.)
- 서버 감지가 멈춘 것 같으면(알림이 몇 시간째 전혀 안 생기는데 Wing 에 요청이 보임) 예비로 `GET .../returnRequests?createdAtFrom={30일 전}&createdAtTo={오늘}&status=RU` 또는 Wing(https://wing.coupang.com/tenants/sfl-portal/stop-shipment/list, HQ #2) 를 보고 보고한다.
- **판매처가 이미 보낸 뒤(운송 중·창고 입고, 집운 결제 전) 취소는 退款·拦截 대신 집운 재고로 (사용자 결정 2026-11-18):** 마켓 출고중지는 (a)대로 승인하고, 타오바오 환불 신청 대신 `POST /api/jiyun-stock {purchase_id, memo:"{주문코드} 고객 취소({사유}), 판매처 발송 {택배사} {운송장}"}` → 다음 같은 상품 주문에 4-5대로 씀. 보관 중인 구매는 매출 현황에서 손실로 안 셈. **14일 넘게 안 쓰인 재고는 1회 보고**(반품 `PATCH /api/jiyun-stock/{id} {status:"returned"}` 또는 손실 `written_off` 은 사용자 결정). 판매처 미발송이면 아래 退款 그대로.
- 타오바오 환불(결제용): 클레임 완료 + 소포 창고 입고 전이면 주문상세 → '退换/退款' → 未收到货 · 不想要了 · 전액 · 退款说明("客户取消了订单，包裹还在运输途中（{택배사} {운송장}），麻烦帮忙拦截退回，谢谢！" / 미발송 "客户取消了订单，请不要发货，谢谢！") → 提交 → 退款编号 확인 → 구매기록 memo "[退款 신청 YYYY-MM-DD HH:MM] 退款编号 …, ¥금액, 사유" → 보고. 이미 입고·집운·출고면 신청하지 말고 보고만. 요청 단계 클레임은 한 번만 보고.
- **환불 상태는 구매 칸에 (2026-11-19)**: 신청하면 `PATCH /api/taobao-purchases/{id} {refund_status:"requested", refund_no, refund_cny}`, 退款成功이면 `{refund_status:"success"}`, 거절이면 `"rejected"`(시각은 서버가 채움). memo 줄은 사람이 읽기 용으로 계속 남겨도 되지만, 할 일 계산(cancel_followup · refund_wait)은 refund_status 를 본다.
- 환불 추적: https://refund2.taobao.com/dispute/buyerDisputeList.htm — 거절·추가 요구는 바로 보고, 退款成功 새로 보이면 memo "[退款成功 YYYY-MM-DD HH:MM] ¥금액" + 보고.
- FIN 환불 줄(11-07): 원 지출은 두고 음수 줄 `POST http://127.0.0.1:8300/svc/expenses` — ext_key 원+"-refund", spent_on 환불일, amount −원화, foreign_amount "−위안", 나머지는 원 지출과 같게, purpose "{주문코드} 상품 구매 환불 (사유)". 잔액 결제분은 退款成功 즉시, 카드분은 FIN 카드 취소가 보인 뒤.

## 10. 발송기한(출고지연) 관리 — 테스트 주문 포함

- `GET /api/orders?stage=processing&include_test=true`(received 도). 마켓에 국내 송장이 없는 주문마다 ship_due_at(KST 날짜).
- 조회되는 번호가 있으면 기한 전이라도 바로 발송처리(테스트 상자도).
- tasks 의 deadline 항목(alerted=false 인 것)만 본다. 알리면 알림 `deadline_{stage}:{코드}` + `POST /ops/orders/{id}/mark {deadline_stage}`. 아래 문구 기준은 그대로.
- D-3 에 송장 없음 → 1회 보고("발송기한 임박: {코드} {마켓} 기한 {M/D}, 현재 위치 … — 쿠팡은 Wing '배송지연안내' 필요 / 네이버는 발송지연 1회 이미 사용"). D-1 에 한 번 더. 지나면 "출고지연 발생" 보고. 같은 단계 반복 금지는 deadline_stage 와 알림 key 가 막는다(루틴 메모에 적지 않음).

## 10-1. 주문 놓침 점검 — 하루 한 번 04:46 정식 점검 회차에만 (2026-11-19)

check-mode reasons 에 '하루 한 번'(04:30 이후 첫 회차)이 있는 회차에서, 4~10절을 끝낸 뒤 마지막으로 한다. 서버 할 일(/ops/tasks)이 못 잡는 빈틈을 찾는 게 목적.
- **수집 누락**: 쿠팡 ordersheets(ACCEPT·INSTRUCT, 최근 2일)와 네이버 last-changed-statuses(PAYED, 최근 24시간)를 마켓 API 로 직접 조회 → AGC market_order 에 없는 주문이 있는지. 마지막 주문 수집(OrderSyncRun)이 30분 넘게 멈췄는지.
- **멈춘 주문**: 발주확인 1시간↑ 안 됨 / 발주확인 뒤 3시간↑ 구매 없음(재고 사용 포함) / 네이버 발송지연 미신청 / 구매 48시간↑ 판매처 미발송 / 입고 뒤 집운 안내 없음(남은 소포 포함) / 집운 결제 3일↑ 미출고 / 출고 뒤 마켓 송장 없음 / 출고 B/L 수입신고 없음 / 오류통보 미처리 / 취소 주문의 환불·재고 처리 빠짐 / 쿠팡 releaseStopStatus '미처리'.
- **서버 대조**: 위에서 찾은 문제가 /ops/tasks 에 나오는지. 안 나오면 '서버 계산 빈틈'.
- **루틴 건강**: aside.sessions.list 로 이 루틴의 지난 24시간 회차 중 오류 종료·같은 이유(리서치 계정·로그아웃)로 2시간↑ 막힌 구간, 하루 비용 합계(assistant usage.cost.total).
- 찾은 문제는 그 회차에서 이 문서 규칙대로 바로 처리하고, 알림 `risk:{종류}:{대상}`(kind risk)으로 올려 보고. 코드·플레이북 수정이 필요한 빈틈은 '수정 필요'로 보고(수정은 부모 세션). 문제가 없으면 보고에 "주문 놓침 점검: 이상 없음 (하루 비용 $x)" 한 줄만.

## 11. 끝내기

- 탭은 openTab/closeTab 만, 끝나면 연 탭 닫기(로그인 화면 탭은 남김). 사용자 탭은 닫지 않는다.
- 같은 동작 2~3번 실패하면 멈추고 보고.
- 결제·발송처리·환불 신청·수입신고를 했으면 보고에 주문코드·금액·번호·결제 수단(잔액/카드)을 넣는다.
- 루틴 메모는 '최신 회차' 한 단락만 덮어쓴다: 처리한 일(주문코드·번호), 막힌 것, 새로 배운 요령. '다음:' · max 번호 · '보고함' · 물류 문구 목록은 적지 않는다(그건 tasks · alerts · DB 칸이 안다). 규칙은 이 문서.
