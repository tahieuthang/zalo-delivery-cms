<template>
  <el-drawer
    v-model="drawerVisible"
    :title="`Vị trí tài xế: ${parseShipperName(shipper?.name).name || ''}`"
    size="50%"
    direction="rtl"
    destroy-on-close
    @open="handleOpen"
    @close="handleClose"
  >
    <div class="shipper-map-container" v-loading="loading">
      <div v-if="error" class="error-state">
        <el-alert
          title="Không tìm thấy tọa độ"
          :description="error"
          type="error"
          show-icon
          :closable="false"
        />
      </div>

      <div class="map-wrapper" ref="mapContainer">
        <l-map
          v-if="mapReady && lat && lng"
          ref="mapRef"
          :zoom="15"
          :center="[lat, lng]"
          :use-global-leaflet="false"
          style="height: 100%; width: 100%; border-radius: 8px"
        >
          <l-tile-layer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; CartoDB"
          />

          <l-marker :lat-lng="[lat, lng]">
            <l-icon :icon-size="[40, 40]" :icon-anchor="[20, 20]">
              <template #default>
                <div class="custom-marker shipper-marker">🛵</div>
              </template>
            </l-icon>
            <l-popup>
              <div class="popup-content">
                <strong>🛵 {{ parseShipperName(shipper?.name).name }}</strong>
                <p>Số điện thoại: {{ shipper?.phone }}</p>
                <p>Trạng thái: <span class="status-text">{{ shipper?.status }}</span></p>
                <p class="coords-text">Tọa độ: {{ lat.toFixed(5) }}, {{ lng.toFixed(5) }}</p>
              </div>
            </l-popup>
          </l-marker>
        </l-map>
      </div>

      <div class="shipper-meta-card glass-card">
        <div class="meta-row">
          <span class="label">Phương tiện:</span>
          <span class="value">{{ getVehicleLabel(shipper?.vehicleType || 'BIKE') }}</span>
        </div>
        <div class="meta-row">
          <span class="label">Tổng thu nhập:</span>
          <span class="value earnings">{{ formatCurrency(shipper?.totalEarnings || 0) }}</span>
        </div>
        <div class="meta-row">
          <span class="label">Trạng thái:</span>
          <span class="value status-badge" :class="shipper?.status.toLowerCase()">
            {{ shipper?.status }}
          </span>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, nextTick } from 'vue'
import { shipperApi } from '@/api/shipperApi'
import { getVehicleLabel, formatCurrency, parseShipperName } from '@/utils/helpers'
import type { Shipper } from '@/types'

// Lazy import Leaflet
import { LMap, LTileLayer, LMarker, LIcon, LPopup } from '@vue-leaflet/vue-leaflet'

const props = defineProps<{
  visible: boolean
  shipper: Shipper | null
}>()

const emit = defineEmits(['update:visible'])

const drawerVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

const mapReady = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const lat = ref<number | null>(null)
const lng = ref<number | null>(null)
let pollingTimer: ReturnType<typeof setInterval> | null = null

async function fetchLocation() {
  if (!props.shipper) return
  try {
    const res = await shipperApi.getLocation(props.shipper.id)
    const raw = res.data as any
    const data = raw?.data || raw
    if (data && data.lat && data.lng) {
      lat.value = data.lat
      lng.value = data.lng
      error.value = null
    } else {
      error.value = 'Không có thông tin tọa độ trong phản hồi API'
    }
  } catch (err: any) {
    console.error('Lỗi khi lấy vị trí shipper:', err)
    error.value = err.response?.data?.message || 'Tài xế hiện đang offline hoặc chưa cập nhật vị trí'
  }
}

async function handleOpen() {
  loading.value = true
  lat.value = null
  lng.value = null
  error.value = null
  mapReady.value = false

  await fetchLocation()
  loading.value = false

  await nextTick()
  mapReady.value = true

  // Bắt đầu polling mỗi 3 giây nếu không lỗi
  if (!error.value) {
    pollingTimer = setInterval(fetchLocation, 3000)
  }
}

function handleClose() {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

onBeforeUnmount(() => {
  handleClose()
})
</script>

<style scoped>
.shipper-map-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
}

.map-wrapper {
  flex: 1;
  min-height: 350px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  position: relative;
}

.error-state {
  margin-bottom: 8px;
}

.custom-marker {
  font-size: 28px;
  text-align: center;
  line-height: 40px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
  animation: shipper-bounce 2s ease-in-out infinite;
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

.coords-text {
  font-size: 11px;
  color: var(--text-muted);
}

.shipper-meta-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.meta-row .label {
  color: var(--text-muted);
}

.meta-row .value {
  color: var(--text-primary);
  font-weight: 500;
}

.value.earnings {
  color: var(--color-success);
  font-weight: 600;
}

.status-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}

.status-badge.online { background: rgba(16, 185, 129, 0.15); color: #34d399; }
.status-badge.offline { background: rgba(100, 116, 139, 0.15); color: #94a3b8; }
.status-badge.busy { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
</style>
