<template>
  <div class="revenue-view">
    <h2 class="page-title-main">Thống kê Doanh thu</h2>

    <!-- Summary Cards -->
    <div class="revenue-stats">
      <div class="stat-card" style="--accent-color: #10b981">
        <div class="stat-icon-wrap green"><span class="stat-emoji">💰</span></div>
        <div>
          <div class="stat-value">{{ formatCurrency(summary?.totalRevenue || 0) }}</div>
          <div class="stat-label">Tổng doanh thu</div>
        </div>
      </div>
      <div class="stat-card" style="--accent-color: #3b82f6">
        <div class="stat-icon-wrap blue"><span class="stat-emoji">📦</span></div>
        <div>
          <div class="stat-value">{{ summary?.totalOrders || 0 }}</div>
          <div class="stat-label">Đơn hoàn thành</div>
        </div>
      </div>
      <div class="stat-card" style="--accent-color: #8b5cf6">
        <div class="stat-icon-wrap purple"><span class="stat-emoji">📊</span></div>
        <div>
          <div class="stat-value">{{ avgOrderValue }}</div>
          <div class="stat-label">Giá trị TB/đơn</div>
        </div>
      </div>
    </div>

    <!-- Date Filter + Chart -->
    <div class="glass-card chart-section">
      <div class="chart-header">
        <h3 class="section-title">Doanh thu theo ngày</h3>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="→"
          start-placeholder="Từ"
          end-placeholder="Đến"
          format="DD/MM/YYYY"
          value-format="YYYY-MM-DD"
          @change="fetchDaily"
          style="width: 260px"
        />
      </div>
      <v-chart :option="chartOption" autoresize style="height: 350px" />
    </div>

    <!-- Bottom Section: Daily Table + Right Widgets -->
    <div class="bottom-grid">
      <!-- Left: Daily Table -->
      <div class="glass-card table-section">
        <h3 class="section-title">Chi tiết theo ngày</h3>
        <el-table :data="dailyData" style="width: 100%" size="small">
          <el-table-column prop="date" label="Ngày" width="140" />
          <el-table-column prop="orderCount" label="Số đơn" width="120" align="center" />
          <el-table-column prop="totalRevenue" label="Doanh thu" align="right">
            <template #default="{ row }">
              <span class="revenue-amount">{{ formatCurrency(row.totalRevenue) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- Right: Lag Card + Shipper Earnings Card -->
      <div class="right-widgets">
        <!-- Lag Card -->
        <div class="glass-card lag-card" v-loading="lagLoading">
          <div class="card-header-with-action">
            <h3 class="section-title">⚙️ Consumer Lag (order.completed)</h3>
            <el-button link type="primary" size="small" @click="fetchLag">Làm mới</el-button>
          </div>

          <div v-if="lagPartitions.length" class="lag-list">
            <div v-for="part in lagPartitions" :key="part.partition" class="lag-item">
              <div class="part-name">Partition {{ part.partition }}</div>
              <div class="offsets">
                <span>Offset: {{ part.currentOffset }} / {{ part.logEndOffset }}</span>
              </div>
              <span class="lag-badge" :class="getLagClass(part.lag)">
                Lag: {{ part.lag }}
              </span>
            </div>
          </div>
          <div v-else class="no-data-text">
            Không có dữ liệu lag hoặc kết nối Kafka lỗi.
          </div>
        </div>

        <!-- Shipper Earnings Selector Card -->
        <div class="glass-card shipper-earnings-card">
          <h3 class="section-title">💰 Tra cứu Thu nhập Shipper</h3>
          <div class="selector-wrap">
            <el-select
              v-model="selectedShipperId"
              placeholder="Chọn tài xế..."
              filterable
              style="width: 100%"
              @change="handleShipperSelect"
            >
              <el-option
                v-for="shipper in shippers"
                :key="shipper.id"
                :label="`${parseShipperName(shipper.name).name} (${shipper.phone})`"
                :value="shipper.id"
              />
            </el-select>
          </div>

          <div v-if="selectedShipper" class="shipper-preview-info">
            <div class="info-row">
              <span class="label">Tên tài xế:</span>
              <span class="value">{{ parseShipperName(selectedShipper.name).name }}</span>
            </div>
            <div class="info-row">
              <span class="label">Phương tiện:</span>
              <span class="value">{{ getVehicleLabel(selectedShipper.vehicleType) }}</span>
            </div>
            <div class="info-row">
              <span class="label">Tổng thu nhập:</span>
              <span class="value earnings">{{ formatCurrency(selectedShipper.totalEarnings) }}</span>
            </div>

            <el-button type="success" size="small" style="width: 100%; margin-top: 8px;" @click="showRevenueDrawer = true">
              Xem lịch sử giao dịch
            </el-button>
          </div>
          <div v-else class="no-data-text">
            Vui lòng chọn tài xế để xem thông tin chi tiết.
          </div>
        </div>
      </div>
    </div>

    <!-- Shipper Detail & Revenue Drawer -->
    <ShipperDetailDrawer
      v-model:visible="showRevenueDrawer"
      :shipper="selectedShipper"
      initial-tab="revenue"
      @saved="fetchShippers"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { revenueApi } from '@/api/revenueApi'
import { shipperApi } from '@/api/shipperApi'
import { formatCurrency, getVehicleLabel, parseShipperName } from '@/utils/helpers'
import ShipperDetailDrawer from '@/components/shipper/ShipperDetailDrawer.vue'
import type { RevenueSummary, DailyRevenue, Shipper } from '@/types'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent])

const summary = ref<RevenueSummary | null>(null)
const dailyData = ref<DailyRevenue[]>([])
const dateRange = ref<[string, string] | null>(null)

// Kafka Consumer Lag Refs & Computeds
interface LagPartition {
  partition: number
  currentOffset: string | number
  logEndOffset: string | number
  lag: string | number
}

interface LagData {
  topic: string
  partitions: LagPartition[]
}

const lagData = ref<LagData | null>(null)
const lagLoading = ref(false)

const lagPartitions = computed(() => {
  return lagData.value?.partitions || []
})

// Shipper Earnings Refs
const shippers = ref<Shipper[]>([])
const selectedShipperId = ref<string | null>(null)
const selectedShipper = ref<Shipper | null>(null)
const showRevenueDrawer = ref(false)

const avgOrderValue = computed(() => {
  if (!summary.value || !summary.value.totalOrders) return '—'
  return formatCurrency(summary.value.totalRevenue / summary.value.totalOrders)
})

const chartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 60, right: 20, top: 20, bottom: 30 },
  xAxis: {
    type: 'category',
    data: dailyData.value.map((d) => d.date),
    axisLine: { lineStyle: { color: '#334155' } },
    axisLabel: { color: '#94a3b8', fontSize: 11 },
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    splitLine: { lineStyle: { color: '#1e293b' } },
    axisLabel: { color: '#94a3b8', fontSize: 11 },
  },
  series: [
    {
      type: 'line',
      data: dailyData.value.map((d) => d.totalRevenue),
      smooth: true,
      lineStyle: { width: 3, color: '#10b981' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
            { offset: 1, color: 'rgba(16, 185, 129, 0.02)' },
          ],
        },
      },
      itemStyle: { color: '#10b981' },
    },
  ],
}))

async function fetchSummary() {
  try {
    const res = await revenueApi.getSummary()
    summary.value = res.data?.data || res.data
  } catch { /* silent */ }
}

async function fetchDaily() {
  try {
    const params: any = {}
    if (dateRange.value) {
      params.from = dateRange.value[0]
      params.to = dateRange.value[1]
    }
    const res = await revenueApi.getDaily(params)
    dailyData.value = res.data?.data || res.data || []
  } catch { /* silent */ }
}

async function fetchLag() {
  lagLoading.value = true
  try {
    const res = await revenueApi.getLag()
    lagData.value = res.data?.data || res.data
  } catch (err) {
    console.error('Lỗi khi lấy lag Revenue:', err)
  } finally {
    lagLoading.value = false
  }
}

async function fetchShippers() {
  try {
    const res = await shipperApi.getShippers()
    const data = res.data as any
    shippers.value = data?.data || data || []
  } catch (err) {
    console.error('Lỗi khi lấy danh sách shipper:', err)
  }
}

function handleShipperSelect(val: string) {
  const found = shippers.value.find((s) => s.id === val)
  selectedShipper.value = found || null
}

function getLagClass(lagVal: string | number) {
  const num = typeof lagVal === 'string' ? parseInt(lagVal, 10) : lagVal
  if (isNaN(num) || num === 0) return 'lag-zero'
  if (num < 5) return 'lag-low'
  return 'lag-high'
}

onMounted(() => {
  fetchSummary()
  fetchDaily()
  fetchLag()
  fetchShippers()
})
</script>

<style scoped>
.revenue-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-title-main {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.revenue-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-wrap.green { background: rgba(16,185,129,0.15); }
.stat-icon-wrap.blue { background: rgba(59,130,246,0.15); }
.stat-icon-wrap.purple { background: rgba(139,92,246,0.15); }

.stat-emoji { font-size: 22px; }

.stat-value {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary);
}

.stat-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}

.chart-section {
  padding: 24px;
}

.bottom-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 20px;
}

.table-section {
  padding: 24px;
}

.right-widgets {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.lag-card, .shipper-earnings-card {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.chart-header .section-title {
  margin-bottom: 0;
}

.revenue-amount {
  font-weight: 600;
  color: var(--color-success);
}
</style>
