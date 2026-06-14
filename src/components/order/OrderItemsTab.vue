<template>
  <div class="order-items-tab">
    <!-- Order Info Header -->
    <div class="order-info-header">
      <div class="info-row">
        <div class="info-item">
          <span class="info-label">🏪 Nơi lấy hàng</span>
          <span class="info-value">{{ order.pickupAddress }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">🏠 Nơi giao hàng</span>
          <span class="info-value">{{ order.deliveryAddress }}</span>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <div class="items-section">
      <h4 class="section-title">Danh sách món</h4>
      <el-table :data="mockItems" style="width: 100%" size="small">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="name" label="Tên món" min-width="200" />
        <el-table-column prop="quantity" label="SL" width="80" align="center" />
        <el-table-column prop="unitPrice" label="Đơn giá" width="130" align="right">
          <template #default="{ row }">
            {{ formatCurrency(row.unitPrice) }}
          </template>
        </el-table-column>
        <el-table-column prop="total" label="Thành tiền" width="140" align="right">
          <template #default="{ row }">
            <strong>{{ formatCurrency(row.total) }}</strong>
          </template>
        </el-table-column>
      </el-table>

      <!-- Bill Summary -->
      <div class="bill-summary">
        <div class="bill-row">
          <span>Tạm tính</span>
          <span>{{ formatCurrency(subtotal) }}</span>
        </div>
        <div class="bill-row">
          <span>Phí giao hàng</span>
          <span>{{ formatCurrency(deliveryFee) }}</span>
        </div>
        <div class="bill-row">
          <span>VAT (10%)</span>
          <span>{{ formatCurrency(vat) }}</span>
        </div>
        <div class="bill-row total">
          <span>Tổng thanh toán</span>
          <span>{{ formatCurrency(totalBill) }}</span>
        </div>
      </div>
    </div>

    <!-- Note -->
    <div v-if="order.note" class="note-section">
      <h4 class="section-title">📝 Ghi chú khách hàng</h4>
      <div class="note-content">{{ order.note }}</div>
    </div>

    <!-- Revenue Records -->
    <div v-if="order.revenues && order.revenues.length" class="revenue-section">
      <h4 class="section-title">💰 Lịch sử thanh toán</h4>
      <el-table :data="order.revenues" style="width: 100%" size="small">
        <el-table-column prop="id" label="ID" width="140">
          <template #default="{ row }">
            <span class="mono-text">{{ truncateId(row.id) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="Loại" width="120" />
        <el-table-column prop="amount" label="Số tiền" width="140" align="right">
          <template #default="{ row }">
            <span class="revenue-amount">{{ formatCurrency(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="completedAt" label="Thời gian" width="180">
          <template #default="{ row }">
            <span class="text-muted">{{ formatDate(row.completedAt) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- API Notice -->
    <div class="api-notice">
      <el-alert
        title="Lưu ý: Danh sách món ăn đang sử dụng dữ liệu mẫu"
        description="API backend chưa có endpoint trả về order items. Cần bổ sung GET /api/orders/{id}/items để hiển thị dữ liệu thực."
        type="info"
        :closable="true"
        show-icon
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatCurrency, formatDate, truncateId } from '@/utils/helpers'
import type { Order, OrderItem } from '@/types'

const props = defineProps<{ order: Order }>()

// Mock data for items (API chưa có)
const mockItems: OrderItem[] = [
  { id: '1', name: 'Phở Bò Tái Nạm', quantity: 2, unitPrice: 55000, total: 110000 },
  { id: '2', name: 'Gỏi Cuốn Tôm Thịt', quantity: 1, unitPrice: 35000, total: 35000 },
  { id: '3', name: 'Chả Giò Rế', quantity: 3, unitPrice: 25000, total: 75000 },
  { id: '4', name: 'Trà Đào Cam Sả', quantity: 2, unitPrice: 29000, total: 58000 },
]

const subtotal = computed(() => mockItems.reduce((acc, item) => acc + item.total, 0))
const deliveryFee = 15000
const vat = computed(() => Math.round(subtotal.value * 0.1))
const totalBill = computed(() => subtotal.value + deliveryFee + vat.value)
</script>

<style scoped>
.order-items-tab {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 8px 0;
  height: 100%;
  overflow-y: auto;
}

.order-info-header {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
}

.info-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 14px;
  color: var(--text-primary);
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.bill-summary {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 20px;
  margin-top: 16px;
}

.bill-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.bill-row.total {
  border-top: 1px solid var(--border-color);
  margin-top: 8px;
  padding-top: 12px;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.note-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
}

.note-content {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  font-style: italic;
}

.mono-text {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: var(--text-muted);
}

.revenue-amount {
  color: var(--color-success);
  font-weight: 600;
}

.text-muted {
  color: var(--text-muted);
  font-size: 13px;
}

.api-notice {
  margin-top: 8px;
}
</style>
