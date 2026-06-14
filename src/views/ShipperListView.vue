<template>
  <div class="shipper-view">
    <div class="page-header">
      <h2>Quản lý Shipper</h2>
      <el-button type="primary" @click="addNewShipper">
        <el-icon><Plus /></el-icon> Thêm Shipper
      </el-button>
    </div>

    <div class="glass-card table-card">
      <el-table :data="shippers" v-loading="loading" style="width: 100%">
        <el-table-column label="Tên" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ parseShipperName(row.name).name }}
          </template>
        </el-table-column>
        <el-table-column label="Vị trí ban đầu" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ parseShipperName(row.name).location || '—' }}
          </template>
        </el-table-column>
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
        <el-table-column label="Vị trí" width="100" align="center">
          <template #default="{ row }">
            <el-button
              v-if="row.status !== 'OFFLINE'"
              link
              type="success"
              @click="viewShipperLocation(row)"
              title="Xem vị trí trên bản đồ"
            >
              <el-icon :size="18"><Location /></el-icon>
            </el-button>
            <span v-else class="text-muted">Offline</span>
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
        <el-table-column label="Hành động" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="Xem chi tiết & Chỉnh sửa" placement="top">
              <el-button
                link
                type="primary"
                @click="openDetailDrawer(row)"
              >
                <el-icon :size="18"><View /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="Xóa" placement="top">
              <el-button
                link
                type="danger"
                @click="deleteShipper(row)"
              >
                <el-icon :size="18"><Delete /></el-icon>
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Shipper Map Location Drawer -->
    <ShipperMapDrawer
      v-model:visible="showMapDrawer"
      :shipper="selectedShipper"
    />

    <!-- Shipper Detail & Revenue Drawer -->
    <ShipperDetailDrawer
      v-model:visible="showDetailDrawer"
      :shipper="selectedShipper"
      @saved="fetchShippers"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, View, Delete, Location } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { shipperApi } from '@/api/shipperApi'
import { getVehicleLabel, formatCurrency, formatDate, parseShipperName } from '@/utils/helpers'
import ShipperMapDrawer from '@/components/shipper/ShipperMapDrawer.vue'
import ShipperDetailDrawer from '@/components/shipper/ShipperDetailDrawer.vue'
import type { Shipper } from '@/types'

const shippers = ref<Shipper[]>([])
const loading = ref(false)

const togglingId = ref<string | null>(null)
const showMapDrawer = ref(false)
const showDetailDrawer = ref(false)
const selectedShipper = ref<Shipper | null>(null)

async function fetchShippers() {
  loading.value = true
  try {
    const res = await shipperApi.getShippers()
    const data = res.data as any
    shippers.value = data?.data || data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function addNewShipper() {
  selectedShipper.value = null
  showDetailDrawer.value = true
}

function openDetailDrawer(shipper: Shipper) {
  selectedShipper.value = shipper
  showDetailDrawer.value = true
}

async function deleteShipper(shipper: Shipper) {
  try {
    const displayName = parseShipperName(shipper.name).name
    await ElMessageBox.confirm(`Xóa shipper "${displayName}"?`, 'Xác nhận', { type: 'warning' })
    await shipperApi.deleteShipper(shipper.id)
    ElMessage.success('Đã xóa shipper thành công')
    fetchShippers()
  } catch { /* cancelled */ }
}

async function handleStatusToggle(shipper: Shipper, active: boolean) {
  togglingId.value = shipper.id
  try {
    const newStatus = active ? 'ONLINE' : 'OFFLINE'
    // Default mock coordinates for Hanoi THCS Tam Hiep center
    const lat = active ? 20.953503 + (Math.random() - 0.5) * 0.015 : undefined
    const lng = active ? 105.837839 + (Math.random() - 0.5) * 0.015 : undefined

    await shipperApi.toggleStatus(shipper.id, newStatus, lat, lng)
    const displayName = parseShipperName(shipper.name).name
    ElMessage.success(`Đã chuyển trạng thái shipper ${displayName} sang ${newStatus}`)
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
