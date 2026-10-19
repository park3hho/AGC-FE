import { createContext } from 'react'

// 지금 화면 정보 (constants/screenConst.js 의 SCREENS 한 줄) — AppLayout 이 넣고 Section 이 이름표에 쓴다
export const ScreenContext = createContext({ path: '', name: '' })
