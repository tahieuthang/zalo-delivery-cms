<template>
  <div class="dashboard">
    <!-- Stats Cards Row -->
    <div class="stats-grid">
      <div class="stat-card" style="--accent-color: #3b82f6">
        <div class="stat-icon-wrap blue"><el-icon :size="24"><List /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ summary?.orders?.total ?? '—' }}</div>
          <div class="stat-label">Tổng đơn hàng</div>
        </div>
      </div>
      <div class="stat-card" style="--accent-color: #f59e0b">
        <div class="stat-icon-wrap amber"><el-icon :size="24"><Clock /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ pendingCount }}</div>
          <div class="stat-label">Đang chờ xử lý</div>
        </div>
      </div>
      <div class="stat-card" style="--accent-color: #8b5cf6">
        <div class="stat-icon-wrap purple"><el-icon :size="24"><Van /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ summary?.shippers?.ONLINE ?? '—' }}</div>
          <div class="stat-label">Shipper Online</div>
        </div>
      </div>
      <div class="stat-card" style="--accent-color: #10b981">
        <div class="stat-icon-wrap green"><el-icon :size="24"><TrendCharts /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ revenueDisplay }}</div>
          <div class="stat-label">Doanh thu</div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="charts-row">
      <div class="glass-card chart-card">
        <h3 class="card-title">Doanh thu 7 ngày gần nhất</h3>
        <div class="chart-container">
          <v-chart :option="revenueChartOption" autoresize style="height: 300px" />
        </div>
      </div>
      <div class="glass-card chart-card chart-small">
        <h3 class="card-title">Phân bố trạng thái đơn</h3>
        <div class="chart-container">
          <v-chart :option="statusPieOption" autoresize style="height: 300px" />
        </div>
      </div>
    </div>

    <!-- Bottom Grid -->
    <div class="bottom-grid">
      <div class="glass-card recent-orders">
        <div class="card-header">
          <h3 class="card-title">Đơn hàng gần đây</h3>
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

      <DispatcherPanel :orders="recentOrders" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { List, Clock, Van, TrendCharts } from '@element-plus/icons-vue'
import { dashboardApi } from '@/api/dashboardApi'
import { revenueApi } from '@/api/revenueApi'
import { orderApi } from '@/api/orderApi'
import { getStatusLabel, getStatusClass, formatCurrency, formatDate, truncateId } from '@/utils/helpers'
import DispatcherPanel from '@/components/dashboard/DispatcherPanel.vue'
import type { DashboardSummary, DailyRevenue, Order } from '@/types'

use([CanvasRenderer, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent])

const summary = ref<DashboardSummary | null>(null)
const dailyRevenue = ref<DailyRevenue[]>([])
const recentOrders = ref<Order[]>([])

const pendingCount = computed(() => {
  if (!summary.value) return '—'
  const o = summary.value.orders
  return (o.PENDING || 0) + (o.WAITING_ACCEPTANCE || 0) + (o.NO_SHIPPER || 0)
})

const revenueDisplay = computed(() => {
  if (!summary.value) return '—'
  return formatCurrency(summary.value.revenue?.total || 0)
})

const safeDaily = computed(() => Array.isArray(dailyRevenue.value) ? dailyRevenue.value : [])

const revenueChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 60, right: 20, top: 20, bottom: 30 },
  xAxis: {
    type: 'category',
    data: safeDaily.value.map((d) => d.date),
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
      type: 'bar',
      data: safeDaily.value.map((d) => d.totalRevenue),
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#3b82f6' },
            { offset: 1, color: '#1d4ed8' },
          ],
        },
      },
      barWidth: '60%',
    },
  ],
}))

const statusPieOption = computed(() => {
  if (!summary.value) return {}
  const orders = summary.value.orders
  const data = [
    { value: orders.SUCCESS || 0, name: 'Thành công', itemStyle: { color: '#10b981' } },
    { value: orders.DELIVERING || 0, name: 'Đang giao', itemStyle: { color: '#3b82f6' } },
    { value: orders.PENDING || 0, name: 'Chờ xử lý', itemStyle: { color: '#f59e0b' } },
    { value: orders.FAILED || 0, name: 'Thất bại', itemStyle: { color: '#ef4444' } },
    { value: orders.NO_SHIPPER || 0, name: 'Không shipper', itemStyle: { color: '#64748b' } },
  ].filter((d) => d.value > 0)

  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '55%'],
        data,
        label: { color: '#94a3b8', fontSize: 11 },
        labelLine: { lineStyle: { color: '#475569' } },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' },
        },
      },
    ],
  }
})

onMounted(async () => {
  try {
    const [summaryRes, revenueRes, ordersRes] = await Promise.allSettled([
      dashboardApi.getSummary(),
      revenueApi.getDaily(),
      orderApi.getOrders({ limit: 5 }),
    ])
    if (summaryRes.status === 'fulfilled') {
      const d = summaryRes.value.data as any
      summary.value = d?.data || d
    }
    if (revenueRes.status === 'fulfilled') {
      const d = revenueRes.value.data as any
      dailyRevenue.value = d?.data || d || []
    }
    if (ordersRes.status === 'fulfilled') {
      const res = ordersRes.value.data as any
      recentOrders.value = res?.data || res || []
    }
  } catch (e) {
    console.error('Dashboard load error:', e)
  }
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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

.stat-icon-wrap.blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
.stat-icon-wrap.amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
.stat-icon-wrap.purple { background: rgba(139, 92, 246, 0.15); color: #a78bfa; }
.stat-icon-wrap.green { background: rgba(16, 185, 129, 0.15); color: #34d399; }

.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}

.charts-row {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 20px;
}

.chart-card {
  padding: 24px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.view-all-link {
  color: var(--color-primary);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
}

.bottom-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 20px;
}

.recent-orders {
  padding: 24px;
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
