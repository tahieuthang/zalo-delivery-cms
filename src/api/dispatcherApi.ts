import http from './http'
import type { DispatcherStatus, DispatcherLag } from '@/types'

export const dispatcherApi = {
  getStatus() {
    return http.get<DispatcherStatus>('/api/dispatcher/status')
  },

  getLag() {
    return http.get<DispatcherLag>('/api/dispatcher/lag')
  },

  trigger(payload: { orderId: string; pickupLat: number; pickupLng: number }) {
    return http.post('/api/dispatcher/trigger', payload)
  },

  respond(payload: { orderId: string; shipperId: string; action: 'accept' | 'reject' }) {
    return http.post('/api/dispatcher/respond', payload)
  },
}
