# AGC 30분 운영 점검

> 30분 점검 루틴이 매 회차 이 문서대로 한다. 규칙을 바꾸려면 루틴 지시문이 아니라 이 문서를 고친다.

- 루틴 지시문은 "이 플레이북과 아래 연결 문서를 읽고 그대로 실행"만 한다. 할 일·규칙·순서는 전부 여기.
- 연결 문서(해당 단계에서 반드시 읽고 따른다): `import-declaration.md`(수입신고), `jiyun-rules.md`(집운 배송 요청·취소·재발송).
- 이 문서와 루틴 메모(MEMORY.md)가 다르면 **이 문서가 우선**. 루틴 메모에는 진행 상태(최신 회차 기록·보고 표시)만 남긴다.
- 새 일이 없으면 보고 없이 끝낸다. 처리한 일 · 사용자가 할 일 · 막힌 일이 있을 때만 한국어로 짧게 보고.
- 개인정보: 고객 이름·전화·주소·통관부호·카드값은 절대 출력·보고하지 않는다. 이름은 "박*"처럼 가린다. 고객 정보 임시파일은 쓰고 바로 지운다(컨테이너 /tmp 포함).

## 0. 환경

- AGC FE https://agc-fe.vercel.app — 브라우저 로그인 쿠키로 `fetch('/api/...')`. 서버는 이 PC Docker(agc_app, agc_db, fin_db).
- 마켓 API: `docker exec -i -w /app -e PYTHONPATH=/app agc_app python -` 에서 `from services.order.market_clients import _naver_auth, NAVER_BASE, _coupang_call`. `_naver_auth()` 는 토큰 문자열 → 헤더 `{"Authorization": f"Bearer {t}", "Content-Type": "application/json"}`. `_coupang_call(method, path, query="", body=None)` — body 는 4번째 인자. 쿠팡 vendorId A01774978.
- HQ 키: `C:\Users\iwill\.hq\agent_key` (헤더 X-Service-Key) → http://127.0.0.1:8400/svc. 비밀번호·카드값은 HQ 에서 읽고 출력하지 않는다.
- 영수증 폴더: `C:\Users\iwill\AGC\receipts\` (세션 폴더 아님 — 옛 세션 폴더는 11-12 세션 삭제로 사라짐. git 에는 안 올라감) — 파일명 `{YYYYMMDD}_{주문코드}_{구매|집운}_주문상세_{타오바오번호}.pdf`.
- AGC `/api/orders` 의 receiver 는 가린 값 → 고객 원본은 마켓 API(네이버 product-orders/query 의 shippingAddress·individualCustomUniqueCode, 쿠팡 ordersheets 의 receiver·overseaShippingInfoDto)로.

## 1. 테스트 주문

- 목록 API(/api/orders, /api/taobao-purchases, /api/jiyun-shipments, /api/domestic-shipments)는 테스트 주문(is_test — 박찬호 본인 시험 주문 OR-261025-0001·0002, OR-261027-0002)을 기본으로 뺀다. 점검은 기본값(테스트 제외)으로 부른다.
- 테스트 주문과 그 상자(993101629730, 집운 8·10·11)는 추적·송장 처리·보고를 하지 않는다(사용자 11-06). **단 발송기한 관리(9단계)는 테스트 주문도 똑같이.**
- 새 테스트 주문(받는 사람 박찬호 본인)이 들어오면 결제하지 말고 `update market_order set is_test=true where code='OR-…'` 후 한 번 보고.

## 2. 결제 수단 · 원화 기록

- 타오바오 상품은 **알리페이 잔액(账户余额)** 으로 결제(사용자가 1위안≈202원에 충전). 잔액이 결제액보다 적을 때만 연동 현대카드로 결제하고 "알리페이 잔액 부족 — 충전 필요(잔액 ¥…)" 보고. 잔액이 ¥300 아래로 내려가면 한 번 "잔액 ¥… 남음" 보고.
- 결제는 한 회차에 필요한 만큼 한 번에(1건씩 나누지 않음). 알리페이 '앱 QR 스캔 인증'이 뜨면 그 회차 멈추고 QR 캡처 1회 보고, 사용자가 '결제해'라고 할 때까지 그 주문 결제 재시도 금지.
- 집운 운임은 사용자가 직접 낸다(에이전트는 집운 운임을 결제하지 않는다). 사용자가 결제수단을 말하지 않았으면 잔액으로 기록.
- 원화: 알리페이 잔액 결제(상품·집운) = 위안×202 반올림, charged_status "settled", charged_source "알리페이 잔액 결제(1위안 202원 충전분)", pay_method "alipay". FIN 지출 method 가 '알리페이(현대카드)'로 들어오면 `PATCH /svc/expenses/by-key/{ext_key} {method:"알리페이 잔액"}`. 微信支付(위챗페이) 집운만 위안×201.02, pay_method "other", settled.
- 카드 결제(VISA 8904): 직후 추정(위안×204.4, "none", "추정: 알리페이 연동 현대카드, 카드 승인내역 대조 전") → 매 회차 FIN 카드 내역(`select used_date, used_time, merchant, amount from card_transaction where merchant ilike '%taobao%' and not canceled order by used_date desc, used_time desc limit 20;` on fin_db)에서 결제 시각 ±15분·금액 ±5% 승인을 찾아 PATCH {charged_krw, charged_status:"approved", charged_source:"현대카드 승인 {금액}원 ({merchant} {날짜 시각}, FIN 카드 대조)"} 후 "카드값 확정" 보고. 이미 approved/settled 면 건드리지 않음. 아직 없으면 다음 회차(보고 안 함).

## 3. 타오바오 계정

- 결제용 ediopur01(집운 ID QVKDNMN3), 리서치용 eido_pur(집운 ID YIEVGIN3). 로그인 계정은 https://pcs.i56.taobao.com/user/consolidation/conso_order_list 왼쪽 위로 확인.
- **리서치용으로 로그인돼 있으면 절대 로그아웃·전환하지 않는다**(리서치 우선, 11-04). 결제용 단계(구매, 결제용 집운·구매목록 확인)는 건너뛰고, 새 주문이 있으면 발주확인·발송지연까지만 하고 "리서치 계정 로그인 중 — 결제 대기 주문: {코드}" 1회 보고(대기 코드가 바뀔 때만 다시).
- 로그아웃 상태면 **자동 로그인·슬라이더 시도 금지**(11-09). 아이디 입력만 해 두고 "결제용 로그인 필요 — 아이디 입력해 둘 테니 슬라이더만 밀어 주세요" 1회 보고. 로그인 화면 탭은 닫지 않는다.
- 결제용으로 로그인돼 있으면 아래 단계 모두 진행.

## 4. 새 주문

`GET /api/orders?stage=received&include_test=true`. 클레임(claim_type)이 있으면 처리하지 말고 보고. 실제 고객 주문마다:

1. 발주확인: `POST /api/orders/{id}/confirm`.
2. 네이버면 발송지연 1회: `POST {NAVER_BASE}/v1/pay-order/seller/product-orders/{line_no}/delay` body `{dispatchDueDate: 주문일+14일 "YYYY-MM-DDT23:59:59.000+09:00", delayedDispatchReason:"OVERSEA_DELIVERY", dispatchDelayedDetailedReason:"해외 구매대행 상품으로 중국 현지 구매 후 국제 배송(해운) 진행 중입니다. M월 D일까지 발송 예정입니다."}` → 조회로 반영 확인.
3. 쿠팡 받는 사람·통관부호가 빈값이면(11-10~ 쿠팡 API 현상): Wing 배송관리 → 상품준비중 → '엑셀 다운'(사유 5자 이상) 배송리스트에서 수취인이름(AA)·우편번호(AC)·주소(AD)·개인통관번호(AJ)·통관용수취인전화번호(AK, 010 — AB 안심번호 말고). AGC 가 비어 있으면 채우고(`_enc`·`run_pccc_check`, `norm_phone`·`receiver_fingerprint`) 통관 검증 '일치' 확인. 엑셀은 바로 지운다.
4. **매입처 예외 (조사 URL 대신 이걸 산다):** ⚠️ 11-14 기준 천묘→집운 창고 직접 주소 방식은 **미검증(구매 43 시험 중)**. 검증될 때까지 과일C 18·36포(`859xN` 등)는 **루이싱 공식점 ¥9.9 3袋 https://detail.tmall.com/item.htm?id=1074590269896 (수량 제한 없음, 韩国 集运 가능) × N개를 고객 한국 주소 + 集运-海运으로** 사고, 판매처 旺旺에 "최신 생산분으로" 요청(생산 5~6월·180일이라 유통기한 짧음). 천묘 시험이 성공하면 아래 천묘 방식으로 바꾼다. (이하 천묘 방식) 루이싱 과일C 아메리카노 `PR-261030-0028-{859 오렌지C·860 포멜로C·862 포도C}xN` 에서 N≥2(18포·36포) → 공식점 3포(¥19.9)는 1인 1개 한정이라 못 삼 → **천묘마트(天猫超市) https://detail.tmall.com/item.htm?id=987926818768 의 같은 맛 9袋 × (N÷3)개**(18포=2개, 36포=4개). 천묘는 한국 주소+集运이 안 돼서 받는 곳을 결제용 집운 창고 주소(`电美世路180号（韩国海运集运）@QVKDNMN3`, 수취인=그 고객 이름·전화)로 저장해 결제, 입고 뒤 집운 결제 때 고객 한국 주소 선택(11-14 OR-261113-0002 첫 사례). N=1(3포 1개)은 공식점 그대로. 진한 아메리카노(861)는 천묘에 없음 → 막히면 보고.
5. 타오바오 구매(결제용 로그인일 때만): seller_code `PR-...-{옵션id}[xN]` → price_survey_option(옵션명·가격)·price_survey.taobao_url. 상세에서 옵션 → 领券购买 → 주문서 使用新地址 → 切换(첫 클릭이 자주 안 먹음 — GHIJ 가 안 보이면 한 번 더) → GHIJ → 韩国 → 确定 → 시/구(iframe member1.tmall.com, 광주는 '전남광주통합특별시') → 상세주소·우편번호·이름·**통관부호(P+12)**·전화(+82, 숫자만) 입력·저장 → 그 주소 카드 선택 확인. 이미 저장된 고객이면 그 카드(`getByText(이름,{exact:true})`)를 누르고 자동으로 채워진 个人通关号 앞4·뒤5자리가 주문 통관부호와 같은지 확인.
   - 跨境段物流方式 **集运-海运**(直邮 아님, 합계에 跨境段运费가 없어야 함), 人民币 체크, 데이터 전송 동의 체크박스(ant-checkbox) checked 확인 후 提交订单(버튼 위치는 클릭 직전에 다시 잰다).
   - 알리페이 캐셔: 기본 VISA****8904 → '其他方式付款' → '账户余额' 라디오(잔액 ≥ 결제액) → iframe(pcauth-site.alipay.com/PASSWORD…) `#input_otp` 에 결제 비밀번호 6자리 pressSequentially(HQ `/svc/company-info/17` '결제 비밀번호', 출력 금지) → '确 定' → 支付成功. 잔액 부족일 때만 카드(HQ `/svc/company-info/15` 유효기간·CVC).
   - 같은 상품 연속 구매는 함수(toConfirm→pickCard→prepSubmit→submitAndPay)로 묶으면 빠르다.
   - 조사 판매처에서 못 사면(한도·품절) 결제하지 말고 보고. 예외: 비타 레몬티(PR-261019-0003)는 欢乐开怀食品旗舰店(787539058020) '【原箱15瓶】原味柠檬茶' ¥59.90 근처면 사도 됨(11-03).
   - 안전장치: 실결제가 조사가보다 20% 넘게 비싸거나 ¥400 초과, 옵션 애매, 슬라이더 외 캡챠면 결제하지 말고 보고.
5. 기록: `trade.tmall.com/detail/orderDetail.htm?bizOrderId={번호}` PDF → `POST /api/taobao-purchases {order_id, taobao_order_no, shop_name, item_url, items, paid_cny, purchased_at, pay_method:"alipay", pay_currency:"CNY", pay_amount, charged_krw, charged_status, charged_source, memo}` → `POST /api/orders/{id}/documents` (kind=purchase, purchase_id). FIN 지출은 서버가 자동 전송, 증빙 링크가 빠졌으면 `PATCH http://127.0.0.1:8300/svc/expenses/by-key/AGC-purchase-{id} {evidence:"해외 영수증", evidence_url:"https://agc-fe.vercel.app/api/orders/{id}/documents/{doc}/file"}` (키: HQ `/svc/api-credentials/by-code/fin_expense/values` 의 credential.secrets.agc).
6. 집운 묶음은 서버가 주문 들어올 때 자동으로 정한다(같은 받는 사람의 진행 중 주문 = 같은 bundle_key). 확인만.

## 5. 중국 내 배송 · 창고 입고

진행 중 구매기록(`GET /api/taobao-purchases`, cn_status ordered·shipped)을 결제용 계정의 구매목록·물류 화면(`market.m.taobao.com/app/dinamic/pc-trade-logistics/home.html?orderId=`)에서 확인. 판매처 발송(운송장)·창고 입고가 새로 보이면 `PATCH /api/taobao-purchases/{id}` (cn_status shipped/arrived, cn_tracking_no, shipped_at/arrived_at — 화면의 실제 시각). PC 待集运 화면은 소포 목록이 안 보인다(앱 전용).

## 6. 집운 (묶음 기준)

- **집운 결제 안내는 묶음 상자가 전부 입고됐을 때만 1회**: `/api/orders` 의 `progress.bundle.ready` 가 true(묶음 2건 이상) 또는 묶음 없는 주문의 소포 입고. 묶음 일부만 입고되면 결제 안내 금지 — "묶음 n/m 입고, 기다리는 중"으로만(같은 숫자 반복 보고 금지).
- 안내 문구: "집운 결제 필요: {주문코드들} {상품} — 이 고객 소포만 한 묶음, 받는 곳 = 고객 주소(시·구까지), 알리페이 잔액, 30kg 이하로(넘으면 大件操作费 ¥60 → 약 3박스=25kg 단위로 나눠 묶기)". 입고된 그 회차에 바로 보낸다(발송 점수 대부분이 입고~결제 대기). **안내 끝에 꼭 붙인다: "결제 화면 주소는 맨 위(가장 최근 저장) 주소가 자동 선택돼요 — 받는 사람 이름 확인 후 결제"** (11-12 사고: 새 주문 고객 주소가 맨 위에 저장돼 있어 OR-261110-0001 집운이 다른 고객 주소로 결제됨 → 退款 후 재결제). **안내 보내기 전에 결제용 주소록(https://i.taobao.com/my_itaobao/receiver-address-pc)에서 그 고객 주소 행의 \"置顶\"을 눌러 한국 주소 중 맨 위로 올려 둔다**(주소가 27개 넘게 쌓여 묻힘, 11-14 사용자 \"저장 안 돼 있네\"). 사용자가 집운을 결제하면 그 회차에 상세(conso_order_detail?tradeId=…)의 收货地址 이름·시·구가 그 주문 고객과 같은지 반드시 보고, 다르면 AGC 기록 전에 바로 보고(拣货 전 退款/投诉 가능). 같은 주문 재보고 방지: 구매기록 memo 끝 "[집운결제 안내 YYYY-MM-DD HH:MM]".
- 한 상자가 크게 늦어 따로 보내야 할 것 같으면 보고만(바꾸기는 사용자 결정 후 `PATCH /api/orders/{id}/bundle {key:null}`).
- 반품·취소로 환불 신청한 주문의 소포는 "반품 건 창고 도착 — 처리 결정 필요" 보고.
- 사용자가 결제한 집운 기록(conso_order_list 에 있는데 AGC `/api/jiyun-shipments?include_test=true` 에 LP 번호가 없는 것): `conso_order_detail?tradeId={집운주문번호}&channel=1` 에서 LP 번호·묶인 타오바오 주문·운송장·무게·운임·받는 곳 확인 → 운임 주문상세 PDF(`trade.taobao.com/trade/detail/trade_order_detail.htm?biz_order_id=`; 支付宝 vs 微信支付 확인) 저장 →
  - 주문 1건이면 `POST /api/jiyun-shipments`.
  - **여러 주문(같은 고객)이면 `POST /api/jiyun-shipments/bundle`** `{jiyun_no, orders:[{order_id, packages, weight_kg}], fee_cny(합계), pay_method, pay_currency, pay_amount(합계), charged_krw(합계), charged_status, charged_source, transport:"sea", requested_at}` — 금액은 무게 비율로 자동 분배, 번호 -2·-3 자동.
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
- **이미 끝난 취소도 매 회차 본다(11-13 누락 사고):** 쿠팡은 발주확인 뒤라도 고객이 앱에서 취소하면 RU(출고중지요청)를 거치지 않고 바로 `RETURNS_COMPLETED`(status=CC)가 되고 AGC 주문은 stage `cancelled` 로 바뀐다 → RU 만 보면 놓친다(OR-261112-0002 가 00:46 취소됐는데 8시간 동안 아무 회차도 退款 안 함). 매 회차 `GET /api/orders?stage=cancelled&include_test=true` 에서 claim_at 이 최근 7일인 주문마다 그 타오바오 구매 memo 에 `[退款 신청` 이 없고 cn_status 가 cancelled 가 아니면 → 아래 타오바오 환불 규칙대로 그 회차에 바로 처리(미발송이면 退款, 운송 중이면 拦截 退款, 입고·집운·출고 뒤면 신청 말고 보고). 네이버도 같은 방식(claim_type CANCEL/RETURN 완료). **그리고 쿠팡 CC 건의 `releaseStopStatus` 가 "미처리"면 Wing 출고중지요청 목록에 남아 있다(11-13 확인, API RU 엔 안 나옴)** → 중국 출고 전이면 그 회차에 `PUT .../returnRequests/{receiptId}/stoppedShipment` 로 출고중지 승인 → 다시 조회해 "처리(출고중지)" 확인. 이미 중국 출고면 승인하지 말고 보고.
- 쿠팡 출고중지요청은 매 회차 `GET .../returnRequests?createdAtFrom={30일 전}&createdAtTo={오늘}&status=RU`. API 로 안 되면 Wing(https://wing.coupang.com/tenants/sfl-portal/stop-shipment/list, HQ #2) '출고중지' 버튼.
- 타오바오 환불(결제용): 클레임 완료 + 소포 창고 입고 전이면 주문상세 → '退换/退款' → 未收到货 · 不想要了 · 전액 · 退款说明("客户取消了订单，包裹还在运输途中（{택배사} {운송장}），麻烦帮忙拦截退回，谢谢！" / 미발송 "客户取消了订单，请不要发货，谢谢！") → 提交 → 退款编号 확인 → 구매기록 memo "[退款 신청 YYYY-MM-DD HH:MM] 退款编号 …, ¥금액, 사유" → 보고. 이미 입고·집운·출고면 신청하지 말고 보고만. 요청 단계 클레임은 한 번만 보고.
- 환불 추적: https://refund2.taobao.com/dispute/buyerDisputeList.htm — 거절·추가 요구는 바로 보고, 退款成功 새로 보이면 memo "[退款成功 YYYY-MM-DD HH:MM] ¥금액" + 보고.
- FIN 환불 줄(11-07): 원 지출은 두고 음수 줄 `POST http://127.0.0.1:8300/svc/expenses` — ext_key 원+"-refund", spent_on 환불일, amount −원화, foreign_amount "−위안", 나머지는 원 지출과 같게, purpose "{주문코드} 상품 구매 환불 (사유)". 잔액 결제분은 退款成功 즉시, 카드분은 FIN 카드 취소가 보인 뒤.

## 10. 발송기한(출고지연) 관리 — 테스트 주문 포함

- `GET /api/orders?stage=processing&include_test=true`(received 도). 마켓에 국내 송장이 없는 주문마다 ship_due_at(KST 날짜).
- 조회되는 번호가 있으면 기한 전이라도 바로 발송처리(테스트 상자도).
- D-3 에 송장 없음 → 1회 보고("발송기한 임박: {코드} {마켓} 기한 {M/D}, 현재 위치 … — 쿠팡은 Wing '배송지연안내' 필요 / 네이버는 발송지연 1회 이미 사용"). D-1 에 한 번 더. 지나면 "출고지연 발생" 보고. 같은 단계 반복 금지 — 루틴 메모에 "[기한보고 {코드} D-3/D-1/지연]".

## 11. 끝내기

- 탭은 openTab/closeTab 만, 끝나면 연 탭 닫기(로그인 화면 탭은 남김). 사용자 탭은 닫지 않는다.
- 같은 동작 2~3번 실패하면 멈추고 보고.
- 결제·발송처리·환불 신청·수입신고를 했으면 보고에 주문코드·금액·번호·결제 수단(잔액/카드)을 넣는다.
- 루틴 메모 맨 위 '최신' 에 이번 회차 상태를 남긴다(규칙은 적지 않는다 — 규칙은 이 문서).
