import http from './http'
import type { Shipper, ShipperLocation, CreateShipperPayload, UpdateShipperPayload } from '@/types'

export const shipperApi = {
  getShippers() {
    return http.get<Shipper[]>('/api/shippers')
  },

  getShipperById(id: string) {
    return http.get<Shipper>(`/api/shippers/${id}`)
  },

  createShipper(payload: CreateShipperPayload) {
    return http.post<Shipper>('/api/shippers', payload)
  },

  updateShipper(id: string, payload: UpdateShipperPayload) {
    return http.put<Shipper>(`/api/shippers/${id}`, payload)
  },

  deleteShipper(id: string) {
    return http.delete(`/api/shippers/${id}`)
  },

  toggleStatus(id: string, status: 'ONLINE' | 'OFFLINE', lat?: number, lng?: number) {
    return http.patch(`/api/shippers/${id}/status`, { status, lat, lng })
  },

  getLocation(id: string) {
    return http.get<ShipperLocation>(`/api/shippers/${id}/location`)
  },
}
