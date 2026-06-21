<template>
  <div class="order-list-view">
    <!-- Page Header -->
    <div class="page-header">
      <h2>Quản lý Đơn hàng</h2>
      <el-button type="primary" @click="openCreateOrderDialog">
        <el-icon><Plus /></el-icon> Tạo đơn hàng
      </el-button>
    </div>

    <!-- Filter Bar -->
    <div class="glass-card filter-bar">
      <div class="filter-row">
        <el-select
          v-model="filters.status"
          placeholder="Trạng thái"
          clearable
          multiple
          collapse-tags
          collapse-tags-tooltip
          style="width: 240px"
        >
          <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
        </el-select>

        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="→"
          start-placeholder="Từ ngày"
          end-placeholder="Đến ngày"
          format="DD/MM/YYYY"
          value-format="YYYY-MM-DDTHH:mm:ss"
          style="width: 280px"
        />

        <el-input
          v-model="filters.shipperId"
          placeholder="Shipper ID"
          clearable
          style="width: 180px"
        />

        <el-button type="primary" @click="fetchOrders">
          <el-icon><Search /></el-icon> Tìm kiếm
        </el-button>
        <el-button @click="resetFilters">Reset</el-button>
      </div>
    </div>

    <!-- Order Table -->
    <div class="glass-card table-card">
      <el-table
        :data="orders"
        v-loading="loading"
        style="width: 100%"
        row-class-name="order-row"
        @row-click="openDrawer"
        highlight-current-row
      >
        <el-table-column prop="id" label="Mã đơn" width="150">
          <template #default="{ row }">
            <span class="order-id-cell">{{ truncateId(row.id, 12) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="customerId" label="Khách hàng" width="160">
          <template #default="{ row }">
            <div style="display: flex; flex-direction: column; line-height: 1.3;">
              <span style="font-weight: 500;">{{ row.customerName || 'Khách hàng Zalo' }}</span>
              <span v-if="row.customerPhone" class="text-muted" style="font-size: 11px;">{{ row.customerPhone }}</span>
              <span v-else class="text-muted" style="font-size: 11px;">ID: {{ truncateId(row.customerId, 8) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="pickupAddress" label="Địa chỉ lấy" show-overflow-tooltip min-width="200" />
        <el-table-column prop="deliveryAddress" label="Địa chỉ giao" show-overflow-tooltip min-width="200" />
        <el-table-column prop="status" label="Trạng thái" width="170">
          <template #default="{ row }">
            <span class="status-badge" :class="getStatusClass(row.status)">
              {{ getStatusLabel(row.status) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Shipper" width="140">
          <template #default="{ row }">
            <span v-if="row.shipper">{{ row.shipper.name }}</span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="Thời gian" width="160" sortable>
          <template #default="{ row }">
            <span class="text-muted">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="" width="70" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="openDrawer(row)">
              <el-icon><View /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchOrders"
          @current-change="fetchOrders"
        />
      </div>
    </div>

    <!-- Order Detail Drawer -->
    <OrderDrawer
      v-model:visible="drawerVisible"
      :order-id="selectedOrderId"
    />

    <!-- Create Order Dialog -->
    <el-dialog
      v-model="showCreateDialog"
      title="Tạo đơn hàng thủ công"
      width="520px"
      destroy-on-close
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createFormRules"
        label-position="top"
      >
        <el-form-item label="Địa chỉ lấy hàng (Shop)" prop="pickupAddress">
          <el-input
            v-model="createForm.pickupAddress"
            placeholder="Nhập địa chỉ lấy hàng..."
            clearable
          />
        </el-form-item>

        <el-form-item label="Địa chỉ giao hàng (Khách hàng)" prop="deliveryAddress">
          <el-input
            v-model="createForm.deliveryAddress"
            placeholder="Nhập địa chỉ giao hàng..."
            clearable
            type="textarea"
            :rows="3"
          />
        </el-form-item>

        <el-form-item label="Ghi chú đơn hàng" prop="note">
          <el-input
            v-model="createForm.note"
            placeholder="Nhập ghi chú cho tài xế..."
            clearable
            type="textarea"
            :rows="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showCreateDialog = false">Hủy</el-button>
          <el-button type="primary" @click="handleCreateOrder" :loading="creatingOrder">
            Tạo đơn hàng
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Search, View, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { orderApi } from '@/api/orderApi'
import { getStatusLabel, getStatusClass, formatDate, truncateId } from '@/utils/helpers'
import OrderDrawer from '@/components/order/OrderDrawer.vue'
import type { Order } from '@/types'

const route = useRoute()

const orders = ref<Order[]>([])
const loading = ref(false)
const drawerVisible = ref(false)
const selectedOrderId = ref('')
const dateRange = ref<[string, string] | null>(null)

const filters = reactive({
  status: [] as string[],
  shipperId: '',
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
})

const statusOptions = [
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'WAITING_ACCEPTANCE', label: 'Chờ nhận đơn' },
  { value: 'ASSIGNED', label: 'Đã phân công' },
  { value: 'DELIVERING', label: 'Đang giao' },
  { value: 'SUCCESS', label: 'Thành công' },
  { value: 'FAILED', label: 'Thất bại' },
  { value: 'NO_SHIPPER', label: 'Không tìm thấy shipper' },
]

const showCreateDialog = ref(false)
const creatingOrder = ref(false)
const createFormRef = ref()

const createForm = reactive({
  pickupAddress: '',
  deliveryAddress: '',
  note: '',
})

const createFormRules = {
  pickupAddress: [{ required: true, message: 'Vui lòng nhập địa chỉ lấy hàng', trigger: 'blur' }],
  deliveryAddress: [{ required: true, message: 'Vui lòng nhập địa chỉ giao hàng', trigger: 'blur' }],
}

async function fetchOrders() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      limit: pagination.limit,
    }
    if (filters.status.length) params.status = filters.status.join(',')
    if (filters.shipperId) params.shipperId = filters.shipperId
    if (dateRange.value) {
      params.from = dateRange.value[0]
      params.to = dateRange.value[1]
    }

    const res = await orderApi.getOrders(params)
    const data = res.data as any
    orders.value = data?.data || data || []
    pagination.total = data?.meta?.total || data?.total || orders.value.length
  } catch (e) {
    console.error('Fetch orders error:', e)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.status = []
  filters.shipperId = ''
  dateRange.value = null
  pagination.page = 1
  fetchOrders()
}

function openDrawer(row: Order) {
  selectedOrderId.value = row.id
  drawerVisible.value = true
}

function openCreateOrderDialog() {
  createForm.pickupAddress = import.meta.env.VITE_DEFAULT_SHOP_NAME || 'Trường THCS Tam Hiệp, Huỳnh Cung, Thanh Trì, Hà Nội'
  createForm.deliveryAddress = ''
  createForm.note = ''
  showCreateDialog.value = true
}

async function handleCreateOrder() {
  if (!createFormRef.value) return
  await createFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    creatingOrder.value = true
    try {
      await orderApi.createOrder({
        customerId: `guest_${Date.now()}`,
        pickupAddress: createForm.pickupAddress,
        deliveryAddress: createForm.deliveryAddress,
        note: createForm.note || undefined,
      })
      ElMessage.success('Tạo đơn hàng thủ công thành công!')
      showCreateDialog.value = false
      fetchOrders()
    } catch (e: any) {
      console.error('Lỗi khi tạo đơn hàng:', e)
      ElMessage.error(e.response?.data?.message || 'Không thể tạo đơn hàng. Vui lòng kiểm tra địa chỉ địa lý.')
    } finally {
      creatingOrder.value = false
    }
  })
}

// Check for viewOrder query param (from notification click)
watch(() => route.query.viewOrder, (orderId) => {
  if (orderId && typeof orderId === 'string') {
    selectedOrderId.value = orderId
    drawerVisible.value = true
  }
}, { immediate: true })

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.order-list-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.filter-bar {
  padding: 20px 24px;
}

.filter-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.order-row {
  cursor: pointer;
}

.order-id-cell {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: var(--color-primary-light);
  cursor: pointer;
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

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}
</style>
