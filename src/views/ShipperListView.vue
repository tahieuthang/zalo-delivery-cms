<template>
  <div class="shipper-view">
    <div class="page-header">
      <h2>Quản lý Shipper</h2>
      <el-button type="primary" @click="showCreate = true">
        <el-icon><Plus /></el-icon> Thêm Shipper
      </el-button>
    </div>

    <div class="glass-card table-card">
      <el-table :data="shippers" v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="Tên" min-width="150" />
        <el-table-column prop="phone" label="SĐT" width="140" />
        <el-table-column prop="vehicleType" label="Phương tiện" width="140">
          <template #default="{ row }">
            {{ getVehicleLabel(row.vehicleType) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="Trạng thái" width="180">
          <template #default="{ row }">
            <div class="status-cell">
              <el-switch
                :model-value="row.status === 'ONLINE' || row.status === 'BUSY'"
                active-text="ON"
                inactive-text="OFF"
                inline-prompt
                style="--el-switch-on-color: #10b981; --el-switch-off-color: #475569"
                :loading="togglingId === row.id"
                @change="(val) => handleStatusToggle(row, val)"
              />
              <span class="status-dot-inline" :class="row.status.toLowerCase()">
                {{ row.status }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="totalEarnings" label="Thu nhập" width="150" align="right">
          <template #default="{ row }">
            <span class="earnings">{{ formatCurrency(row.totalEarnings) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="Ngày tạo" width="150">
          <template #default="{ row }">
            <span class="text-muted">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Hành động" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="editShipper(row)">Sửa</el-button>
            <el-button
              v-if="row.status !== 'OFFLINE'"
              link
              type="success"
              @click="viewShipperLocation(row)"
            >
              📍 Vị trí
            </el-button>
            <el-button link type="danger" @click="deleteShipper(row)">Xóa</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="showCreate"
      :title="editingShipper ? 'Sửa Shipper' : 'Thêm Shipper'"
      width="480px"
    >
      <el-form :model="form" label-position="top">
        <el-form-item label="Tên">
          <el-input v-model="form.name" placeholder="Nhập tên shipper" />
        </el-form-item>
        <el-form-item label="Số điện thoại">
          <el-input v-model="form.phone" placeholder="09xxxxxxxx" />
        </el-form-item>
        <el-form-item label="Phương tiện">
          <el-select v-model="form.vehicleType" style="width: 100%">
            <el-option label="🚲 Xe đạp" value="BIKE" />
            <el-option label="🏍️ Xe máy" value="MOTORCYCLE" />
            <el-option label="🚛 Xe tải" value="TRUCK" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">Hủy</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">Lưu</el-button>
      </template>
    </el-dialog>

    <!-- Shipper Map Location Drawer -->
    <ShipperMapDrawer
      v-model:visible="showMapDrawer"
      :shipper="selectedShipper"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { shipperApi } from '@/api/shipperApi'
import { getVehicleLabel, formatCurrency, formatDate } from '@/utils/helpers'
import ShipperMapDrawer from '@/components/shipper/ShipperMapDrawer.vue'
import type { Shipper } from '@/types'

const shippers = ref<Shipper[]>([])
const loading = ref(false)
const saving = ref(false)
const showCreate = ref(false)
const editingShipper = ref<Shipper | null>(null)

const togglingId = ref<string | null>(null)
const showMapDrawer = ref(false)
const selectedShipper = ref<Shipper | null>(null)

const form = reactive({
  name: '',
  phone: '',
  vehicleType: 'MOTORCYCLE' as string,
})

async function fetchShippers() {
  loading.value = true
  try {
    const res = await shipperApi.getShippers()
    shippers.value = (res.data as any) || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function editShipper(shipper: Shipper) {
  editingShipper.value = shipper
  form.name = shipper.name
  form.phone = shipper.phone
  form.vehicleType = shipper.vehicleType
  showCreate.value = true
}

async function handleSave() {
  saving.value = true
  try {
    if (editingShipper.value) {
      await shipperApi.updateShipper(editingShipper.value.id, form)
      ElMessage.success('Cập nhật thành công')
    } else {
      await shipperApi.createShipper({ name: form.name, phone: form.phone, vehicleType: form.vehicleType as any })
      ElMessage.success('Tạo shipper thành công')
    }
    showCreate.value = false
    editingShipper.value = null
    form.name = ''
    form.phone = ''
    form.vehicleType = 'MOTORCYCLE'
    fetchShippers()
  } catch (e) {
    console.error(e)
  } finally {
    saving.value = false
  }
}

async function deleteShipper(shipper: Shipper) {
  try {
    await ElMessageBox.confirm(`Xóa shipper "${shipper.name}"?`, 'Xác nhận', { type: 'warning' })
    await shipperApi.deleteShipper(shipper.id)
    ElMessage.success('Đã xóa')
    fetchShippers()
  } catch { /* cancelled */ }
}

async function handleStatusToggle(shipper: Shipper, active: boolean) {
  togglingId.value = shipper.id
  try {
    const newStatus = active ? 'ONLINE' : 'OFFLINE'
    // Default mock coordinates for Hanoi THCS Tam Hiep center (adds slight jitter so each online shipper doesn't stack exactly on top of each other)
    const lat = active ? 20.953503 + (Math.random() - 0.5) * 0.015 : undefined
    const lng = active ? 105.837839 + (Math.random() - 0.5) * 0.015 : undefined

    await shipperApi.toggleStatus(shipper.id, newStatus, lat, lng)
    ElMessage.success(`Đã chuyển trạng thái shipper ${shipper.name} sang ${newStatus}`)
    fetchShippers()
  } catch (e) {
    console.error('Lỗi khi thay đổi trạng thái shipper:', e)
    ElMessage.error('Không thể thay đổi trạng thái shipper. Vui lòng kiểm tra kết nối API.')
  } finally {
    togglingId.value = null
  }
}

function viewShipperLocation(shipper: Shipper) {
  selectedShipper.value = shipper
  showMapDrawer.value = true
}

onMounted(fetchShippers)
</script>

<style scoped>
.shipper-view {
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

.table-card {
  padding: 0;
  overflow: hidden;
}

.status-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-dot-inline {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 6px;
}

.status-dot-inline.online { background: rgba(16,185,129,0.15); color: #34d399; }
.status-dot-inline.offline { background: rgba(100,116,139,0.15); color: #94a3b8; }
.status-dot-inline.busy { background: rgba(245,158,11,0.15); color: #fbbf24; }

.earnings {
  font-weight: 600;
  color: var(--color-success);
}

.text-muted {
  color: var(--text-muted);
  font-size: 13px;
}
</style>
