<template>
  <div class="live-tracking-tab">
    <!-- Left: Map (60%) -->
    <div class="map-panel">
      <div class="map-wrapper" ref="mapContainer">
        <!-- Leaflet Map -->
        <l-map
          v-if="mapReady"
          ref="mapRef"
          :zoom="14"
          :center="mapCenter"
          :use-global-leaflet="false"
          style="height: 100%; width: 100%; border-radius: 8px"
        >
          <l-tile-layer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; CartoDB"
          />

          <!-- Shop Marker -->
          <l-marker v-if="shopLatLng" :lat-lng="shopLatLng">
            <l-icon :icon-size="[36, 36]" :icon-anchor="[18, 36]">
              <template #default>
                <div class="custom-marker shop-marker">🏪</div>
              </template>
            </l-icon>
            <l-popup>
              <div class="popup-content">
                <strong>📍 Nơi lấy hàng</strong>
                <p>{{ order.pickupAddress }}</p>
              </div>
            </l-popup>
          </l-marker>

          <!-- Customer Marker -->
          <l-marker v-if="customerLatLng" :lat-lng="customerLatLng">
            <l-icon :icon-size="[36, 36]" :icon-anchor="[18, 36]">
              <template #default>
                <div class="custom-marker customer-marker">🏠</div>
              </template>
            </l-icon>
            <l-popup>
              <div class="popup-content">
                <strong>📍 Nơi giao hàng</strong>
                <p>{{ order.deliveryAddress }}</p>
              </div>
            </l-popup>
          </l-marker>

          <!-- Shipper Marker (ASSIGNED/DELIVERING/SUCCESS) -->
          <l-marker v-if="shipperLatLng" :lat-lng="shipperLatLng">
            <l-icon :icon-size="[40, 40]" :icon-anchor="[20, 20]">
              <template #default>
                <div class="custom-marker shipper-marker" :class="{ success: order.status === 'SUCCESS' }">
                  🛵
                </div>
              </template>
            </l-icon>
            <l-popup>
              <div class="popup-content">
                <strong>🛵 Shipper</strong>
                <p>{{ order.shipper?.name || 'N/A' }}</p>
              </div>
            </l-popup>
          </l-marker>

          <!-- Trajectory Polyline -->
          <l-polyline
            v-if="trajectoryPath.length > 1"
            :lat-lngs="trajectoryPath"
            :color="'#3b82f6'"
            :weight="3"
            :opacity="0.7"
            :dash-array="'8, 4'"
          />

          <!-- Radar Pulse for PENDING/NO_SHIPPER -->
          <l-circle
            v-for="(ring, idx) in radarRings"
            :key="'radar-' + idx"
            :lat-lng="shopLatLng!"
            :radius="ring.radius"
            :color="'#3b82f6'"
            :fill-color="'#3b82f6'"
            :fill-opacity="ring.opacity"
            :weight="1"
            :opacity="ring.opacity"
          />
        </l-map>

        <!-- Radar overlay for searching state -->
        <div v-if="isSearching" class="radar-overlay">
          <div class="radar-text">
            <div class="radar-icon">📡</div>
            <span>Đang tìm tài xế gần khu vực...</span>
          </div>
        </div>

        <!-- Map status indicator -->
        <div class="map-status-badge" :class="mapStatusClass">
          <span class="pulse-dot" :class="mapStatusClass" />
          {{ mapStatusText }}
        </div>
      </div>
    </div>

    <!-- Right: Info Panel (40%) -->
    <div class="info-panel">
      <!-- Shipper Card -->
      <div class="info-card">
        <div class="info-card-header">
          <span class="info-card-title">🛵 Tài xế</span>
        </div>
        <div v-if="order.shipper" class="info-card-body">
          <div class="person-info">
            <div class="person-avatar shipper-avatar">
              {{ order.shipper.name.charAt(0) }}
            </div>
            <div class="person-details">
              <div class="person-name">{{ order.shipper.name }}</div>
              <div class="person-phone">{{ order.shipper.phone }}</div>
              <div class="person-meta">{{ getVehicleLabel(order.shipper.vehicleType) }}</div>
            </div>
          </div>
          <div class="action-buttons">
            <el-button type="success" size="small" round>
              <el-icon><Phone /></el-icon> Gọi
            </el-button>
          </div>
        </div>
        <div v-else class="info-card-empty">
          Chưa có tài xế
        </div>
      </div>

      <!-- Customer Card -->
      <div class="info-card">
        <div class="info-card-header">
          <span class="info-card-title">🏠 Khách hàng</span>
        </div>
        <div class="info-card-body">
          <div class="person-info">
            <div class="person-avatar customer-avatar">
              {{ order.customerId.charAt(0).toUpperCase() }}
            </div>
            <div class="person-details">
              <div class="person-name">{{ order.customerId }}</div>
              <div class="person-phone address-text">{{ order.deliveryAddress }}</div>
            </div>
          </div>
          <div class="action-buttons">
            <el-button type="success" size="small" round>
              <el-icon><Phone /></el-icon> Gọi
            </el-button>
          </div>
        </div>
      </div>

      <!-- Order Timeline -->
      <div class="info-card timeline-card">
        <div class="info-card-header">
          <span class="info-card-title">📍 Tiến trình</span>
        </div>
        <div class="info-card-body">
          <el-timeline>
            <el-timeline-item
              v-for="step in orderTimeline"
              :key="step.label"
              :type="step.active ? 'primary' : ''"
              :hollow="!step.done"
              :timestamp="step.time"
              placement="top"
              :color="step.done ? '#10b981' : step.active ? '#3b82f6' : '#475569'"
            >
              {{ step.label }}
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>

      <!-- Emergency Cancel -->
      <div class="emergency-section" v-if="canCancel">
        <el-button type="danger" size="large" style="width: 100%" @click="handleCancel">
          ⚠️ Hủy đơn khẩn cấp
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Phone } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { trackingApi } from '@/api/trackingApi'
import { getVehicleLabel, formatDate } from '@/utils/helpers'
import type { Order, TrajectoryPoint } from '@/types'

// Lazy import leaflet components
import { LMap, LTileLayer, LMarker, LIcon, LPopup, LPolyline, LCircle } from '@vue-leaflet/vue-leaflet'

const props = defineProps<{ order: Order }>()

const mapRef = ref()
const mapReady = ref(false)
const mapContainer = ref<HTMLElement>()

const shipperLat = ref<number | null>(null)
const shipperLng = ref<number | null>(null)
const trajectoryPoints = ref<TrajectoryPoint[]>([])
const radarAngle = ref(0)

let pollingTimer: ReturnType<typeof setInterval> | null = null
let radarTimer: ReturnType<typeof setInterval> | null = null

// Computed positions
const shopLatLng = computed(() => {
  if (props.order.pickupLat && props.order.pickupLng) {
    return [props.order.pickupLat, props.order.pickupLng] as [number, number]
  }
  return null
})

const customerLatLng = computed(() => {
  if (props.order.deliveryLat && props.order.deliveryLng) {
    return [props.order.deliveryLat, props.order.deliveryLng] as [number, number]
  }
  return null
})

const shipperLatLng = computed(() => {
  // For SUCCESS: shipper at customer location
  if (props.order.status === 'SUCCESS' && customerLatLng.value) {
    return customerLatLng.value
  }
  if (shipperLat.value && shipperLng.value) {
    return [shipperLat.value, shipperLng.value] as [number, number]
  }
  return null
})

const mapCenter = computed(() => {
  if (shipperLatLng.value) return shipperLatLng.value
  if (shopLatLng.value) return shopLatLng.value
  if (customerLatLng.value) return customerLatLng.value
  return [20.953503, 105.837839] as [number, number] // Default: Hanoi
})

const trajectoryPath = computed(() =>
  trajectoryPoints.value.map((p) => [p.lat, p.lng] as [number, number])
)

const isSearching = computed(() =>
  ['PENDING', 'WAITING_ACCEPTANCE', 'NO_SHIPPER'].includes(props.order.status)
)

const isLiveTracking = computed(() =>
  ['ASSIGNED', 'DELIVERING'].includes(props.order.status)
)

const canCancel = computed(() =>
  ['PENDING', 'WAITING_ACCEPTANCE', 'ASSIGNED'].includes(props.order.status)
)

// Radar animation rings
const radarRings = computed(() => {
  if (!isSearching.value || !shopLatLng.value) return []
  return [
    { radius: 200 + radarAngle.value * 3, opacity: Math.max(0, 0.3 - radarAngle.value * 0.003) },
    { radius: 400 + radarAngle.value * 2, opacity: Math.max(0, 0.2 - radarAngle.value * 0.002) },
    { radius: 600 + radarAngle.value, opacity: Math.max(0, 0.1 - radarAngle.value * 0.001) },
  ]
})

const mapStatusClass = computed(() => {
  if (isSearching.value) return 'searching'
  if (isLiveTracking.value) return 'live'
  if (props.order.status === 'SUCCESS') return 'completed'
  return 'inactive'
})

const mapStatusText = computed(() => {
  if (isSearching.value) return 'Đang tìm tài xế...'
  if (isLiveTracking.value) return 'Live Tracking'
  if (props.order.status === 'SUCCESS') return 'Đã giao thành công'
  if (props.order.status === 'FAILED') return 'Giao thất bại'
  return ''
})

// Timeline
const orderTimeline = computed(() => {
  const status = props.order.status
  const statusOrder = ['PENDING', 'WAITING_ACCEPTANCE', 'ASSIGNED', 'DELIVERING', 'SUCCESS']
  const currentIdx = statusOrder.indexOf(status)

  return [
    { label: 'Tạo đơn', done: true, active: status === 'PENDING', time: formatDate(props.order.createdAt) },
    { label: 'Chờ tài xế nhận', done: currentIdx >= 1, active: status === 'WAITING_ACCEPTANCE', time: '' },
    { label: 'Đã phân công', done: currentIdx >= 2, active: status === 'ASSIGNED', time: '' },
    { label: 'Đang giao hàng', done: currentIdx >= 3, active: status === 'DELIVERING', time: '' },
    { label: status === 'FAILED' ? 'Thất bại' : 'Hoàn thành', done: currentIdx >= 4 || status === 'FAILED', active: false, time: props.order.completedAt ? formatDate(props.order.completedAt) : '' },
  ]
})

// Fetch live tracking data
async function fetchLiveTracking() {
  if (!isLiveTracking.value) return
  try {
    const res = await trackingApi.getLiveTracking(props.order.id)
    const raw = res.data as any
    const data = raw?.data || raw
    if (data) {
      shipperLat.value = data.shipperLat
      shipperLng.value = data.shipperLng
    }
  } catch {
    // Silent fail for polling
  }
}

// Fetch trajectory
async function fetchTrajectory() {
  try {
    const res = await trackingApi.getTrajectory(props.order.id)
    const raw = res.data as any
    trajectoryPoints.value = raw?.data || raw || []
  } catch {
    // silent
  }
}

async function handleCancel() {
  try {
    await ElMessageBox.confirm(
      'Bạn có chắc chắn muốn hủy đơn hàng này? Hành động không thể hoàn tác.',
      'Hủy đơn khẩn cấp',
      { confirmButtonText: 'Hủy đơn', cancelButtonText: 'Giữ lại', type: 'warning' }
    )
    // API cancel chưa có, chỉ hiển thị thông báo
    ElMessage.warning('Chức năng hủy đơn cần bổ sung API backend (PATCH /api/orders/{id}/cancel)')
  } catch {
    // User cancelled the dialog
  }
}

onMounted(async () => {
  await nextTick()
  mapReady.value = true

  // Fetch trajectory history
  fetchTrajectory()

  // Start live tracking polling for active orders
  if (isLiveTracking.value) {
    fetchLiveTracking()
    pollingTimer = setInterval(fetchLiveTracking, 3000)
  }

  // Radar animation
  if (isSearching.value) {
    radarTimer = setInterval(() => {
      radarAngle.value = (radarAngle.value + 1) % 100
    }, 50)
  }
})

onBeforeUnmount(() => {
  if (pollingTimer) clearInterval(pollingTimer)
  if (radarTimer) clearInterval(radarTimer)
})
</script>

<style scoped>
.live-tracking-tab {
  display: flex;
  gap: 20px;
  height: 100%;
  min-height: 500px;
}

.map-panel {
  flex: 0 0 60%;
  min-height: 0;
}

.map-wrapper {
  height: 100%;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.info-panel {
  flex: 0 0 38%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  padding-right: 4px;
}

/* Custom Markers */
.custom-marker {
  font-size: 24px;
  text-align: center;
  line-height: 36px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
}

.shipper-marker {
  font-size: 28px;
  animation: shipper-bounce 2s ease-in-out infinite;
}

.shipper-marker.success {
  animation: none;
}

@keyframes shipper-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.popup-content {
  font-size: 13px;
  line-height: 1.5;
}

.popup-content strong {
  display: block;
  margin-bottom: 4px;
}

/* Radar Overlay */
.radar-overlay {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}

.radar-text {
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 8px 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  white-space: nowrap;
}

.radar-icon {
  animation: radar-spin 2s linear infinite;
}

@keyframes radar-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Map Status Badge */
.map-status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(8px);
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.map-status-badge.live { color: #34d399; }
.map-status-badge.searching { color: #fbbf24; }
.map-status-badge.completed { color: #60a5fa; }
.map-status-badge.inactive { color: var(--text-muted); }

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.pulse-dot.live { background: #10b981; box-shadow: 0 0 8px #10b981; animation: pulse 1.5s infinite; }
.pulse-dot.searching { background: #f59e0b; animation: pulse 1s infinite; }
.pulse-dot.completed { background: #3b82f6; }
.pulse-dot.inactive { background: #475569; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Info Cards */
.info-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.info-card-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
}

.info-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.info-card-body {
  padding: 16px;
}

.info-card-empty {
  padding: 24px 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.person-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.person-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  color: white;
  flex-shrink: 0;
}

.shipper-avatar { background: linear-gradient(135deg, #3b82f6, #8b5cf6); }
.customer-avatar { background: linear-gradient(135deg, #10b981, #06b6d4); }

.person-details {
  flex: 1;
  min-width: 0;
}

.person-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.person-phone {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.person-meta {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.address-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-buttons {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.timeline-card .el-timeline {
  padding-left: 2px;
}

.emergency-section {
  margin-top: auto;
  padding-top: 8px;
}
</style>
