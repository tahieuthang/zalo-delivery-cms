import { defineStore } from 'pinia'
import { ref, onBeforeUnmount } from 'vue'
import { orderApi } from '@/api/orderApi'
import type { AppNotification, Order, OrderStatus } from '@/types'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<AppNotification[]>([])
  const unreadCount = ref(0)
  const notificationSound = ref<HTMLAudioElement | null>(null)
  
  // Track order statuses to detect changes
  const orderStatuses = ref<Record<string, OrderStatus>>({})
  const isInitialized = ref(false)
  let pollingInterval: ReturnType<typeof setInterval> | null = null

  function init() {
    if (isInitialized.value) return

    // Pre-load notification sound (a simple beep)
    notificationSound.value = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVggoqFa1dSepm0s5VkOjRYf42Ng2pWU3mauLSVY0A2WIKLiYVwX16Am7e2mGxIPF2Cj4uBbF1ei5y1s5psSEBfhI6JfWtbXIucsLShcVFEYYeNiX1rW1yNnq+xo3FRRWKH')

    // Initial load of orders to seed the statuses
    orderApi.getOrders({ limit: 40 }).then((res) => {
      const data = res.data as any
      const orderList: Order[] = data?.data || data || []
      orderList.forEach((o) => {
        orderStatuses.value[o.id] = o.status
      })
      isInitialized.value = true
    }).catch((err) => {
      console.warn('Initial orders load failed in notificationStore:', err)
      isInitialized.value = true // set true to start polling anyway
    })

    // Start background polling every 5 seconds
    if (!pollingInterval) {
      pollingInterval = setInterval(pollNewOrdersAndUpdates, 5000)
    }
  }

  async function pollNewOrdersAndUpdates() {
    try {
      const res = await orderApi.getOrders({ limit: 30 })
      const data = res.data as any
      const orderList: Order[] = data?.data || data || []

      // If we fail to load or get empty lists, skip
      if (!orderList.length) return

      orderList.forEach((order) => {
        const oldStatus = orderStatuses.value[order.id]

        if (!oldStatus) {
          // Completely new order created
          orderStatuses.value[order.id] = order.status
          
          addNotification({
            type: 'new_order',
            title: `📦 Đơn hàng mới #${order.id.slice(0, 8)}`,
            message: `Đơn hàng mới từ khách hàng ${order.customerId} đã được tạo.`,
            orderId: order.id,
          })
        } else if (oldStatus !== order.status) {
          // Status changed!
          orderStatuses.value[order.id] = order.status

          let type: AppNotification['type'] = 'info'
          let title = `Trạng thái đơn hàng #${order.id.slice(0, 8)}`
          let message = `Đơn hàng đã chuyển sang trạng thái ${order.status}.`

          if (order.status === 'NO_SHIPPER') {
            type = 'no_shipper'
            title = `⚠️ Không tìm thấy shipper #${order.id.slice(0, 8)}`
            message = `Hệ thống không thể phân phối tài xế cho đơn hàng.`
          } else if (order.status === 'SUCCESS') {
            type = 'completed'
            title = `✅ Giao hàng thành công #${order.id.slice(0, 8)}`
            message = `Đơn hàng đã được shipper giao thành công.`
          } else if (order.status === 'FAILED') {
            type = 'failed'
            title = `❌ Đơn hàng thất bại #${order.id.slice(0, 8)}`
            message = `Đơn hàng giao thất bại hoặc đã bị hủy.`
          } else if (order.status === 'ASSIGNED') {
            type = 'info'
            title = `🛵 Đã phân công tài xế #${order.id.slice(0, 8)}`
            message = `Tài xế đã nhận đơn hàng và đang chuẩn bị lấy hàng.`
          }

          addNotification({
            type,
            title,
            message,
            orderId: order.id,
          })
        }
      })
    } catch (e) {
      console.warn('Failed to poll updates in notification store:', e)
    }
  }

  function addNotification(notif: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) {
    const newNotif: AppNotification = {
      ...notif,
      id: crypto.randomUUID(),
      read: false,
      createdAt: new Date().toISOString(),
    }
    notifications.value.unshift(newNotif)
    unreadCount.value++

    // Play notification sound
    if (notificationSound.value) {
      notificationSound.value.play().catch(() => {})
    }

    // Keep only last 50
    if (notifications.value.length > 50) {
      notifications.value = notifications.value.slice(0, 50)
    }
  }

  function markAsRead(id: string) {
    const notif = notifications.value.find((n) => n.id === id)
    if (notif && !notif.read) {
      notif.read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }

  function markAllAsRead() {
    notifications.value.forEach((n) => (n.read = true))
    unreadCount.value = 0
  }

  function clearAll() {
    notifications.value = []
    unreadCount.value = 0
  }

  function destroy() {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  }

  return {
    notifications,
    unreadCount,
    init,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    destroy,
  }
})
