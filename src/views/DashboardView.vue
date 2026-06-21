<template>
  <div class="dashboard">
    <!-- Main Operating Grid -->
    <div class="operating-grid">
      <!-- Recent Orders Table -->
      <div class="glass-card recent-orders">
        <div class="card-header">
          <h3 class="card-title">📦 Đơn hàng gần đây</h3>
          <router-link to="/orders" class="view-all-link">Xem tất cả →</router-link>
        </div>
        <el-table :data="recentOrders" style="width: 100%" size="small">
          <el-table-column prop="id" label="Mã đơn" width="140">
            <template #default="{ row }">
              <span class="order-id">{{ truncateId(row.id) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="pickupAddress" label="Nơi lấy" show-overflow-tooltip />
          <el-table-column prop="deliveryAddress" label="Nơi giao" show-overflow-tooltip />
          <el-table-column prop="status" label="Trạng thái" width="160">
            <template #default="{ row }">
              <span class="status-badge" :class="getStatusClass(row.status)">
                {{ getStatusLabel(row.status) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="Thời gian" width="160">
            <template #default="{ row }">
              <span class="text-muted">{{ formatDate(row.createdAt) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- Dispatcher Panel -->
      <DispatcherPanel :orders="recentOrders" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { orderApi } from '@/api/orderApi'
import { getStatusLabel, getStatusClass, formatDate, truncateId } from '@/utils/helpers'
import DispatcherPanel from '@/components/dashboard/DispatcherPanel.vue'
import type { Order } from '@/types'

const recentOrders = ref<Order[]>([])

onMounted(async () => {
  try {
    const ordersRes = await orderApi.getOrders({ limit: 5 })
    const res = ordersRes.data as any
    recentOrders.value = res?.data || res || []
  } catch (e) {
    console.error('Dashboard load error:', e)
  }
})
</script>

<style scoped>
.dashboard {
  height: 100%;
}

.operating-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 24px;
  align-items: start;
}

.recent-orders {
  padding: 24px;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.view-all-link {
  color: var(--color-primary);
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  transition: color 0.2s ease;
}

.view-all-link:hover {
  color: var(--color-primary-light);
}

.order-id {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: var(--color-primary-light);
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.text-muted {
  color: var(--text-muted);
  font-size: 13px;
}
</style>
