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
          :center="initialCenter"
          :use-global-leaflet="false"
          @dragstart="lockCamera = false"
          @zoomstart="lockCamera = false"
          style="height: 100%; width: 100%; border-radius: 8px"
        >
          <l-tile-layer
            :url="mapTileUrl"
            attribution="&copy; CartoDB"
          />

          <!-- Shop Marker -->
          <l-marker v-if="shopLatLng" :lat-lng="shopLatLng">
            <l-icon :icon-size="[36, 42]" :icon-anchor="[18, 41]">
              <template #default>
                <div class="marker-container shop-marker">
                  <div class="teardrop-pin" style="--pin-bg: #f59e0b;">
                    <span class="pin-icon">🍽️</span>
                  </div>
                </div>
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
            <l-icon :icon-size="[36, 42]" :icon-anchor="[18, 41]">
              <template #default>
                <div class="marker-container customer-marker">
                  <div class="teardrop-pin" style="--pin-bg: #ef4444;">
                    <span class="pin-icon">👤</span>
                  </div>
                </div>
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
          <l-marker v-if="shipperLatLng && order.status !== 'SUCCESS'" :lat-lng="shipperLatLng">
            <l-icon :icon-size="[36, 42]" :icon-anchor="[18, 41]">
              <template #default>
                <div class="marker-container shipper-marker-wrap">
                  <div class="teardrop-pin" style="--pin-bg: #3b82f6;">
                    <span class="pin-icon">🛵</span>
                  </div>
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

          <!-- Trajectory Polyline (Actual Shipper Trail - Solid Thick Blue Line) -->
          <l-polyline
            v-if="filteredTrajectoryPath.length > 1"
            :lat-lngs="filteredTrajectoryPath"
            :color="'#3b82f6'"
            :weight="5"
            :opacity="0.9"
          />

          <!-- Planned Route from Shop to Customer (Dashed Blue Line, visible during DELIVERING) -->
          <l-polyline
            v-if="['DELIVERING'].includes(order.status) && plannedRoute.length > 0"
            :lat-lngs="plannedRoute"
            :color="'#3b82f6'"
            :weight="3"
            :opacity="0.6"
            :dash-array="'8, 6'"
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

        <!-- Camera Lock Toggle Button -->
        <div 
          v-if="shipperLatLng" 
          class="camera-lock-btn" 
          :class="{ active: lockCamera }" 
          @click="toggleCameraLock"
          title="Tự động theo dõi Shipper"
        >
          🧭 {{ lockCamera ? 'Đang theo dõi' : 'Bật theo dõi' }}
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
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { Phone } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { trackingApi } from '@/api/trackingApi'
import { orderApi } from '@/api/orderApi'
import { getVehicleLabel, formatDate } from '@/utils/helpers'
import { useThemeStore } from '@/stores/themeStore'
import type { Order, TrajectoryPoint } from '@/types'

// Lazy import leaflet components
import { LMap, LTileLayer, LMarker, LIcon, LPopup, LPolyline, LCircle } from '@vue-leaflet/vue-leaflet'

const themeStore = useThemeStore()

const mapTileUrl = computed(() => {
  return themeStore.theme === 'light'
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
})

const props = defineProps<{ order: Order }>()

const mapRef = ref()
const mapReady = ref(false)
const mapContainer = ref<HTMLElement>()

const localOrder = ref<Order>({ ...props.order })
const order = computed(() => localOrder.value)

const shipperLat = ref<number | null>(null)
const shipperLng = ref<number | null>(null)
const trajectoryPoints = ref<TrajectoryPoint[]>([])
const radarAngle = ref(0)

const animatedLat = ref<number | null>(null)
const animatedLng = ref<number | null>(null)
let animationFrameId: number | null = null

let pollingTimer: ReturnType<typeof setInterval> | null = null
let radarTimer: ReturnType<typeof setInterval> | null = null

// Distance formula helper
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3 // metres
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

// Computed positions
const shopLatLng = computed(() => {
  if (order.value.pickupLat && order.value.pickupLng) {
    return [order.value.pickupLat, order.value.pickupLng] as [number, number]
  }
  return null
})

const customerLatLng = computed(() => {
  if (order.value.deliveryLat && order.value.deliveryLng) {
    return [order.value.deliveryLat, order.value.deliveryLng] as [number, number]
  }
  return null
})

const shipperLatLng = computed(() => {
  // For SUCCESS: shipper at customer location
  if (order.value.status === 'SUCCESS' && customerLatLng.value) {
    return customerLatLng.value
  }
  if (animatedLat.value && animatedLng.value) {
    return [animatedLat.value, animatedLng.value] as [number, number]
  }
  return null
})

const lockCamera = ref(true)

const initialCenter = computed(() => {
  return shopLatLng.value || customerLatLng.value || ([20.950203, 105.830421] as [number, number])
})

// Watch shipper location and pan map if camera is locked
watch(shipperLatLng, (newLatLng) => {
  if (lockCamera.value && newLatLng && mapRef.value?.leafletObject) {
    mapRef.value.leafletObject.panTo(newLatLng)
  }
})

// Function to toggle camera lock
function toggleCameraLock() {
  lockCamera.value = !lockCamera.value
  if (lockCamera.value && shipperLatLng.value && mapRef.value?.leafletObject) {
    mapRef.value.leafletObject.panTo(shipperLatLng.value)
  }
}

// Planned OSRM route from Shop to Customer
const plannedRoute = ref<[number, number][]>([])

async function fetchPlannedRoute() {
  if (!shopLatLng.value || !customerLatLng.value) return
  const [shopLat, shopLng] = shopLatLng.value
  const [custLat, custLng] = customerLatLng.value
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${shopLng},${shopLat};${custLng},${custLat}?geometries=geojson&overview=full`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      const coords = data.routes?.[0]?.geometry?.coordinates
      if (coords && Array.isArray(coords)) {
        plannedRoute.value = coords.map(([lng, lat]) => [lat, lng] as [number, number])
      }
    }
  } catch (err) {
    console.error('Failed to fetch planned route from OSRM:', err)
  }
}

watch([shopLatLng, customerLatLng], () => {
  fetchPlannedRoute()
}, { immediate: true })

// Distance from point p to segment a-b
function getDistanceToSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): number {
  const [py, px] = p
  const [ay, ax] = a
  const [by, bx] = b

  const dx = bx - ax
  const dy = by - ay

  if (dx === 0 && dy === 0) {
    return getDistance(py, px, ay, ax)
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
  t = Math.max(0, Math.min(1, t))

  const projY = ay + t * dy
  const projX = ax + t * dx

  return getDistance(py, px, projY, projX)
}

// Find the active segment index on plannedRoute closest to the animated shipper location
function findActiveSegmentIndex(
  p: [number, number],
  route: [number, number][]
): number {
  if (route.length < 2) return 0

  let minDistance = Infinity
  let activeIndex = 0

  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i]
    const b = route[i + 1]
    const dist = getDistanceToSegment(p, a, b)
    if (dist < minDistance) {
      minDistance = dist
      activeIndex = i
    }
  }

  return activeIndex
}

// Filtered trajectory: Match progress along planned route segments to keep drawing locked to road geometry behind vehicle
const filteredTrajectoryPath = computed(() => {
  if (order.value.status !== 'DELIVERING' && order.value.status !== 'SUCCESS') {
    return []
  }

  // Draw full line when the order is successfully completed
  if (order.value.status === 'SUCCESS') {
    return plannedRoute.value.length > 0
      ? plannedRoute.value
      : trajectoryPoints.value.map((p) => [p.lat, p.lng] as [number, number])
  }

  // Fallback to trajectory points if planned route is not yet fetched
  if (plannedRoute.value.length === 0) {
    if (!shopLatLng.value) return []
    const [shopLat, shopLng] = shopLatLng.value
    const shopIndex = trajectoryPoints.value.findIndex((p) => {
      const dist = getDistance(p.lat, p.lng, shopLat, shopLng)
      return dist < 100
    })
    const points = trajectoryPoints.value
      .slice(shopIndex === -1 ? 0 : shopIndex)
      .map((p) => [p.lat, p.lng] as [number, number])
    const path = [shopLatLng.value, ...points]
    if (animatedLat.value && animatedLng.value) {
      path.push([animatedLat.value, animatedLng.value])
    }
    return path
  }

  if (!animatedLat.value || !animatedLng.value) {
    return []
  }

  const p: [number, number] = [animatedLat.value, animatedLng.value]
  const activeIdx = findActiveSegmentIndex(p, plannedRoute.value)

  // Slice the planned route from the beginning up to the active index
  const path = plannedRoute.value.slice(0, activeIdx + 1)

  // Append the exact current animated location to make it connect to the marker perfectly
  path.push(p)

  return path
})

const isSearching = computed(() =>
  ['PENDING', 'WAITING_ACCEPTANCE', 'NO_SHIPPER'].includes(order.value.status)
)

const isLiveTracking = computed(() =>
  ['ASSIGNED', 'DELIVERING'].includes(order.value.status)
)

const canCancel = computed(() =>
  ['PENDING', 'WAITING_ACCEPTANCE', 'ASSIGNED'].includes(order.value.status)
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
  if (order.value.status === 'SUCCESS') return 'completed'
  return 'inactive'
})

const mapStatusText = computed(() => {
  if (isSearching.value) return 'Đang tìm tài xế...'
  if (isLiveTracking.value) return 'Live Tracking'
  if (order.value.status === 'SUCCESS') return 'Đã giao thành công'
  if (order.value.status === 'FAILED') return 'Giao thất bại'
  return ''
})

// Timeline
const orderTimeline = computed(() => {
  const status = order.value.status
  const statusOrder = ['PENDING', 'WAITING_ACCEPTANCE', 'ASSIGNED', 'DELIVERING', 'SUCCESS']
  const currentIdx = statusOrder.indexOf(status)

  return [
    { label: 'Tạo đơn', done: true, active: status === 'PENDING', time: formatDate(order.value.createdAt) },
    { label: 'Chờ tài xế nhận', done: currentIdx >= 1, active: status === 'WAITING_ACCEPTANCE', time: '' },
    { label: 'Đã phân công', done: currentIdx >= 2, active: status === 'ASSIGNED', time: '' },
    { label: 'Đang giao hàng', done: currentIdx >= 3, active: status === 'DELIVERING', time: '' },
    { label: status === 'FAILED' ? 'Thất bại' : 'Hoàn thành', done: currentIdx >= 4 || status === 'FAILED', active: false, time: order.value.completedAt ? formatDate(order.value.completedAt) : '' },
  ]
})

// Fetch live tracking data
async function fetchLiveTracking() {
  if (!isLiveTracking.value) return
  try {
    const res = await trackingApi.getLiveTracking(order.value.id)
    const raw = res.data as any
    const data = raw?.data || raw
    if (data) {
      shipperLat.value = data.shipperLocation?.lat ?? data.shipperLat ?? null
      shipperLng.value = data.shipperLocation?.lng ?? data.shipperLng ?? null
    }
  } catch {
    // Silent fail for polling
  }
}

// Fetch trajectory
async function fetchTrajectory() {
  try {
    const res = await trackingApi.getTrajectory(order.value.id)
    const raw = res.data as any
    trajectoryPoints.value = raw?.data || raw || []
  } catch {
    // silent
  }
}

// Unified poll function
async function pollData() {
  try {
    // 1. Fetch updated order
    const orderRes = await orderApi.getOrderById(props.order.id)
    const rawOrder = orderRes.data as any
    const updatedOrder = rawOrder?.data || rawOrder
    if (updatedOrder) {
      localOrder.value = updatedOrder
    }

    // 2. Fetch live details if assigned/delivering
    if (isLiveTracking.value) {
      await fetchLiveTracking()
      await fetchTrajectory()
    } else {
      shipperLat.value = null
      shipperLng.value = null
    }

    // If order is completed or failed, stop polling
    if (['SUCCESS', 'FAILED'].includes(localOrder.value.status)) {
      if (pollingTimer) {
        clearInterval(pollingTimer)
        pollingTimer = null
      }
    }
  } catch (err) {
    console.error('Error polling tracking data:', err)
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

// Smooth position interpolation watches
watch([shipperLat, shipperLng], ([newLat, newLng]) => {
  if (newLat === null || newLng === null) {
    animatedLat.value = null
    animatedLng.value = null
    return
  }

  if (animatedLat.value === null || animatedLng.value === null) {
    animatedLat.value = newLat
    animatedLng.value = newLng
    return
  }

  const startTime = performance.now()
  const duration = 1800 // Animate over 1.8 seconds (matching 2s polling interval)
  const startLat = animatedLat.value
  const startLng = animatedLng.value

  function step(now: number) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)

    animatedLat.value = startLat + (newLat! - startLat) * progress
    animatedLng.value = startLng + (newLng! - startLng) * progress

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(step)
    }
  }

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  animationFrameId = requestAnimationFrame(step)
})

// Watchers for reactive timer toggle
watch(isSearching, (searching) => {
  if (searching) {
    if (!radarTimer) {
      radarTimer = setInterval(() => {
        radarAngle.value = (radarAngle.value + 1) % 100
      }, 50)
    }
  } else {
    if (radarTimer) {
      clearInterval(radarTimer)
      radarTimer = null
    }
  }
}, { immediate: true })

onMounted(async () => {
  await nextTick()
  mapReady.value = true

  // Initial fetch
  await pollData()

  // Fetch historical trajectory if the order is already in a finalized state
  if (['SUCCESS', 'FAILED'].includes(order.value.status)) {
    await fetchTrajectory()
  }

  // Start polling if not finalized
  if (!['SUCCESS', 'FAILED'].includes(order.value.status)) {
    pollingTimer = setInterval(pollData, 2000) // Poll every 2 seconds
  }
})

onBeforeUnmount(() => {
  if (pollingTimer) clearInterval(pollingTimer)
  if (radarTimer) clearInterval(radarTimer)
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
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
.marker-container {
  width: 36px;
  height: 42px;
  position: relative;
}

.teardrop-pin {
  width: 32px;
  height: 32px;
  border-radius: 50% 50% 50% 0;
  background: var(--pin-bg, #3b82f6);
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #ffffff;
  box-shadow: -2px 2px 6px rgba(0, 0, 0, 0.3);
  position: absolute;
  top: 2px;
  left: 2px;
}

.pin-icon {
  transform: rotate(45deg);
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shipper-marker-wrap {
  width: 36px;
  height: 42px;
  position: relative;
  animation: shipper-bounce 2s ease-in-out infinite;
}

.shipper-marker-wrap.success {
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

.camera-lock-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  background: var(--bg-paper, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-regular, #475569);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.camera-lock-btn:hover {
  background: var(--bg-hover, #f1f5f9);
  transform: translateY(-1px);
}

.camera-lock-btn.active {
  background: #3b82f6;
  color: #ffffff;
  border-color: #3b82f6;
}
</style>
