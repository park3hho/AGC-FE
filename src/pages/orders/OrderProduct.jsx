import { fileUrl } from '@/api/client'
import Section from '@/components/common/Section'
import { MARKETS } from '@/constants/orderConst'
import styles from './Orders.module.css'

// 주문 접수 › 상품 상세 — 이 주문이 무슨 상품인지 한눈에 (2026-11-16 사용자: "URL 누르면 해당 상품 상세로 이동해서 뭔지 확인")
//   사진 · 한국어 상품명 · 산 옵션 · 수량 + 링크 (새 탭): 우리 마켓 상품 페이지 · AGC 제품 상세 · 실제로 산 타오바오 상품
export default function OrderProduct({
  order, // 주문 (getOrder 의 order)
  sourcing, // getOrder 의 sourcing — 제품 · 조사 옵션 · 링크 (못 찾으면 null)
}) {
  const s = sourcing
  const market = MARKETS[order.market]?.label || order.market
  const option = s ? [s.option1, s.option2].filter(Boolean).join(' · ') : ''
  const links = s
    ? [
        s.marketUrl && { href: s.marketUrl, label: `${market} 상품 페이지` },
        { href: `/research/products/${s.productId}`, label: `AGC 제품 ${s.productCode}` },
        order.bundleKey?.startsWith('PRE_LP') && {
          href: `/jiyun/bundles?status=${order.stage === 'done' ? 'done' : 'active'}&code=${order.bundleKey}`,
          label: `집운 묶음 ${order.bundleKey}`,
        },
        (s.purchaseUrl || s.taobaoUrl) && {
          href: s.purchaseUrl || s.taobaoUrl,
          label: s.purchaseUrl ? '산 타오바오 상품' : '타오바오 (조사 링크)',
        },
      ].filter(Boolean)
    : []
  return (
    <Section name="상품 상세" id="product" sub={s ? s.productCode : '제품을 못 찾았어요'}>
      <div className={styles.prodRow}>
        {s?.photoUrl ? (
          <a href={`/research/products/${s.productId}`} target="_blank" rel="noreferrer">
            <img className={styles.prodPhoto} src={fileUrl(s.photoUrl)} alt="" />
          </a>
        ) : (
          <span className={styles.prodPhoto} />
        )}
        <div className={styles.prodBody}>
          <b className={styles.prodName}>{s?.productTitle || order.productName}</b>
          <span className={styles.prodSub}>
            {option || order.optionName || '-'} × {order.quantity}
            {s?.bundleQty > 1 && ` · 묶음 ${s.bundleQty} (타오바오 ${s.taobaoQty}개)`}
          </span>
          <span className={styles.prodLinks}>
            {links.map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
                {l.label} ↗
              </a>
            ))}
          </span>
        </div>
      </div>
    </Section>
  )
}
