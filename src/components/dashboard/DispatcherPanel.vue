<template>
  <div class="glass-card dispatcher-panel">
    <div class="panel-header">
      <h3 class="panel-title">⚙️ Điều phối & Trực quan Vận hành</h3>
      <div class="system-status-indicator" :class="{ active: status?.active }">
        <span class="pulse-dot" :class="{ active: status?.active }" />
        <span class="status-text">{{ status?.active ? 'Consumer Active' : 'Consumer Inactive' }}</span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="panel-loading">
      <el-icon class="is-loading" :size="20"><Loading /></el-icon>
      <span>Đang tải thông số Dispatcher...</span>
    </div>

    <div v-else class="panel-content">
      <!-- Info and Lag Section -->
      <div class="info-and-lag">
        <div class="consumer-group-info">
          <span class="label">Consumer Group:</span>
          <span class="value mono">{{ status?.consumerGroup || 'N/A' }}</span>
        </div>

        <div class="partition-lag-section">
          <div class="section-subtitle">Partition Offsets & Lag</div>
          <div v-if="lagPartitions.length" class="lag-list">
            <div v-for="part in lagPartitions" :key="part.partition" class="lag-item">
              <div class="part-name">Partition {{ part.partition }}</div>
              <div class="offsets">
                <span class="offset-val" title="Current Offset">Current: {{ part.currentOffset }}</span>
                <span class="separator">/</span>
                <span class="offset-val" title="Log End Offset">End: {{ part.logEndOffset }}</span>
              </div>
              <div class="lag-badge-wrap">
                <span class="lag-badge" :class="getLagClass(part.lag)">
                  Lag: {{ part.lag }}
                </span>
              </div>
            </div>
          </div>
          <div v-else class="no-lag">
            Không có thông tin lag hoặc kết nối Kafka lỗi.
          </div>
        </div>
      </div>

      <!-- Actions Divider -->
      <div class="panel-divider" />

      <!-- Active Orders Dispatching Monitor -->
      <div class="active-dispatch-monitor">
        <div class="section-header">
          <div class="section-subtitle">📡 Theo dõi & Mock Điều phối Đơn hàng</div>
          <el-button link type="primary" size="small" @click="fetchActiveOrdersList">
            Làm mới
          </el-button>
        </div>

        <el-table :data="localActiveOrders" size="small" style="width: 100%" max-height="300">
          <el-table-column label="Mã đơn" width="100">
            <template #default="{ row }">
              <span class="order-id" :title="row.id">{{ truncateId(row.id, 8) }}</span>
            </template>
          </el-table-column>
          
          <el-table-column prop="status" label="Trạng thái" width="140">
            <template #default="{ row }">
              <span class="status-badge" :class="getStatusClass(row.status)">
                {{ getStatusLabel(row.status) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="Shipper Đề xuất" min-width="150">
            <template #default="{ row }">
              <div v-if="getProposedShipper(row)" class="proposed-shipper-cell">
                <span class="shipper-name">🛵 {{ parseShipperName(getProposedShipper(row)?.name).name }}</span>
                <span class="shipper-phone text-muted">({{ getProposedShipper(row)?.phone }})</span>
              </div>
              <span v-else-if="row.status === 'PENDING' || row.status === 'WAITING_ACCEPTANCE'" class="text-muted text-xs">🔍 Đang quét tài xế...</span>
              <span v-else-if="row.status === 'NO_SHIPPER'" class="text-muted text-xs">❌ Không tìm thấy shipper</span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>

          <el-table-column label="Hành động" width="100" align="center" fixed="right">
            <template #default="{ row }">
              <div v-if="hasPendingOffer(row)" class="action-buttons-wrap">
                <el-button
                  type="success"
                  circle
                  size="small"
                  :icon="Check"
                  title="Chấp nhận"
                  @click="handleOfferAction(row, 'accept')"
                  :loading="actionLoadingId === row.id && activeAction === 'accept'"
                  :disabled="actionLoadingId === row.id && activeAction !== 'accept'"
                />
                <el-button
                  type="danger"
                  circle
                  size="small"
                  :icon="Close"
                  title="Từ chối"
                  @click="handleOfferAction(row, 'reject')"
                  :loading="actionLoadingId === row.id && activeAction === 'reject'"
                  :disabled="actionLoadingId === row.id && activeAction !== 'reject'"
                />
              </div>
              <div v-else-if="row.status === 'NO_SHIPPER'">
                <el-button
                  type="primary"
                  size="small"
                  link
                  @click="handleReTrigger(row)"
                  :loading="actionLoadingId === row.id && activeAction === 'retrigger'"
                >
                  ⚡ Tìm lại
                </el-button>
              </div>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Loading, Check, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { dispatcherApi } from '@/api/dispatcherApi'
import { orderApi } from '@/api/orderApi'
import { getStatusLabel, getStatusClass, parseShipperName, truncateId } from '@/utils/helpers'
import type { DispatcherStatus, DispatcherLag, Order } from '@/types'

const status = ref<DispatcherStatus | null>(null)
const lag = ref<DispatcherLag | null>(null)
const loading = ref(false)
const actionLoadingId = ref<string | null>(null)
const activeAction = ref<'accept' | 'reject' | 'retrigger' | null>(null)

const localActiveOrders = ref<Order[]>([])
const pollers: Record<string, ReturnType<typeof setInterval>> = {}

const lagPartitions = computed(() => {
  return lag.value?.partitions || []
})

function getLagClass(lagVal: string | number) {
  const num = typeof lagVal === 'string' ? parseInt(lagVal, 10) : lagVal
  if (isNaN(num) || num === 0) return 'lag-zero'
  if (num < 5) return 'lag-low'
  return 'lag-high'
}

async function fetchDispatcherData() {
  loading.value = true
  try {
    const [statusRes, lagRes] = await Promise.allSettled([
      dispatcherApi.getStatus(),
      dispatcherApi.getLag(),
    ])
    if (statusRes.status === 'fulfilled') {
      const d = statusRes.value.data as any
      status.value = d?.data || d
    }
    if (lagRes.status === 'fulfilled') {
      const d = lagRes.value.data as any
      lag.value = d?.data || d
    }
  } catch (e) {
    console.error('Fetch dispatcher statistics failed', e)
  } finally {
    loading.value = false
  }
}

async function fetchActiveOrdersList() {
  try {
    const res = await orderApi.getOrders({ status: 'PENDING,WAITING_ACCEPTANCE,NO_SHIPPER', limit: 50 })
    const data = res.data as any
    const fetchedList: Order[] = data?.data || data || []

    fetchedList.forEach((order) => {
      const existingIdx = localActiveOrders.value.findIndex(o => o.id === order.id)
      if (existingIdx === -1) {
        localActiveOrders.value.push(order)
        startPollingOrder(order.id)
      } else {
        const existing = localActiveOrders.value[existingIdx]
        if (existing.status !== order.status) {
          existing.status = order.status
          if (isTerminalStatus(order.status)) {
            stopPollingOrder(order.id)
          } else {
            startPollingOrder(order.id)
          }
        }
      }
    })

    localActiveOrders.value = localActiveOrders.value.filter(o => {
      const stillActive = fetchedList.some(f => f.id === o.id)
      if (!stillActive && isTerminalStatus(o.status)) {
        stopPollingOrder(o.id)
        return false
      }
      return true
    })
  } catch (err) {
    console.error('Error fetching active orders list:', err)
  }
}

function isTerminalStatus(status: string): boolean {
  return !['PENDING', 'WAITING_ACCEPTANCE'].includes(status)
}

function startPollingOrder(orderId: string) {
  if (pollers[orderId]) return
  pollOrderDetails(orderId)
  pollers[orderId] = setInterval(() => {
    pollOrderDetails(orderId)
  }, 2000)
}

function stopPollingOrder(orderId: string) {
  if (pollers[orderId]) {
    clearInterval(pollers[orderId])
    delete pollers[orderId]
  }
}

async function pollOrderDetails(orderId: string) {
  try {
    const res = await orderApi.getOrderById(orderId)
    const raw = res.data as any
    const detailedOrder = raw?.data || raw
    const idx = localActiveOrders.value.findIndex(o => o.id === orderId)
    if (idx !== -1) {
      localActiveOrders.value[idx] = {
        ...localActiveOrders.value[idx],
        ...detailedOrder,
      }
      if (isTerminalStatus(detailedOrder.status)) {
        stopPollingOrder(orderId)
      }
    }
  } catch (err) {
    console.error(`Error polling details for order ${orderId}:`, err)
  }
}

function getProposedShipper(order: Order) {
  if (!order.offerLogs || order.offerLogs.length === 0) return null
  const sortedLogs = [...order.offerLogs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const latestLog = sortedLogs[0]
  if (latestLog && latestLog.status === 'PENDING') {
    return latestLog.shipper || { id: latestLog.shipperId, name: 'Tài xế giả lập', phone: '—' }
  }
  return null
}

function hasPendingOffer(order: Order): boolean {
  return getProposedShipper(order) !== null
}

async function handleOfferAction(order: Order, action: 'accept' | 'reject') {
  const proposed = getProposedShipper(order)
  if (!proposed) return

  actionLoadingId.value = order.id
  activeAction.value = action
  try {
    await dispatcherApi.respond({
      orderId: order.id,
      shipperId: proposed.id,
      action: action,
    })
    ElMessage.success(`Đã gửi phản hồi giả lập: ${action === 'accept' ? 'Chấp nhận' : 'Từ chối'}`)
    await pollOrderDetails(order.id)
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Lỗi khi gửi phản hồi')
  } finally {
    actionLoadingId.value = null
    activeAction.value = null
  }
}

async function handleReTrigger(order: Order) {
  actionLoadingId.value = order.id
  activeAction.value = 'retrigger'
  try {
    await dispatcherApi.trigger({
      orderId: order.id,
      pickupLat: order.pickupLat || 20.953503,
      pickupLng: order.pickupLng || 105.837839,
    })
    ElMessage.success('Đã kích hoạt lại quy trình điều phối')
    startPollingOrder(order.id)
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Lỗi khi kích hoạt lại điều phối')
  } finally {
    actionLoadingId.value = null
    activeAction.value = null
  }
}

let listInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await fetchDispatcherData()
  await fetchActiveOrdersList()
  listInterval = setInterval(fetchActiveOrdersList, 10000)
})

onBeforeUnmount(() => {
  if (listInterval) clearInterval(listInterval)
  Object.keys(pollers).forEach(orderId => {
    clearInterval(pollers[orderId])
  })
})
</script>

<style scoped>
.dispatcher-panel {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--bg-card);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.system-status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  background: rgba(100, 116, 139, 0.1);
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.system-status-indicator.active {
  color: #34d399;
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.2);
}

.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #64748b;
  display: inline-block;
}

.pulse-dot.active {
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
  animation: pulse-dot-anim 1.5s infinite;
}

@keyframes pulse-dot-anim {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.panel-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 30px;
  color: var(--text-muted);
  font-size: 13px;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-and-lag {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.consumer-group-info {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.consumer-group-info .label {
  color: var(--text-muted);
}

.consumer-group-info .value {
  color: var(--text-secondary);
}

.partition-lag-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-subtitle {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.lag-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lag-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-input);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.part-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.offsets {
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  gap: 4px;
}

.lag-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.lag-zero { background: rgba(16, 185, 129, 0.15); color: #34d399; }
.lag-low { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
.lag-high { background: rgba(239, 68, 68, 0.15); color: #f87171; }

.no-lag {
  font-size: 12px;
  color: var(--text-muted);
  padding: 8px;
  text-align: center;
}

.panel-divider {
  height: 1px;
  background: var(--border-color);
}

.active-dispatch-monitor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.proposed-shipper-cell {
  display: flex;
  flex-direction: column;
  font-size: 11px;
}

.proposed-shipper-cell .shipper-name {
  font-weight: 600;
  color: var(--text-secondary);
}

.proposed-shipper-cell .shipper-phone {
  font-size: 10px;
}

.action-buttons-wrap {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.text-xs {
  font-size: 11px;
}

.mono {
  font-family: 'SF Mono', 'Fira Code', monospace;
}
</style>
