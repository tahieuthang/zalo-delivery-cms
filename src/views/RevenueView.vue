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

    <!-- Daily Table -->
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
import { formatCurrency } from '@/utils/helpers'
import type { RevenueSummary, DailyRevenue } from '@/types'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent])

const summary = ref<RevenueSummary | null>(null)
const dailyData = ref<DailyRevenue[]>([])
const dateRange = ref<[string, string] | null>(null)

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
    summary.value = res.data as any
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
    dailyData.value = (res.data as any) || []
  } catch { /* silent */ }
}

onMounted(() => {
  fetchSummary()
  fetchDaily()
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

.chart-section, .table-section {
  padding: 24px;
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
