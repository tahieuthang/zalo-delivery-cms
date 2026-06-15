<template>
  <el-drawer
    v-model="drawerVisible"
    :title="shipper ? `Chi tiết tài xế: ${parseShipperName(shipper.name).name}` : 'Thêm tài xế'"
    size="50%"
    direction="rtl"
    destroy-on-close
    @open="handleOpen"
    @close="handleClose"
  >
    <el-tabs v-model="activeTab" class="shipper-tabs">
      <!-- Tab 1: Profile Info & Edit -->
      <el-tab-pane label="👤 Thông tin cá nhân" name="profile">
        <div class="profile-tab-content">
          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-position="top"
            v-loading="saving"
            class="profile-form"
          >
            <el-form-item label="Họ và tên" prop="name">
              <el-input v-model="form.name" placeholder="Nhập họ và tên..." />
            </el-form-item>

            <el-form-item label="Số điện thoại" prop="phone">
              <el-input v-model="form.phone" placeholder="Nhập số điện thoại..." />
            </el-form-item>

            <el-form-item label="Phương tiện di chuyển" prop="vehicleType">
              <el-select v-model="form.vehicleType" placeholder="Chọn phương tiện..." style="width: 100%">
                <el-option label="🚲 Xe đạp" value="BIKE" />
                <el-option label="🏍️ Xe máy" value="MOTORCYCLE" />
                <el-option label="🚛 Xe tải" value="TRUCK" />
              </el-select>
            </el-form-item>

            <el-form-item label="Zalo User ID (nếu có)" prop="zaloUserId">
              <el-input v-model="form.zaloUserId" placeholder="Nhập Zalo User ID..." />
            </el-form-item>

            <div class="form-actions">
              <el-button type="primary" @click="handleSave" :loading="saving">Lưu thay đổi</el-button>
              <el-button @click="drawerVisible = false">Hủy</el-button>
            </div>
          </el-form>
        </div>
      </el-tab-pane>

      <!-- Tab 2: Revenue -->
      <el-tab-pane v-if="shipper" label="💰 Doanh thu & Lịch sử" name="revenue">
        <div class="revenue-tab-content" v-loading="loadingRevenue">
          <!-- Summary Cards -->
          <div class="revenue-summary-cards">
            <div class="glass-card summary-card" style="--accent-color: #10b981">
              <div class="card-icon">💰</div>
              <div class="card-info">
                <div class="card-value">{{ formatCurrency(earnings?.totalEarnings || 0) }}</div>
                <div class="card-label">Tổng thu nhập tích lũy</div>
              </div>
            </div>

            <div class="glass-card summary-card" style="--accent-color: #3b82f6">
              <div class="card-icon">📦</div>
              <div class="card-info">
                <div class="card-value">{{ earnings?.records?.length || 0 }}</div>
                <div class="card-label">Số đơn hàng đã giao</div>
              </div>
            </div>
          </div>

          <!-- Transaction History Table -->
          <div class="glass-card table-section">
            <h3 class="section-title">Lịch sử giao dịch</h3>
            
            <el-table :data="earnings?.records || []" style="width: 100%" size="small" max-height="400">
              <el-table-column type="index" label="STT" width="60" align="center" />
              <el-table-column prop="orderId" label="Mã đơn hàng" min-width="120">
                <template #default="{ row }">
                  <span class="order-id" :title="row.orderId">{{ truncateId(row.orderId, 10) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="type" label="Loại giao dịch" width="130">
                <template #default="{ row }">
                  <el-tag :type="getTransactionTagType(row.type)" size="small" effect="dark">
                    {{ getTransactionTypeLabel(row.type) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="amount" label="Số tiền" width="120" align="right">
                <template #default="{ row }">
                  <span class="amount-value" :class="{ positive: row.amount >= 0, negative: row.amount < 0 }">
                    {{ row.amount >= 0 ? '+' : '' }}{{ formatCurrency(row.amount) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="completedAt" label="Thời gian" width="140">
                <template #default="{ row }">
                  <span class="text-muted">{{ formatDate(row.completedAt) }}</span>
                </template>
              </el-table-column>
            </el-table>

            <div v-if="!earnings?.records?.length" class="empty-state">
              Chưa có lịch sử giao dịch.
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { shipperApi } from '@/api/shipperApi'
import { revenueApi } from '@/api/revenueApi'
import { formatCurrency, formatDate, truncateId, parseShipperName } from '@/utils/helpers'
import type { Shipper, ShipperEarnings } from '@/types'

const props = withDefaults(
  defineProps<{
    visible: boolean
    shipper: Shipper | null
    initialTab?: string
  }>(),
  {
    initialTab: 'profile',
  }
)

const emit = defineEmits(['update:visible', 'saved'])

const drawerVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

const activeTab = ref('profile')
const loadingRevenue = ref(false)
const saving = ref(false)
const earnings = ref<ShipperEarnings | null>(null)
const formRef = ref()

const form = reactive({
  name: '',
  phone: '',
  vehicleType: 'MOTORCYCLE',
  zaloUserId: '',
})

const rules = {
  name: [{ required: true, message: 'Vui lòng nhập họ tên', trigger: 'blur' }],
  phone: [{ required: true, message: 'Vui lòng nhập số điện thoại', trigger: 'blur' }],
  vehicleType: [{ required: true, message: 'Vui lòng chọn phương tiện', trigger: 'change' }],
}

watch(
  () => props.shipper,
  (newShipper) => {
    if (newShipper) {
      form.name = newShipper.name
      form.phone = newShipper.phone
      form.vehicleType = newShipper.vehicleType
      form.zaloUserId = newShipper.zaloUserId || ''
    } else {
      form.name = ''
      form.phone = ''
      form.vehicleType = 'MOTORCYCLE'
      form.zaloUserId = ''
    }
  },
  { immediate: true }
)

function handleOpen() {
  activeTab.value = props.initialTab || 'profile'
  if (props.shipper) {
    fetchEarnings()
  }
}

function handleClose() {
  earnings.value = null
}

async function fetchEarnings() {
  if (!props.shipper) return
  loadingRevenue.value = true
  try {
    const res = await revenueApi.getShipperEarnings(props.shipper.id)
    earnings.value = res.data?.data || res.data
  } catch (err) {
    console.error('Lỗi khi lấy doanh thu shipper:', err)
  } finally {
    loadingRevenue.value = false
  }
}

async function handleSave() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    saving.value = true
    try {
      if (props.shipper) {
        await shipperApi.updateShipper(props.shipper.id, form)
        ElMessage.success('Cập nhật thông tin shipper thành công')
      } else {
        await shipperApi.createShipper(form as any)
        ElMessage.success('Thêm shipper thành công')
      }
      emit('saved')
      drawerVisible.value = false
    } catch (err: any) {
      ElMessage.error(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      saving.value = false
    }
  })
}

function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    DELIVERY: 'Phí giao hàng',
    TIP: 'Tiền Tip',
    BONUS: 'Thưởng',
    REFUND: 'Hoàn tiền',
  }
  return labels[type.toUpperCase()] || type
}

function getTransactionTagType(type: string): string {
  const types: Record<string, string> = {
    DELIVERY: 'success',
    TIP: 'warning',
    BONUS: 'danger',
    REFUND: 'info',
  }
  return types[type.toUpperCase()] || ''
}
</script>

<style scoped>
.shipper-tabs {
  margin-top: -10px;
}

.profile-tab-content {
  padding: 10px 4px;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 16px;
}

.revenue-tab-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 10px 4px;
}

.revenue-summary-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.summary-card {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.card-icon {
  font-size: 28px;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
}

.card-info {
  display: flex;
  flex-direction: column;
}

.card-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-primary);
}

.card-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.table-section {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 14px;
}

.order-id {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: var(--color-primary-light);
}

.amount-value {
  font-weight: 600;
}

.amount-value.positive {
  color: #10b981;
}

.amount-value.negative {
  color: #ef4444;
}

.text-muted {
  color: var(--text-muted);
  font-size: 12px;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
