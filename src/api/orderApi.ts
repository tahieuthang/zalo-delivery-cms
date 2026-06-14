import http from './http'
import type { Order, CreateOrderPayload, PaginatedResponse } from '@/types'

export interface OrderListParams {
  status?: string
  shipperId?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export const orderApi = {
  /** Danh sách đơn hàng (có filter + pagination) */
  getOrders(params?: OrderListParams) {
    return http.get<PaginatedResponse<Order>>('/api/orders', { params })
  },

  /** Chi tiết đơn hàng */
  getOrderById(id: string) {
    return http.get<Order>(`/api/orders/${id}`)
  },

  /** Tạo đơn hàng mới */
  createOrder(payload: CreateOrderPayload) {
    return http.post<Order>('/api/orders', payload)
  },
}
