// 상세페이지 템플릿 스타일 — CSS Modules 가 아니라 문자열인 이유 (DESIGN.md §4.7):
//   이미지로 내보낼 때 이 페이지 DOM 을 그대로 그림(SVG foreignObject)으로 바꾸는데,
//   그때 함께 들어가는 스타일은 페이지 안의 <style> 뿐이다. 그래서 모든 규칙을 .dp 아래로 묶어 페이지 안에 넣는다.
// 기준 디자인: 2026-10-21 사용자 승인 상세페이지 (S1~S6, 폭 860px)
// 글꼴: 앱에 실은 Pretendard 만 쓴다 (@font-face) — 이미지를 그릴 때 utils/exportImages 가 이 주소를 data URL 로 바꿔 넣는다
import { TEMPLATE_FONT_FAMILY, TEMPLATE_FONT_URL, TEMPLATE_WIDTH } from '@/constants/designConst'

export const TEMPLATE_CSS = `
@font-face{font-family:'${TEMPLATE_FONT_FAMILY}';src:url(${TEMPLATE_FONT_URL}) format('woff2');
  font-weight:100 900;font-style:normal;font-display:block}
.dp{--ink:#0f1b2d;--sub:#5b6778;--line:#e3e9f1;--bg:#f4f8fc;--blue:#1d6fe0;--sky:#e7f1ff;--deep:#0b2a55;
  width:${TEMPLATE_WIDTH}px;background:#fff;color:var(--ink);overflow:hidden;text-align:left;
  font-family:'${TEMPLATE_FONT_FAMILY}',sans-serif;
  -webkit-font-smoothing:antialiased;line-height:1.5}
.dp *{box-sizing:border-box;margin:0;padding:0}
.dp img{display:block}
.dp .dp-mark{display:inline-block;background:#ffe66b;color:#5a4a00;font-size:.72em;font-weight:700;
  border-radius:4px;padding:1px 6px;margin:0 3px;vertical-align:.12em;line-height:1.4;letter-spacing:0}
.dp .dp-regno{background:var(--deep);color:#b9cbe6;font-size:15px;text-align:center;padding:12px 0}
.dp .dp-regno b{color:#fff;font-weight:600}
.dp .dp-hero{background:linear-gradient(180deg,#eaf4ff 0%,#cfe5ff 55%,#2f86f0 100%);padding:64px 0 0;text-align:center}
.dp .dp-eyebrow{display:inline-block;font-size:17px;font-weight:600;color:var(--blue);background:#fff;border-radius:999px;padding:8px 18px}
.dp .dp-hero h1{font-size:58px;line-height:1.18;font-weight:800;letter-spacing:-.03em;margin-top:22px;color:var(--deep);padding:0 40px}
.dp .dp-hero h1 em{font-style:normal;color:var(--blue)}
.dp .dp-name{font-size:22px;color:#33507a;margin-top:18px;font-weight:500;padding:0 40px}
.dp .dp-name small{display:block;font-size:16px;color:#6a83a6;margin-top:6px;font-weight:400}
.dp .dp-badges{display:flex;justify-content:center;gap:12px;margin-top:30px}
.dp .dp-badge{background:#fff;border-radius:16px;padding:14px 22px;min-width:150px}
.dp .dp-badge b{display:block;font-size:26px;font-weight:800;color:var(--deep);letter-spacing:-.02em}
.dp .dp-badge span{font-size:14px;color:var(--sub)}
.dp .dp-hero-img{margin-top:40px;height:760px;overflow:hidden}
.dp .dp-hero-img img{width:${TEMPLATE_WIDTH}px;height:1023px;object-fit:cover;object-position:top}
.dp .dp-hero-pad{height:40px}
.dp .dp-sec{padding:96px 64px}
.dp .dp-label{font-size:15px;font-weight:700;color:var(--blue);letter-spacing:.12em}
.dp h2{font-size:42px;line-height:1.25;font-weight:800;letter-spacing:-.03em;margin-top:12px}
.dp .dp-lead{font-size:20px;color:var(--sub);margin-top:14px;line-height:1.6}
.dp .dp-points{display:flex;flex-direction:column;gap:20px;margin-top:48px}
.dp .dp-point{display:flex;align-items:center;gap:28px;background:var(--bg);border-radius:24px;padding:32px 36px}
.dp .dp-num{flex:0 0 auto;width:84px;height:84px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;color:var(--blue)}
.dp .dp-point h3{font-size:28px;font-weight:800;letter-spacing:-.02em}
.dp .dp-point p{font-size:19px;color:var(--sub);margin-top:6px;line-height:1.55}
.dp .dp-big{margin-left:auto;text-align:right;font-size:44px;font-weight:800;color:var(--deep);letter-spacing:-.03em;white-space:nowrap}
.dp sub{font-size:.55em;line-height:0;position:relative;top:.12em;vertical-align:baseline;letter-spacing:0;margin-left:.04em}
.dp .dp-big small{display:block;font-size:14px;color:var(--sub);font-weight:500;letter-spacing:0}
.dp .dp-s3{background:var(--bg)}
.dp .dp-flavors{display:flex;flex-direction:column;gap:28px;margin-top:48px}
.dp .dp-flavor{background:#fff;border-radius:28px;overflow:hidden;display:flex}
.dp .dp-ph{flex:0 0 340px;height:380px;overflow:hidden;background:#dfeefe}
.dp .dp-ph img{width:340px;height:405px;object-fit:cover;object-position:center top}
.dp .dp-tx{padding:44px 40px;display:flex;flex-direction:column;justify-content:center;min-width:0}
.dp .dp-opt{font-size:15px;font-weight:700;letter-spacing:.08em;color:var(--blue)}
.dp .dp-flavor h3{font-size:38px;font-weight:800;letter-spacing:-.03em;margin-top:8px}
.dp .dp-cn{font-size:16px;color:#8a96a8;margin-top:4px}
.dp .dp-flavor p{font-size:19px;color:var(--sub);margin-top:18px;line-height:1.6}
.dp .dp-chips{display:flex;gap:8px;margin-top:22px;flex-wrap:wrap}
.dp .dp-chip{font-size:14px;font-weight:600;border-radius:999px;padding:6px 14px;background:var(--bg);color:#3c4a5e}
.dp .dp-note{font-size:14px;color:#8a96a8;margin-top:20px;line-height:1.6}
.dp table.dp-info{width:100%;border-collapse:collapse;margin-top:40px;font-size:18px}
.dp table.dp-info th{width:180px;text-align:left;color:var(--sub);font-weight:600;padding:20px 0;border-bottom:1px solid var(--line);vertical-align:top}
.dp table.dp-info td{padding:20px 0;border-bottom:1px solid var(--line);line-height:1.6}
.dp table.dp-info tr:first-child th,.dp table.dp-info tr:first-child td{border-top:2px solid var(--ink)}
.dp .dp-nutri{display:flex;gap:12px;margin-top:28px}
.dp .dp-nutri div{flex:1;background:var(--bg);border-radius:18px;padding:22px 0;text-align:center}
.dp .dp-nutri b{display:block;font-size:30px;font-weight:800;letter-spacing:-.02em}
.dp .dp-nutri span{font-size:15px;color:var(--sub)}
.dp .dp-s5{background:linear-gradient(180deg,#f4f8fc,#e7f1ff)}
.dp .dp-how{display:flex;gap:16px;margin-top:44px}
.dp .dp-card{flex:1;background:#fff;border-radius:24px;padding:36px 24px;text-align:center}
.dp .dp-ico{width:72px;height:72px;margin:0 auto 18px;border-radius:50%;background:var(--sky);display:flex;align-items:center;justify-content:center}
.dp .dp-card h3{font-size:22px;font-weight:800}
.dp .dp-card p{font-size:16px;color:var(--sub);margin-top:10px;line-height:1.55}
.dp .dp-s6{background:#1b2433;color:#d5dce7;padding:80px 64px}
.dp .dp-s6 .dp-label{color:#7fb2ff}
.dp .dp-s6 h2{color:#fff;font-size:34px}
.dp .dp-s6 ul{list-style:none;margin-top:34px;border-top:1px solid #344055}
.dp .dp-s6 li{display:flex;gap:24px;padding:20px 0;border-bottom:1px solid #344055;font-size:17px;line-height:1.6}
.dp .dp-s6 li b{flex:0 0 170px;color:#fff;font-weight:700}
.dp .dp-foot{background:#121926;color:#7d8aa0;text-align:center;font-size:14px;padding:22px 0}
.dp .dp-nophoto{display:flex;align-items:center;justify-content:center;height:100%;color:#8a96a8;font-size:18px}
`
