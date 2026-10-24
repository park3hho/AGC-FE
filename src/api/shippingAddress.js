import { request } from '@/api/client'

// 출고지·반품지 주소록. 스펙: docs/api-contract.md
const toCode = (c) => ({ market: c.market, use: c.use, code: c.code, name: c.name || '' })

// 배송 경로 — 해외 배대지 → 해운/항공 → 통관 → 국내 택배. courierCodes = 마켓별 택배사 코드 (발송처리용)
const toRoute = (r) =>
  r && {
    forwarder: r.forwarder || '',
    transport: r.transport || 'sea', // 'sea' | 'air'
    transportLabel: r.transport_label || '',
    port: r.port || '',
    courier: r.courier || '', // CJGLS · HANJIN … (couriers[].key)
    courierName: r.courier_name || '',
    courierCodes: r.courier_codes || {}, // { 쿠팡: 'CJGLS', 네이버: 'CJGLS' }
    trackingWhen: r.tracking_when || '',
    customsRef: r.customs_ref || '',
    confirmed: !!r.confirmed,
    note: r.note || '',
  }

const toAddress = (a) => ({
  id: a.id,
  name: a.name,
  country: a.country, // 'KR' | 'CN' …
  overseas: a.overseas,
  zipCode: a.zip_code || '',
  address: a.address,
  addressDetail: a.address_detail || '',
  phone: a.phone || '',
  uses: a.uses || [], // ['outbound', 'return']
  defaults: a.defaults || [],
  marketCodes: (a.market_codes || []).map(toCode),
  route: toRoute(a.route), // null = 아직 없음
  memo: a.memo || '',
})

const orNull = (v) => (v === '' || v == null ? null : v)

const routeBody = (r) =>
  r && {
    forwarder: orNull(r.forwarder),
    transport: r.transport || 'sea',
    port: orNull(r.port),
    courier: orNull(r.courier),
    tracking_when: orNull(r.trackingWhen),
    customs_ref: orNull(r.customsRef),
    confirmed: !!r.confirmed,
    note: orNull(r.note),
  }

const toBody = (f) => ({
  name: f.name,
  country: f.country,
  zip_code: orNull(f.zipCode),
  address: f.address,
  address_detail: orNull(f.addressDetail),
  phone: orNull(f.phone),
  uses: f.uses,
  defaults: f.defaults,
  market_codes: f.marketCodes.map((c) => ({ ...c, name: orNull(c.name) })),
  route: routeBody(f.route),
  memo: orNull(f.memo),
})

export const getShippingAddresses = async () => (await getShippingSetup()).items

// 주소록 + 고를 수 있는 국내 택배사 [{ key, name, codes: { 쿠팡, 네이버 } }] (BE shipping_config.COURIERS)
export const getShippingSetup = async () => {
  const data = await request('/shipping-addresses', { errorMsg: '주소록을 불러오지 못했어요' })
  return { items: data.items.map(toAddress), couriers: data.couriers || [] }
}

export const getShippingAddress = async (id) => {
  const data = await request(`/shipping-addresses/${id}`, { errorMsg: '주소를 불러오지 못했어요' })
  return toAddress(data.address)
}

export const createShippingAddress = async (form) => {
  const data = await request('/shipping-addresses', {
    method: 'POST',
    body: toBody(form),
    errorMsg: '주소를 저장하지 못했어요',
  })
  return toAddress(data.address)
}

export const updateShippingAddress = async (id, form) => {
  const data = await request(`/shipping-addresses/${id}`, {
    method: 'PATCH',
    body: toBody(form),
    errorMsg: '주소를 수정하지 못했어요',
  })
  return toAddress(data.address)
}

export const deleteShippingAddress = (id) =>
  request(`/shipping-addresses/${id}`, { method: 'DELETE', errorMsg: '주소를 삭제하지 못했어요' })
