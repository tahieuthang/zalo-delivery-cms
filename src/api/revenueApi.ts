import http from './http'
import type { RevenueSummary, DailyRevenue, ShipperEarnings } from '@/types'

export const revenueApi = {
  getSummary() {
    return http.get<RevenueSummary>('/api/revenue/summary')
  },

  getDaily(params?: { from?: string; to?: string }) {
    return http.get<DailyRevenue[]>('/api/revenue/daily', { params })
  },

  getShipperEarnings(shipperId: string) {
    return http.get<ShipperEarnings>(`/api/revenue/shipper/${shipperId}`)
  },

  getLag() {
    return http.get('/api/revenue/lag')
  },
}
