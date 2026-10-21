import { LISTING_MARKETS, useLabel } from '@/constants/shippingConst'

// 구매대행 점검 — 기본 출고지·반품지와 마켓 코드가 갖춰졌는지
//   반환: [{ key, tone: 'success' | 'warning' | 'danger', text }]
export const addressChecks = (list) => {
  const out = []
  const def = (use) => list.find((a) => a.defaults.includes(use))
  const outbound = def('outbound')
  const ret = def('return')

  if (!outbound) out.push({ key: 'ob', tone: 'danger', text: '기본 출고지가 없어요' })
  else if (!outbound.overseas)
    out.push({
      key: 'ob',
      tone: 'danger',
      text: `기본 출고지(${outbound.name})가 국내 주소예요 — 구매대행은 해외 출고지가 필요해요`,
    })
  else out.push({ key: 'ob', tone: 'success', text: `기본 출고지: ${outbound.name} (해외)` })

  if (!ret) out.push({ key: 'rt', tone: 'danger', text: '기본 반품지가 없어요' })
  else
    out.push({
      key: 'rt',
      tone: 'success',
      text: `기본 반품지: ${ret.name} (${ret.overseas ? '해외' : '국내'})`,
    })

  for (const m of LISTING_MARKETS) {
    for (const [use, a] of [
      ['outbound', outbound],
      ['return', ret],
    ]) {
      if (!a) continue
      const has = a.marketCodes.some((c) => c.market === m && c.use === use)
      out.push({
        key: `${m}-${use}`,
        tone: has ? 'success' : 'warning',
        text: has
          ? `${m} ${useLabel(use)} 번호 있음`
          : `${m} 주소록에 기본 ${useLabel(use)}(${a.name})가 없어요 — 마켓에 추가하고 번호를 넣어주세요`,
      })
    }
  }
  return out
}
