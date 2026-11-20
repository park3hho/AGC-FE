import { request } from '@/api/client'

// 알리페이(즈푸바오) 잔액 장부 — 충전 환율 선입선출 (2026-11-20). 스펙: docs/api-contract.md '알리페이 잔액 장부'
// 금액은 소수 오차를 막으려고 문자열 그대로 둔다 ("639.72")
export const getAlipayLedger = ({ fresh = false } = {}) =>
  request('/alipay-balance', { fresh, errorMsg: '알리페이 잔액 장부를 불러오지 못했어요' })

export const addAlipayTopup = (body) =>
  request('/alipay-balance/topups', {
    method: 'POST',
    body,
    errorMsg: '충전 기록을 저장하지 못했어요',
  })

export const patchAlipayTopup = (id, body) =>
  request(`/alipay-balance/topups/${id}`, {
    method: 'PATCH',
    body,
    errorMsg: '충전 기록을 고치지 못했어요',
  })

export const deleteAlipayTopup = (id) =>
  request(`/alipay-balance/topups/${id}`, {
    method: 'DELETE',
    errorMsg: '충전 기록을 지우지 못했어요',
  })

export const addAlipaySpend = (body) =>
  request('/alipay-balance/spends', {
    method: 'POST',
    body,
    errorMsg: '결제 기록을 저장하지 못했어요',
  })

export const deleteAlipaySpend = (id) =>
  request(`/alipay-balance/spends/${id}`, {
    method: 'DELETE',
    errorMsg: '결제 기록을 지우지 못했어요',
  })
