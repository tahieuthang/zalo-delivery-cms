<template>
  <div class="order-logs-tab">
    <!-- Offer Logs -->
    <div class="log-section">
      <h4 class="section-title">🔄 Lịch sử điều phối Shipper</h4>
      <div v-if="order.offerLogs && order.offerLogs.length" class="offer-logs">
        <el-table :data="order.offerLogs" style="width: 100%" size="small">
          <el-table-column type="index" label="#" width="50" />
          <el-table-column label="Shipper" min-width="160">
            <template #default="{ row }">
              <div class="shipper-cell">
                <span class="shipper-name">{{ row.shipper?.name || row.shipperId }}</span>
                <span v-if="row.shipper" class="shipper-phone">{{ row.shipper.phone }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="Trạng thái" width="140">
            <template #default="{ row }">
              <span class="offer-status" :class="'offer-' + row.status.toLowerCase()">
                {{ getOfferStatusLabel(row.status) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="Thời gian gửi" width="170">
            <template #default="{ row }">
              <span class="text-muted">{{ formatDate(row.createdAt) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="updatedAt" label="Phản hồi lúc" width="170">
            <template #default="{ row }">
              <span class="text-muted">{{ formatDate(row.updatedAt) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div v-else class="empty-state">
        <span class="empty-icon">📭</span>
        <span>Chưa có lịch sử điều phối</span>
      </div>
    </div>

    <!-- Status Change Timeline -->
    <div class="log-section">
      <h4 class="section-title">📊 Lịch sử trạng thái</h4>
      <el-timeline>
        <el-timeline-item
          v-for="log in statusLogs"
          :key="log.time"
          :type="log.type as any"
          :timestamp="log.time"
          placement="top"
        >
          <div class="timeline-content">
            <span class="timeline-label">{{ log.label }}</span>
            <span v-if="log.detail" class="timeline-detail">{{ log.detail }}</span>
          </div>
        </el-timeline-item>
      </el-timeline>
    </div>

    <!-- Trajectory Stats -->
    <div class="log-section">
      <h4 class="section-title">📍 Thông số GPS</h4>
      <div class="gps-stats">
        <div class="gps-stat-item">
          <span class="gps-label">Tổng GPS points</span>
          <span class="gps-value">{{ order._count?.trajectory || trajectoryCount }}</span>
        </div>
        <div class="gps-stat-item">
          <span class="gps-label">Pickup</span>
          <span class="gps-value mono">
            {{ order.pickupLat?.toFixed(6) }}, {{ order.pickupLng?.toFixed(6) }}
          </span>
        </div>
        <div class="gps-stat-item">
          <span class="gps-label">Delivery</span>
          <span class="gps-value mono">
            {{ order.deliveryLat?.toFixed(6) }}, {{ order.deliveryLng?.toFixed(6) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Raw System Info -->
    <div class="log-section">
      <h4 class="section-title">⚙️ Thông tin hệ thống</h4>
      <div class="system-info">
        <div class="sys-row">
          <span class="sys-label">Order ID</span>
          <span class="sys-value mono">{{ order.id }}</span>
        </div>
        <div class="sys-row">
          <span class="sys-label">Customer ID</span>
          <span class="sys-value mono">{{ order.customerId }}</span>
        </div>
        <div class="sys-row">
          <span class="sys-label">Shipper ID</span>
          <span class="sys-value mono">{{ order.shipperId || '—' }}</span>
        </div>
        <div class="sys-row">
          <span class="sys-label">Created At</span>
          <span class="sys-value">{{ formatDate(order.createdAt) }}</span>
        </div>
        <div class="sys-row">
          <span class="sys-label">Updated At</span>
          <span class="sys-value">{{ formatDate(order.updatedAt) }}</span>
        </div>
        <div class="sys-row" v-if="order.completedAt">
          <span class="sys-label">Completed At</span>
          <span class="sys-value">{{ formatDate(order.completedAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatDate } from '@/utils/helpers'
import type { Order } from '@/types'

const props = defineProps<{ order: Order }>()

const trajectoryCount = computed(() => props.order.trajectory?.length || 0)

function getOfferStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Đang chờ',
    ACCEPTED: 'Đã nhận',
    REJECTED: 'Từ chối',
    TIMEOUT: 'Hết hạn',
  }
  return labels[status] || status
}

const statusLogs = computed(() => {
  const logs = [
    {
      label: 'Đơn hàng được tạo',
      time: formatDate(props.order.createdAt),
      type: 'primary',
      detail: `Customer: ${props.order.customerId}`,
    },
  ]

  if (props.order.offerLogs?.length) {
    props.order.offerLogs.forEach((log) => {
      logs.push({
        label: `Gửi offer cho shipper ${log.shipper?.name || log.shipperId}`,
        time: formatDate(log.createdAt),
        type: '',
        detail: `Kết quả: ${getOfferStatusLabel(log.status)}`,
      })
    })
  }

  if (props.order.shipperId) {
    logs.push({
      label: `Shipper ${props.order.shipper?.name || props.order.shipperId} nhận đơn`,
      time: '',
      type: 'success',
      detail: '',
    })
  }

  if (props.order.completedAt) {
    logs.push({
      label: props.order.status === 'SUCCESS' ? 'Giao hàng thành công' : 'Đơn thất bại',
      time: formatDate(props.order.completedAt),
      type: props.order.status === 'SUCCESS' ? 'success' : 'danger',
      detail: '',
    })
  }

  return logs
})
</script>

<style scoped>
.order-logs-tab {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 8px 0;
  height: 100%;
  overflow-y: auto;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.log-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
}

.offer-status {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.offer-pending { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
.offer-accepted { background: rgba(16, 185, 129, 0.15); color: #34d399; }
.offer-rejected { background: rgba(239, 68, 68, 0.15); color: #f87171; }
.offer-timeout { background: rgba(100, 116, 139, 0.15); color: #94a3b8; }

.shipper-cell {
  display: flex;
  flex-direction: column;
}

.shipper-name {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 13px;
}

.shipper-phone {
  font-size: 12px;
  color: var(--text-muted);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  color: var(--text-muted);
  font-size: 13px;
}

.empty-icon {
  font-size: 32px;
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-label {
  font-size: 14px;
  color: var(--text-primary);
}

.timeline-detail {
  font-size: 12px;
  color: var(--text-muted);
}

/* GPS Stats */
.gps-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gps-stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
}

.gps-stat-item:last-child {
  border-bottom: none;
}

.gps-label {
  font-size: 13px;
  color: var(--text-muted);
}

.gps-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.gps-value.mono {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-secondary);
}

/* System Info */
.system-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sys-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(51, 65, 85, 0.3);
}

.sys-row:last-child {
  border-bottom: none;
}

.sys-label {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sys-value {
  font-size: 13px;
  color: var(--text-secondary);
}

.sys-value.mono {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
}

.text-muted {
  color: var(--text-muted);
  font-size: 13px;
}
</style>
