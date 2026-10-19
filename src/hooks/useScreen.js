import { useContext } from 'react'

import { ScreenContext } from '@/contexts/ScreenContext'

// 지금 화면 { path, name, group, parent }
export const useScreen = () => useContext(ScreenContext)
