<template>
  <el-drawer
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    direction="rtl"
    :size="drawerWidth"
    :show-close="true"
    :destroy-on-close="true"
    class="order-drawer"
  >
    <template #header>
      <div class="drawer-header">
        <div class="drawer-title-row">
          <h2 class="drawer-title">Chi tiết đơn hàng</h2>
          <span class="drawer-order-id">{{ truncateId(orderId, 16) }}</span>
        </div>
        <span v-if="order" class="status-badge" :class="getStatusClass(order.status)">
          {{ getStatusLabel(order.status) }}
        </span>
      </div>
    </template>

    <div v-if="loading" class="drawer-loading">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      <span>Đang tải...</span>
    </div>

    <div v-else-if="order" class="drawer-body">
      <el-tabs v-model="activeTab" class="drawer-tabs">
        <!-- Tab 1: Live Tracking -->
        <el-tab-pane label="📡 Giám sát Realtime" name="tracking">
          <OrderLiveTrackingTab :order="order" />
        </el-tab-pane>

        <!-- Tab 2: Order Items -->
        <el-tab-pane label="📋 Chi tiết đơn hàng" name="items">
          <OrderItemsTab :order="order" />
        </el-tab-pane>

        <!-- Tab 3: System Logs -->
        <el-tab-pane label="📜 Nhật ký hệ thống" name="logs">
          <OrderLogsTab :order="order" />
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { orderApi } from '@/api/orderApi'
import { getStatusLabel, getStatusClass, truncateId } from '@/utils/helpers'
import OrderLiveTrackingTab from './OrderLiveTrackingTab.vue'
import OrderItemsTab from './OrderItemsTab.vue'
import OrderLogsTab from './OrderLogsTab.vue'
import type { Order } from '@/types'

const props = defineProps<{
  visible: boolean
  orderId: string
}>()

defineEmits(['update:visible'])

const order = ref<Order | null>(null)
const loading = ref(false)
const activeTab = ref('tracking')
const drawerWidth = '70%'

watch([() => props.orderId, () => props.visible], async ([id, vis]) => {
  if (!id || !vis) return
  loading.value = true
  activeTab.value = 'tracking'
  order.value = null
  try {
    const res = await orderApi.getOrderById(id)
    const raw = res.data as any
    // API returns { data: { ... } } wrapper
    order.value = raw?.data || raw
  } catch (e) {
    console.error('Load order detail error:', e)
  } finally {
    loading.value = false
  }
}, { immediate: true })
</script>

<style scoped>
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.drawer-title-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.drawer-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.drawer-order-id {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: var(--text-muted);
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.drawer-body {
  height: 100%;
}

.drawer-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 300px;
  color: var(--text-muted);
}

.drawer-tabs {
  height: 100%;
}

:deep(.el-tabs__content) {
  height: calc(100% - 48px);
  overflow: hidden;
}

:deep(.el-tab-pane) {
  height: 100%;
}
</style>
