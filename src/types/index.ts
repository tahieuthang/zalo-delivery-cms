// ─── Order Types ───────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING'
  | 'WAITING_ACCEPTANCE'
  | 'ASSIGNED'
  | 'DELIVERING'
  | 'SUCCESS'
  | 'FAILED'
  | 'NO_SHIPPER'

export interface Order {
  id: string
  customerId: string
  pickupAddress: string
  pickupLat: number | null
  pickupLng: number | null
  deliveryAddress: string
  deliveryLat: number | null
  deliveryLng: number | null
  status: OrderStatus
  shipperId: string | null
  note: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  shipper?: Shipper | null
  revenues?: RevenueRecord[]
  offerLogs?: OrderOfferLog[]
  trajectory?: TrajectoryPoint[]
  _count?: { trajectory: number }
}

export interface TrajectoryPoint {
  id: string
  orderId: string
  shipperId: string
  lat: number
  lng: number
  createdAt: string
}

export interface OrderOfferLog {
  id: string
  orderId: string
  shipperId: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'TIMEOUT'
  createdAt: string
  updatedAt: string
  shipper?: Shipper
}

export interface OrderTracking {
  orderId: string
  status: OrderStatus
  shipperName: string
  shipperLat: number
  shipperLng: number
  deliveryLat: number
  deliveryLng: number
}

export interface CreateOrderPayload {
  customerId: string
  pickupAddress: string
  deliveryAddress: string
  note?: string
}

// ─── Mock Order Item (API chưa có) ────────────────────────────────────────────

export interface OrderItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  total: number
  note?: string
}

// ─── Shipper Types ─────────────────────────────────────────────────────────────

export type ShipperStatus = 'ONLINE' | 'OFFLINE' | 'BUSY'
export type VehicleType = 'BIKE' | 'MOTORCYCLE' | 'TRUCK'

export interface Shipper {
  id: string
  name: string
  phone: string
  zaloUserId: string | null
  vehicleType: VehicleType
  status: ShipperStatus
  totalEarnings: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface ShipperLocation {
  shipperId: string
  lat: number
  lng: number
}

export interface CreateShipperPayload {
  name: string
  phone: string
  vehicleType: VehicleType
}

export interface UpdateShipperPayload {
  name?: string
  phone?: string
  vehicleType?: string
  zaloUserId?: string
}

// ─── Revenue Types ─────────────────────────────────────────────────────────────

export interface RevenueRecord {
  id: string
  orderId: string
  shipperId: string
  amount: number
  type: string
  completedAt: string
  createdAt: string
}

export interface RevenueSummary {
  totalRevenue: number
  totalOrders: number
}

export interface DailyRevenue {
  date: string
  totalRevenue: number
  orderCount: number
}

export interface ShipperEarnings {
  shipperId: string
  totalEarnings: number
  records: RevenueRecord[]
}

// ─── Dashboard Types ───────────────────────────────────────────────────────────

export interface DashboardSummary {
  orders: {
    PENDING: number
    WAITING_ACCEPTANCE: number
    ASSIGNED: number
    DELIVERING: number
    SUCCESS: number
    FAILED: number
    NO_SHIPPER: number
    total: number
  }
  shippers: {
    ONLINE: number
    OFFLINE: number
    BUSY: number
    total: number
  }
  revenue: {
    total: number
  }
}

// ─── Dispatcher Types ──────────────────────────────────────────────────────────

export interface DispatcherStatus {
  active: boolean
  consumerGroup: string
}

export interface DispatcherLag {
  topic: string
  partitions: Array<{
    partition: number
    currentOffset: string
    logEndOffset: string
    lag: string
  }>
}

// ─── Common Types ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

// ─── Notification ──────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string
  type: 'new_order' | 'no_shipper' | 'completed' | 'failed' | 'info'
  title: string
  message: string
  orderId?: string
  read: boolean
  createdAt: string
}
