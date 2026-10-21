import { request } from '@/api/client'

// 출고지·반품지 주소록. 스펙: docs/api-contract.md
const toCode = (c) => ({ market: c.market, use: c.use, code: c.code, name: c.name || '' })

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
  memo: a.memo || '',
})

const orNull = (v) => (v === '' || v == null ? null : v)

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
  memo: orNull(f.memo),
})

export const getShippingAddresses = async () => {
  const data = await request('/shipping-addresses', { errorMsg: '주소록을 불러오지 못했어요' })
  return data.items.map(toAddress)
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
