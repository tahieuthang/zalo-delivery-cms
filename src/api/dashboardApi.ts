import http from './http'
import type { DashboardSummary } from '@/types'

export const dashboardApi = {
  getSummary() {
    return http.get<DashboardSummary>('/api/dashboard/summary')
  },
}
