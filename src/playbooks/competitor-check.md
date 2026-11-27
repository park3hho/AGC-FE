# 최저가 경쟁 점검 (루틴용 방법서)

> 매일 05:00 루틴(buUc5dBKcmMZIF1o)이 읽고 따른다. **무엇을 볼지는 서버 대기열이 정한다. 이 문서는 '어떻게 보는지'만 적는다.**
> 진행 상태 · 다음 차례 · 제품별 검색어/메모는 루틴 메모에 적지 않는다. DB(API)에 넣는다. (사용자 원칙 2026-11-19)

## 1. API (로컬 서버, 헤더 `X-API-Key` = `C:\Users\iwill\.agc\api_key`)

REPL `fetch('http://127.0.0.1:8000/...', {headers:{'X-API-Key': key}})` 로 부른다. 안 되면 https://agc-fe.vercel.app/ 탭 안에서 `fetch('/api/...')`(로그인 쿠키).

| 할 일 | API |
|---|---|
| 오늘 볼 목록 (순서·사유 서버 계산) | `GET /competitor-prices/queue?platform=coupang\|naver&limit=40` |
| 결과 저장 (10개씩) | `POST /competitor-prices/bulk {items:[...]}` → 저장되면 그 줄 사유가 서버에서 풀린다 |
| 제품별 검색어 · 메모 · 보류 | `PUT /competitor-prices/watch {product_id, platform, option_id?, query_override, search_note, skip_days, flag_reason}` (보낸 칸만 바뀜) — needs_user_check 는 쓰지 않는다(11-20 사용자) |
| 메모 목록 | `GET /competitor-prices/watch?platform=` |

- queue 항목: `rank, group(order·changed(수정)·new·retry·watch·stale), reasons[{code,label,detail}], product_id, option_id, title, option, query(query_override → 지난 검색어 → 제품명), search_note, user_note, needs_user_check, last_verdict, last_checked_at, our_price, min_price, vendor_name, vendor_price, vendor_ref`.
- 정렬 = **가중치 점수 높은 순** (사유 + 경과 + 매출 + 경쟁, 가중치 BE `core/competitor_config.py`, 항목마다 score · score_breakdown). 대기열 위에서부터 40건, 순서를 바꾸지 않는다.
- 제외(excluded 칸, 뒤로 빠짐): 보류(skip) 중 새 사유 없음 · 24시간 안 확인 + 새 사유 없음. 제외된 줄은 보지 않는다. 같은 브랜드가 여러 줄이면 검색 1번으로 같이 판정해도 된다(대기열 안의 줄만). (needs_user_check 는 더 쓰지 않음 — 혹시 true 로 남은 줄이 있으면 PUT watch {needs_user_check:false} 로 풀고 판단해 저장)
- bulk 항목: `product_id, platform, option_id(queue 의 option_id), status(found · only_us · not_found), vendor_name, vendor_price(배송비 포함 총액, 우리 수량으로 환산), vendor_shipping, vendor_type(agency · warehouse · unknown), vendor_note(200자, 환산 근거), vendor_url, query, vendor_ref`(쿠팡 `{productId, vendorItemId}`). verdict 는 서버가 계산.
- 그대로면(경쟁자 같음) 같은 값으로 다시 저장 → checked_at 갱신.
- **다음 회차에 알아야 할 것은 전부 PUT watch 로 남긴다**:
  - 검색어가 안 먹혀 다른 검색어로 찾았으면 `query_override` + `search_note`.
  - **애매한 건 AI 가 판단해서 그대로 저장한다 (2026-11-20 사용자, needs_user_check 쓰지 않음)**: 같은 제품인지(배치·무가당 여부 등), 다른 용량과 비교할지 정하고 근거는 `vendor_note` 에 한 줄로 남긴다.
  - 방금 새로 lose·match 가 된 것은 `skip_days:1`(다음 날 재확인 생략, 주문·수정·신규는 보류여도 다시 올라옴).
  - (참고) 예전에 붙인 확인 필요 표시는 Tracker 가 11-20 에 모두 풀었다. `flag_reason:""` 로 확인 필요 표시를 지울 수 있다.

## 2. 네이버
- 주소 (11-27 부터 기본): `https://msearch.shopping.naver.com/search/all?query={검색어}` (모바일 쇼핑 가격비교). 11-27 에 `search.naver.com/search.naver?ssc=tab.shopping.all&where=shopping` 은 쇼핑 결과 없이 일반 통합검색(블로그 등)만 나와서 못 쓴다. `search.shopping.naver.com/ns/search` 는 보안 확인이 떠서 쓰지 않는다. msearch 가 막히면 그 회차 네이버 중단.
- msearch 파싱: 아래로 4000px 씩 3번 스크롤(30~40개) 후 `document.body.innerText` 를 '상품 바로가기' 로 나눈 덩어리마다 줄 배열. 첫 줄 = 제목('해외' 접두 = agency), '정상가' 다음 숫자는 건너뛰고 첫 'N원' 줄 = 가격, '배송비' 다음 줄 = '무료'/'N원', 그 뒤 '평점' · '5.012찜 14'(숫자.숫자로 시작) · '찜 N' · '구매 N+' · '(…당 …원)' · '오늘출발…' 을 건너뛴 첫 줄 = 스토어. 11-27 31번 검색에 보안 확인 없음.
- 파싱: '배송비'와 img 가 있는 최하위 li 의 innerText 줄. 제목 첫 줄이 '해외'로 시작 = 구매대행(agency). 가격은 첫 '숫자 + 원'(최대할인가 · '할인 전 판매가' 다음 숫자는 건너뜀). '배송비 무료/N원'. 그 뒤 잡줄('관부가세 별도' 등) 건너뛴 첫 줄 = 스토어.
- 제외 스토어: 이도식품(우리), 쿠팡 · G마켓 · 옥션 · 11번가 광고 줄. '네이버 가격비교' · '네이버플러스 스토어' 두 묶음 모두 본다.
- 결과가 10~20개로 적다. 같은 상품이 안 보이면 브랜드+맛+용량으로 좁혀 한 번 더.

## 3. 쿠팡
- 회차당 요청(검색 + 상품페이지) **40개 이하**(약 44번째에 Access Denied). 요청 간격 45초 이상.
- 검색: `https://www.coupang.com/np/search?q={검색어}&listSize=72` → `li[class*=ProductUnit]` innerText 줄(마지막 'N원' = 판매가, '배송비 N원', '도착' 줄), href 에 itemId · vendorItemId.
- 판매자: 쿠팡 탭 안에서 `fetch('/vp/products/{id}?itemId=..&vendorItemId=..')` HTML 정규식 `sellerName\":\"(..)` (판매자는 vendorItem 마다 다름). 실패하면 상품명 앞 스토어명, 없으면 '미확인(쿠팡 상품번호)'.
- 우리 판매자명 '이도'. 우리 상품은 보통 'MM/DD 도착 예정'(12/14 무렵) · 상품번호 979x~983x(11-21 등록 [낱개] 상품은 9834xxxxxx, 배송비 9,900 붙은 줄).
- 판매자 확인은 lose · match · 새 cheapest 후보만(요청 아끼기).

## 4. 판정 · 환산
- vendor_price = 배송비 포함 총액. 묶음은 '단가 × 우리 수량 + 배송비 1회'로 환산, note 에 근거(예: "24캔 37,800원 → 15병 환산"). 환산 배수가 크면 note 에 [환산 큼].
- **용량이 다르면 같은 용량끼리만 비교한다(판정·vendor_price 는 같은 용량 경쟁자 기준).** 다른 용량 상품은 판정에 쓰지 않고 vendor_note 에 100ml당 가격만 적는다(예: "500ml×15 33,000원 = 100ml당 440원"). 같은 용량 경쟁자가 없으면 only_us.
- 캉스푸 계열 · 통일 녹차 · 북빙양 · 홍바오라이 · 전전 등은 국내 창고 판매자(삼양국제무역 · 길상무역 · 티케이 · 산해무역 등)가 있어 lose 가 많다.

## 5. REPL 요령
- 저장 후 판정 확인: `GET /competitor-prices?platform=` → `items[].platforms[pf].main.verdict`, 다른 옵션은 `checks[].verdict`(option_id 로 찾기). 방금 본 줄은 queue 에서 빠지므로 queue 로는 못 본다. queue `limit` 은 500 이하(1000 은 items 없음).
- REPL 첫 `fetch` 전에 `openTab('about:blank')` 하나를 먼저 연다(탭이 없으면 fetch 가 'Tab ... no longer available' 로 실패).
- 네이버 카드 innerText 는 가격이 '27,600' / '원' 두 줄로 나뉜다. 스토어 줄 앞 '(100ml당 …)' · '찜 1' · '구매 1찜 1' · '5.0' · '(1)' 은 건너뛴다. '11번가' 처럼 숫자로 시작하는 스토어도 있다.
- 쿠팡 쿼리가 같은 줄(예: 313·315)은 검색 1번으로 같이 판정. 다른 줄 검색 결과에 같은 경쟁 상품이 보이면 그걸로 저장해 요청을 아낀다(note 에 적기). 쿠팡 탭 안 `fetch('/vp/products/…')` 도 요청 1개로 센다.
- 330ml 묶음 상품은 같은 제품 500ml 묶음이 훨씬 싸게 있는 경우가 많다(캉스푸 빙홍차·빙탕쉐리·녹차). 같은 용량(330ml)끼리 비교하고, 500ml 는 note 에 100ml당 가격만 남긴다.
- 한 호출 안에서 쿠팡 1건 → 네이버 몇 건 → 쿠팡 1건으로 번갈아(호출당 쿠팡 최대 2건). 호출 하나의 sleep 합계 110초 이하. 호출이 끝나면 백그라운드 비동기는 끊긴다.
- 저장 후 목록 `GET /competitor-prices?platform=` 의 items 는 `{product:{id,...}, platforms}` 모양이다(product_id 칸 없음, `product.id` 로 찾기).
- 네이버 스토어 줄 앞에 '리뷰 629' · '4.81'(소수 둘째 자리 평점) · '구매 80+' 줄이 끼면 스토어로 잘못 읽힌다. 건너뛴다. '네이버 가격비교' 묶음은 스토어 줄이 아예 없다(스토어 미상으로 두고 note 에 적기).
- 신상품(group new) 의 query 는 긴 제품명 그대로라 검색이 안 된다. '브랜드 + 핵심 제품명'(예: '차옌웨써 티백', '차리 CHALI 티백')으로 찾고, 저장 뒤 PUT watch `query_override` 로 남긴다. [낱개] 상품은 기존 묶음 상품과 같은 검색 1번으로 같이 판정된다.
- 네이버 카드에서 '배송비' 와 '무료'/'3,000원' 이 두 줄로 나뉠 때가 있다(다음 줄을 값으로 읽기).
- 쿠팡 판매자 조회 HTML 정규식은 `sellerName\\?":\\?"([^"\\]+)` 처럼 역슬래시 이스케이프를 허용해야 잡힌다.
- 쿠팡 요청이 1~2개 남으면 not_found 줄을 다른 검색어로 다시 찾는 데 쓴다(찾으면 watch query_override).
- bulk `vendor_url` 은 500자 이하. 네이버 광고 줄(`ader.naver.com/...`) 링크는 500자를 넘어 그 10개 묶음 전체가 422 로 실패한다 → 광고 링크는 null 로 보낸다(11-23).
- 같은 판매자가 우리와 같은 수량 옵션도 팔면 그 옵션 가격으로 저장하고, 큰 묶음 환산가는 note 에 [환산 큼] 참고로만 적는다(예: 6개입 29,800 저장, 18개입 → 6 환산 14,367 은 note).
- [박스] 상품 옵션명 '184g×3봉 552g (2세트 묶음 6봉 …)' 처럼 괄호에 묶음이 적혀 있어도 비교 수량은 괄호 앞(3봉)이다. 우리 판매가가 그 수량 기준이다(11-24 펑리수).
- 지난 경쟁자가 검색 결과에 안 보이면 쿠팡 탭 안 `fetch('/vp/products/{id}')` 1번으로 판매자 · 가격이 살아 있는지 확인하고 같은 값으로 저장한다(요청 1개로 셈, 11-24 루이싱 히스).
- 쿠팡 검색에서 다른 상품번호(예: 9470222500 · 8637970661) 아래에 vendorItemId 9626976xxxx · 96329xxxxxx 이고 가격이 우리 판매가와 같은 줄은 우리 판매(카탈로그 묶임)로 보고 경쟁자에서 뺀다(11-25 플랫화이트 · 레이즈 캔).
- 상품페이지 HTML 의 '품절' 글자는 다른 영역에도 있어 품절 판단에 쓰지 않는다. 가격 · 판매자만 확인하고 note 에 '품절 가능성'으로만 적는다(11-25).
- 11-25 등록 신상품의 우리 쿠팡 줄은 상품번호 9843xxxxxx · vendorItemId 96392xxxxxx (12/17 도착 예정). 같은 브랜드 신상품 여러 줄은 브랜드명 하나로 검색 1번(예: '원기삼림' 1번으로 6줄, '융푸 커피' 1번으로 2줄) 해서 요청을 아낀다(11-26).
- 네이버에서 신상품이 안 보이면 다른 용량 · 일본판 · 유럽판(예: 네스카페 골드블렌드, 유럽 TUC 100g)은 [제품 다름]으로 only_us 저장하고 note 에 100g당 가격만 남긴다(11-26).
- 11-26 등록 신상품의 우리 쿠팡 줄은 상품번호 9845xxxxxx · vendorItemId 96400xxxxxx (12/14 · 12/18 도착 예정)(11-27).
- 낱봉 무게가 다른 상품(예: 계란파이 460g 봉 vs 우리 650g 박스)은 무게로 환산하지 않는다. [용량 다름] only_us 로 저장하고 note 에 100g당 가격만(11-21 사용자 규칙, 11-27 다리위안 448).
- 쿠팡 상품페이지 HTML 의 `finalPrice` 값은 다른 옵션 가격이 섞여 헷갈린다. 요청한 vendorItemId 의 가격은 ld+json 의 `"price":"12800"` · `availability`(InStock) 로 읽는다. 판매자명은 `shop.coupang.com/vid/...` 링크 글자(11-28 펑리수).
- 네이버 msearch 카드에서 '관부가세 별도' 다음 '도움말' 줄도 스토어가 아니다(건너뜀). 제목 앞 '구매 N+' · '쿠팡 특가 바로가기' · '오늘주문 내일도착' · '브랜드 카탈로그' 줄도 제목이 아니다(11-28).
- 탭은 openTab/closeTab, 끝나면 닫는다.

## 6. 규칙
- 관찰만. 구매 · 장바구니 · 문의 · 리뷰 금지. 우리 가격은 바꾸지 않고 보고에서 제안만. 타오바오 쓰지 않는다.
- 06:40 이 되면 저장하고 멈춘다. 캡차 · 차단은 그 판매처만 멈춘다.
