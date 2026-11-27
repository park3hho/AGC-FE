// 상세페이지 템플릿 스타일 — CSS Modules 가 아니라 문자열인 이유 (DESIGN.md §4.7):
//   이미지로 내보낼 때 이 페이지 DOM 을 그대로 그림(SVG foreignObject)으로 바꾸는데,
//   그때 함께 들어가는 스타일은 페이지 안의 <style> 뿐이다. 그래서 모든 규칙을 .dp 아래로 묶어 페이지 안에 넣는다.
// 기준 디자인: 2026-11-27 사용자 선택 '에디토리얼' 안 (자사몰 eidofood.com 디자인 시스템 — 흰 바탕·검은 글씨·1px 선·모서리 0·그림자 없음)
//   이전(파란 그라데이션 S1~S6, 2026-10-21) 은 git 기록에 있다.
// 글꼴: 앱에 실은 Pretendard 만 쓴다 (@font-face) — 이미지를 그릴 때 utils/exportImages 가 이 주소를 data URL 로 바꿔 넣는다
import { TEMPLATE_FONT_FAMILY, TEMPLATE_FONT_URL, TEMPLATE_WIDTH } from '@/constants/designConst'

export const TEMPLATE_CSS = `
@font-face{font-family:'${TEMPLATE_FONT_FAMILY}';src:url(${TEMPLATE_FONT_URL}) format('woff2');
  font-weight:100 900;font-style:normal;font-display:block}
.dp{--ink:#000;--sub:#5d5d5d;--mute:#a0a0a0;--line:#e4e4e4;--soft:#f5f5f5;--tag:#f1f1f1;
  width:${TEMPLATE_WIDTH}px;background:#fff;color:var(--ink);overflow:hidden;text-align:left;
  font-family:'${TEMPLATE_FONT_FAMILY}',sans-serif;-webkit-font-smoothing:antialiased;line-height:1.5}
.dp *{box-sizing:border-box;margin:0;padding:0}
.dp img{display:block}
.dp .dp-mark{display:inline-block;background:#ffe66b;color:#5a4a00;font-size:.72em;font-weight:700;padding:1px 6px;margin:0 3px;vertical-align:.12em;line-height:1.4;letter-spacing:0}
.dp .dp-regno{font-size:14px;color:var(--sub);padding:14px 48px;border-bottom:1px solid var(--line)}
.dp .dp-regno b{color:var(--ink);font-weight:600}
/* S1 */
.dp .dp-hero-img{background:var(--soft);display:flex;justify-content:center}
.dp .dp-hero-img img{width:${TEMPLATE_WIDTH}px;height:auto;max-height:1100px;object-fit:contain}
.dp .dp-hero-pad{height:0}
.dp .dp-hero{padding:0}
.dp .dp-hero-tx{padding:64px 48px 56px;border-bottom:1px solid var(--line)}
.dp .dp-eyebrow{display:block;font-size:16px;font-weight:700;letter-spacing:.02em}
.dp .dp-hero h1{font-size:54px;line-height:1.2;font-weight:700;letter-spacing:-.035em;margin-top:18px}
.dp .dp-hero h1 em{font-style:normal;font-weight:800}
.dp .dp-name{font-size:19px;color:var(--sub);margin-top:20px;font-weight:500}
.dp .dp-name small{display:block;font-size:16px;color:var(--mute);margin-top:4px;font-weight:400}
.dp .dp-badges{display:flex;margin-top:44px;border-top:1px solid var(--ink)}
.dp .dp-badge{flex:1;padding:22px 0 4px;border-right:1px solid var(--line)}
.dp .dp-badge+.dp-badge{padding-left:24px}
.dp .dp-badge:last-child{border-right:0}
.dp .dp-badge b{display:block;font-size:40px;font-weight:600;letter-spacing:-.02em;line-height:1.15}
.dp .dp-badge span{font-size:15px;color:var(--sub)}
.dp .dp-free{display:inline-flex;align-items:center;gap:12px;margin-top:30px;background:var(--tag);padding:9px 14px;font-size:16px;color:#333}
.dp .dp-free b{font-weight:700;color:var(--ink)}
/* 공통 섹션 */
.dp .dp-sec{padding:96px 48px;border-bottom:1px solid var(--line)}
.dp .dp-label{font-size:14px;font-weight:800;letter-spacing:.16em;color:var(--mute)}
.dp h2{font-size:40px;line-height:1.25;font-weight:700;letter-spacing:-.035em;margin-top:14px}
.dp .dp-lead{font-size:20px;color:#333;margin-top:16px;line-height:1.7}
/* S2 포인트 — 01·02·03 문단 + 사진 */
.dp .dp-points{display:flex;flex-direction:column;margin-top:56px;border-top:1px solid var(--ink)}
.dp .dp-point{border-bottom:1px solid var(--line);padding:44px 0}
.dp .dp-point-row{display:flex;align-items:flex-start;gap:28px}
.dp .dp-num{flex:0 0 auto;font-size:16px;font-weight:800;letter-spacing:.12em;color:var(--mute);padding-top:10px;width:44px}
.dp .dp-point-tx{flex:1;min-width:0}
.dp .dp-point h3{font-size:32px;font-weight:700;letter-spacing:-.03em;line-height:1.3}
.dp .dp-point p{font-size:19px;color:#333;margin-top:10px;line-height:1.7}
.dp .dp-big{margin-left:auto;text-align:right;font-size:52px;font-weight:600;letter-spacing:-.03em;white-space:nowrap;line-height:1.1}
.dp .dp-big small{display:block;font-size:14px;color:var(--sub);font-weight:500;letter-spacing:0;margin-top:4px}
.dp sub{font-size:.55em;line-height:0;position:relative;top:.12em;vertical-align:baseline;letter-spacing:0;margin-left:.04em}
.dp .dp-point-img{background:var(--soft);display:flex;align-items:center;justify-content:center;margin-bottom:32px}
.dp .dp-point-img img{max-width:100%;width:auto;height:auto;max-height:820px;object-fit:contain}
.dp .dp-point-side,.dp .dp-point-rev{display:block}
/* S3 맛 — 1px 선 2열 그리드 */
.dp .dp-flavors{display:grid;grid-template-columns:1fr 1fr;margin-top:56px;border-top:1px solid var(--ink)}
.dp .dp-flavor{border-bottom:1px solid var(--line);display:flex;flex-direction:column}
.dp .dp-flavor:nth-child(odd){border-right:1px solid var(--line)}
.dp .dp-ph{background:var(--soft);display:flex;align-items:center;justify-content:center;aspect-ratio:1/1;padding:18px}
.dp .dp-ph img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain}
.dp .dp-tx{padding:24px 22px 30px;min-width:0}
.dp .dp-opt{font-size:13px;font-weight:800;letter-spacing:.12em;color:var(--mute)}
.dp .dp-flavor h3{font-size:26px;font-weight:700;letter-spacing:-.03em;margin-top:6px;line-height:1.3}
.dp .dp-cn{font-size:15px;color:var(--mute);margin-top:2px}
.dp .dp-flavor p{font-size:17px;color:#333;margin-top:12px;line-height:1.6}
.dp .dp-chips{display:flex;gap:6px;margin-top:16px;flex-wrap:wrap}
.dp .dp-chip{font-size:13px;font-weight:600;padding:4px 9px;background:var(--tag);color:#333}
.dp .dp-flavor-text .dp-tx{padding-top:30px}
.dp .dp-note{font-size:15px;color:var(--sub);margin-top:24px;line-height:1.7}
.dp .dp-gallery{margin-top:64px}
.dp .dp-gallery-title{font-size:26px;font-weight:700;letter-spacing:-.03em;padding-bottom:16px;border-bottom:1px solid var(--ink)}
.dp .dp-gal{display:grid;grid-template-columns:1fr 1fr}
.dp .dp-gal-1{grid-template-columns:1fr}
.dp .dp-gal-item{display:flex;flex-direction:column;border-bottom:1px solid var(--line)}
.dp .dp-gal-item:nth-child(odd){border-right:1px solid var(--line)}
.dp .dp-gal-1 .dp-gal-item{border-right:0}
.dp .dp-gal-img{flex:1;background:var(--soft);display:flex;align-items:center;justify-content:center;padding:14px}
.dp .dp-gal-img img{max-width:100%;max-height:520px;width:auto;height:auto;object-fit:contain}
.dp .dp-gal-1 .dp-gal-img img{max-height:900px}
.dp .dp-gal-item figcaption{font-size:15px;color:var(--sub);padding:14px 16px;line-height:1.5}
/* S4 정보 */
.dp .dp-label-photo{position:relative;margin-top:44px;border:1px solid var(--line);padding:18px}
.dp .dp-label-tag{position:absolute;top:30px;left:30px;z-index:1;font-size:13px;font-weight:700;color:#fff;background:#000;padding:5px 10px}
.dp .dp-label-img{background:var(--soft);display:flex;justify-content:center}
.dp .dp-label-img img{max-width:100%;max-height:900px;width:auto;height:auto;object-fit:contain}
.dp .dp-label-photo figcaption{font-size:14px;color:var(--sub);margin-top:12px;line-height:1.5}
.dp table.dp-info{width:100%;border-collapse:collapse;margin-top:44px;font-size:18px}
.dp table.dp-info th{width:180px;text-align:left;font-weight:600;padding:20px 0;border-bottom:1px solid var(--line);vertical-align:top}
.dp table.dp-info td{padding:20px 0;border-bottom:1px solid var(--line);line-height:1.65;color:#333}
.dp table.dp-info tr:first-child th,.dp table.dp-info tr:first-child td{border-top:1px solid var(--ink)}
.dp .dp-nutri{display:flex;margin-top:32px;border-top:1px solid var(--ink)}
.dp .dp-nutri div{flex:1;padding:20px 0 6px 18px;border-right:1px solid var(--line)}
.dp .dp-nutri div:first-child{padding-left:0}
.dp .dp-nutri div:last-child{border-right:0}
.dp .dp-nutri b{display:block;font-size:30px;font-weight:600;letter-spacing:-.02em}
.dp .dp-nutri span{font-size:15px;color:var(--sub)}
/* S5 */
.dp .dp-how{display:flex;margin-top:48px;border-top:1px solid var(--ink)}
.dp .dp-card{flex:1;padding:30px 22px 10px 0;border-right:1px solid var(--line)}
.dp .dp-card+.dp-card{padding-left:22px}
.dp .dp-card:last-child{border-right:0}
.dp .dp-ico{width:40px;height:40px;margin:0 0 18px;display:flex;align-items:center}
.dp .dp-card h3{font-size:22px;font-weight:700;letter-spacing:-.02em}
.dp .dp-card p{font-size:16px;color:#333;margin-top:8px;line-height:1.6}
/* S6 공통 안내 */
.dp .dp-s6{padding:88px 48px 64px}
.dp .dp-s6 h2{font-size:32px}
.dp .dp-s6 ul{list-style:none;margin-top:32px;border-top:1px solid var(--ink)}
.dp .dp-s6 li{display:flex;gap:24px;padding:18px 0;border-bottom:1px solid var(--line);font-size:17px;line-height:1.6;color:#333}
.dp .dp-s6 li b{flex:0 0 160px;color:var(--ink);font-weight:700}
/* 찾는 제품 요청 */
.dp .dp-rq{margin:0 48px 72px;border:1px solid var(--ink);padding:40px 36px}
.dp .dp-rq h2{font-size:32px;margin-top:10px}
.dp .dp-rq-p{font-size:18px;line-height:1.75;color:#333;margin-top:14px}
.dp .dp-rq-steps{display:flex;border-top:1px solid var(--line);margin-top:28px}
.dp .dp-rq-steps div{flex:1;padding:18px 14px 18px 0;border-right:1px solid var(--line)}
.dp .dp-rq-steps div+div{padding-left:16px}
.dp .dp-rq-steps div:last-child{border-right:0}
.dp .dp-rq-steps b{display:block;font-size:14px;color:var(--mute);font-weight:800}
.dp .dp-rq-steps span{font-size:17px;font-weight:600}
.dp .dp-rq-tel{display:flex;justify-content:space-between;align-items:center;background:#000;color:#fff;padding:20px 26px;margin-top:8px}
.dp .dp-rq-tel span{font-size:16px}
.dp .dp-rq-tel b{font-size:32px;font-weight:700;letter-spacing:.02em;font-variant-numeric:tabular-nums}
.dp .dp-rq-s{font-size:14px;color:var(--sub);margin-top:12px}
.dp .dp-foot{border-top:1px solid var(--line);color:var(--sub);text-align:center;font-size:14px;padding:22px 0}
`
