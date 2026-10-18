import { request } from '@/api/client'

export const checkAuth = () => request('/auth/check')
