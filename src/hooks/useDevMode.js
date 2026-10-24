import { useSyncExternalStore } from 'react'

// 개발자 모드 — 이 브라우저에만 저장 (localStorage). 켜면 개발용 메뉴(menuConst 의 dev: true)가 보인다.
// 권한이 아니라 '보이기' 설정이다: 화면 주소로 들어가면 개발자 모드가 꺼져 있어도 열린다.
const KEY = 'agc.devMode'
const listeners = new Set()

const read = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export const setDevMode = (on) => {
  try {
    if (on) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만
  }
  listeners.forEach((l) => l())
}

const subscribe = (listener) => {
  listeners.add(listener)
  const onStorage = (e) => e.key === KEY && listener() // 다른 탭에서 바꿔도 따라감
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export const useDevMode = () => useSyncExternalStore(subscribe, read, () => false)

// 메뉴 항목이 지금 보이는지 — dev 항목은 개발자 모드일 때만
export const devVisible = (m, devMode) => !m.dev || devMode
