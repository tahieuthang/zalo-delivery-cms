import type { OrderStatus } from '@/types'

/** Map order status to display label */
export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    PENDING: 'Chờ xử lý',
    WAITING_ACCEPTANCE: 'Chờ nhận đơn',
    ASSIGNED: 'Đã phân công',
    DELIVERING: 'Đang giao',
    SUCCESS: 'Thành công',
    FAILED: 'Thất bại',
    NO_SHIPPER: 'Không tìm thấy shipper',
  }
  return labels[status] || status
}

/** Map order status to Element Plus tag type */
export function getStatusType(status: OrderStatus): string {
  const types: Record<OrderStatus, string> = {
    PENDING: 'warning',
    WAITING_ACCEPTANCE: '',
    ASSIGNED: 'info',
    DELIVERING: 'primary',
    SUCCESS: 'success',
    FAILED: 'danger',
    NO_SHIPPER: 'info',
  }
  return types[status] || ''
}

/** Map order status to CSS class for custom badges */
export function getStatusClass(status: OrderStatus): string {
  const classes: Record<OrderStatus, string> = {
    PENDING: 'status-pending',
    WAITING_ACCEPTANCE: 'status-waiting',
    ASSIGNED: 'status-assigned',
    DELIVERING: 'status-delivering',
    SUCCESS: 'status-success',
    FAILED: 'status-failed',
    NO_SHIPPER: 'status-no-shipper',
  }
  return classes[status] || ''
}

/** Format currency VND */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

/** Format date relative */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Truncate order ID for display */
export function truncateId(id: string, len = 8): string {
  if (id.length <= len) return id
  return id.substring(0, len) + '...'
}

/** Vehicle type label */
export function getVehicleLabel(type: string): string {
  const labels: Record<string, string> = {
    BIKE: '🚲 Xe đạp',
    MOTORCYCLE: '🏍️ Xe máy',
    TRUCK: '🚛 Xe tải',
  }
  return labels[type] || type
}

/** Parse shipper name to extract name and location from format "Name (Location)" */
export function parseShipperName(fullName: string | undefined): { name: string; location: string } {
  if (!fullName) return { name: '', location: '' }
  const match = fullName.match(/^([^(]+)\s*\(([^)]+)\)$/)
  if (match) {
    return {
      name: match[1].trim(),
      location: match[2].trim(),
    }
  }
  return {
    name: fullName.trim(),
    location: '',
  }
}
