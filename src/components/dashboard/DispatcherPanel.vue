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

      <!-- Manual Dispatch and Shipper Simulator Form -->
      <div class="operations-forms">
        <el-tabs v-model="activeOpTab" class="ops-tabs" size="small">
          <!-- Tab 1: Dispatch Trigger -->
          <el-tab-pane label="⚡ Kích hoạt Điều phối" name="trigger">
            <div class="ops-form">
              <div class="form-desc">
                Mô phỏng sự kiện `order.created` trên Kafka để bắt đầu quy trình tìm tài xế.
              </div>
              <el-form :model="triggerForm" size="small" label-position="top">
                <el-form-item label="Đơn hàng">
                  <el-select
                    v-model="triggerForm.orderId"
                    placeholder="Chọn đơn hàng hoạt động"
                    style="width: 100%"
                    filterable
                    @change="handleOrderSelect"
                  >
                    <el-option
                      v-for="order in activeOrders"
                      :key="order.id"
                      :label="`${order.id.slice(0, 10)}... (${getStatusLabel(order.status)})`"
                      :value="order.id"
                    />
                  </el-select>
                </el-form-item>

                <div class="coords-row">
                  <el-form-item label="Vĩ độ lấy (Lat)">
                    <el-input-number
                      v-model="triggerForm.pickupLat"
                      :precision="6"
                      :step="0.001"
                      controls-position="right"
                      style="width: 100%"
                    />
                  </el-form-item>
                  <el-form-item label="Kinh độ lấy (Lng)">
                    <el-input-number
                      v-model="triggerForm.pickupLng"
                      :precision="6"
                      :step="0.001"
                      controls-position="right"
                      style="width: 100%"
                    />
                  </el-form-item>
                </div>

                <el-button
                  type="primary"
                  size="small"
                  style="width: 100%; margin-top: 4px;"
                  :loading="submittingTrigger"
                  @click="handleTriggerDispatch"
                >
                  Gửi sự kiện Dispatch
                </el-button>
              </el-form>
            </div>
          </el-tab-pane>

          <!-- Tab 2: Shipper Response -->
          <el-tab-pane label="🛵 Phản hồi Shipper" name="respond">
            <div class="ops-form">
              <div class="form-desc">
                Mô phỏng tài xế phản hồi Chấp nhận/Từ chối Offer điều phối gửi qua Zalo.
              </div>
              <el-form :model="respondForm" size="small" label-position="top">
                <el-form-item label="Đơn hàng">
                  <el-select
                    v-model="respondForm.orderId"
                    placeholder="Chọn đơn hàng"
                    style="width: 100%"
                    filterable
                  >
                    <el-option
                      v-for="order in activeOrders"
                      :key="order.id"
                      :label="`${order.id.slice(0, 10)}...`"
                      :value="order.id"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="Shipper">
                  <el-select
                    v-model="respondForm.shipperId"
                    placeholder="Chọn shipper nhận offer"
                    style="width: 100%"
                    filterable
                  >
                    <el-option
                      v-for="shipper in activeShippers"
                      :key="shipper.id"
                      :label="parseShipperName(shipper.name).name"
                      :value="shipper.id"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="Phản hồi">
                  <el-radio-group v-model="respondForm.action" style="width: 100%">
                    <el-radio-button value="accept" label="accept">Chấp nhận ✅</el-radio-button>
                    <el-radio-button value="reject" label="reject">Từ chối ❌</el-radio-button>
                  </el-radio-group>
                </el-form-item>

                <el-button
                  type="success"
                  size="small"
                  style="width: 100%; margin-top: 4px;"
                  :loading="submittingRespond"
                  @click="handleShipperRespond"
                >
                  Gửi phản hồi giả lập
                </el-button>
              </el-form>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { dispatcherApi } from '@/api/dispatcherApi'
import { shipperApi } from '@/api/shipperApi'
import { getStatusLabel, parseShipperName } from '@/utils/helpers'
import type { DispatcherStatus, DispatcherLag, Order, Shipper } from '@/types'

const props = defineProps<{
  orders: Order[]
}>()

const status = ref<DispatcherStatus | null>(null)
const lag = ref<DispatcherLag | null>(null)
const loading = ref(false)

const activeOpTab = ref('trigger')
const activeShippers = ref<Shipper[]>([])
const submittingTrigger = ref(false)
const submittingRespond = ref(false)

const triggerForm = reactive({
  orderId: '',
  pickupLat: 20.953503,
  pickupLng: 105.837839,
})

const respondForm = reactive({
  orderId: '',
  shipperId: '',
  action: 'accept' as 'accept' | 'reject',
})

const activeOrders = computed(() => {
  return props.orders.filter(o => ['PENDING', 'WAITING_ACCEPTANCE', 'ASSIGNED', 'NO_SHIPPER'].includes(o.status))
})

const lagPartitions = computed(() => {
  return lag.value?.partitions || []
})

function getLagClass(lagVal: string | number) {
  const num = typeof lagVal === 'string' ? parseInt(lagVal, 10) : lagVal
  if (isNaN(num) || num === 0) return 'lag-zero'
  if (num < 5) return 'lag-low'
  return 'lag-high'
}

function handleOrderSelect(orderId: string) {
  const found = props.orders.find(o => o.id === orderId)
  if (found && found.pickupLat && found.pickupLng) {
    triggerForm.pickupLat = found.pickupLat
    triggerForm.pickupLng = found.pickupLng
  }
}

async function fetchDispatcherData() {
  loading.value = true
  try {
    const [statusRes, lagRes, shippersRes] = await Promise.allSettled([
      dispatcherApi.getStatus(),
      dispatcherApi.getLag(),
      shipperApi.getShippers(),
    ])
    if (statusRes.status === 'fulfilled') status.value = statusRes.value.data as any
    if (lagRes.status === 'fulfilled') lag.value = lagRes.value.data as any
    if (shippersRes.status === 'fulfilled') {
      const data = shippersRes.value.data as any
      activeShippers.value = data?.data || data || []
    }
  } catch (e) {
    console.error('Fetch dispatcher statistics failed', e)
  } finally {
    loading.value = false
  }
}

async function handleTriggerDispatch() {
  if (!triggerForm.orderId) {
    ElMessage.warning('Vui lòng chọn đơn hàng')
    return
  }
  submittingTrigger.value = true
  try {
    await dispatcherApi.trigger({
      orderId: triggerForm.orderId,
      pickupLat: triggerForm.pickupLat,
      pickupLng: triggerForm.pickupLng,
    })
    ElMessage.success('Kích hoạt điều phối Kafka thành công')
    // Reset form
    triggerForm.orderId = ''
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Lỗi khi kích hoạt điều phối')
  } finally {
    submittingTrigger.value = false
  }
}

async function handleShipperRespond() {
  if (!respondForm.orderId || !respondForm.shipperId) {
    ElMessage.warning('Vui lòng chọn đơn hàng và shipper')
    return
  }
  submittingRespond.value = true
  try {
    await dispatcherApi.respond({
      orderId: respondForm.orderId,
      shipperId: respondForm.shipperId,
      action: respondForm.action,
    })
    ElMessage.success(`Gửi phản hồi giả lập (${respondForm.action}) thành công`)
    // Reset form
    respondForm.orderId = ''
    respondForm.shipperId = ''
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Lỗi khi gửi phản hồi')
  } finally {
    submittingRespond.value = false
  }
}

onMounted(() => {
  fetchDispatcherData()
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
  background: rgba(30, 41, 59, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(51, 65, 85, 0.4);
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

.ops-tabs :deep(.el-tabs__item) {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.ops-tabs :deep(.el-tabs__item.is-active) {
  color: var(--color-primary-light);
}

.ops-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.form-desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
  margin-bottom: 6px;
}

.coords-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

:deep(.el-form-item) {
  margin-bottom: 8px;
}

:deep(.el-form-item__label) {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted) !important;
  margin-bottom: 2px !important;
  line-height: 1.2 !important;
}

.mono {
  font-family: 'SF Mono', 'Fira Code', monospace;
}
</style>
