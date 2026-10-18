// 임시 마진 계산 — 정식 공식(세금·관부가세 등)이 정해지면 교체한다.
export function calcMargin({ costCny, salePrice, cnyToKrw, shippingKrw, feeRate }) {
  const costKrw = costCny * cnyToKrw + shippingKrw
  const fee = salePrice * feeRate
  const margin = salePrice - costKrw - fee
  const marginRate = salePrice > 0 ? margin / salePrice : 0
  return { costKrw, fee, margin, marginRate }
}
