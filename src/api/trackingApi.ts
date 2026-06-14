import http from './http'
import type { OrderTracking, TrajectoryPoint } from '@/types'

export const trackingApi = {
  /** Vị trí realtime shipper đang giao đơn */
  getLiveTracking(orderId: string) {
    return http.get<OrderTracking>(`/api/orders/${orderId}/tracking`)
  },

  /** Lịch sử GPS trajectory */
  getTrajectory(orderId: string) {
    return http.get<TrajectoryPoint[]>(`/api/orders/${orderId}/trajectory`)
  },
}
