import { useSyncExternalStore } from 'react'

// 화면 테마 — 이 브라우저에만 저장 (localStorage 'agc.theme'). <html data-theme> 로 variables.css 토큰을 바꾼다.
// 첫 화면 깜빡임을 막으려고 index.html 이 그리기 전에 같은 값을 먼저 붙인다. DESIGN.md §4.8
export const THEMES = [
  { key: 'light', label: '기본', hint: '밝은 화면' },
  { key: 'netrunner', label: '넷러너', hint: '사이버펑크 · 어두운 화면' },
]
const KEY = 'agc.theme'
const DEFAULT = 'light'
const listeners = new Set()

const read = () => {
  try {
    const v = localStorage.getItem(KEY)
    return THEMES.some((t) => t.key === v) ? v : DEFAULT
  } catch {
    return DEFAULT
  }
}

const apply = (theme) => {
  if (theme === DEFAULT) document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

export const setTheme = (theme) => {
  try {
    if (theme === DEFAULT) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만
  }
  apply(theme)
  listeners.forEach((l) => l())
}

const subscribe = (listener) => {
  listeners.add(listener)
  const onStorage = (e) => {
    if (e.key !== KEY) return
    apply(read()) // 다른 탭에서 바꿔도 따라감
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export const useTheme = () => useSyncExternalStore(subscribe, read, () => DEFAULT)
