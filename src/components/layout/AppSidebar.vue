<template>
  <aside class="sidebar">
    <div class="sidebar-brand">
      <div class="brand-icon">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="url(#brand-gradient)" />
          <path d="M8 16L14 10L20 16L14 22L8 16Z" fill="white" opacity="0.9" />
          <path d="M14 16L20 10L26 16L20 22L14 16Z" fill="white" opacity="0.6" />
          <defs>
            <linearGradient id="brand-gradient" x1="0" y1="0" x2="32" y2="32">
              <stop stop-color="#3b82f6" />
              <stop offset="1" stop-color="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div class="brand-text">
        <span class="brand-name">Zalo Delivery</span>
        <span class="brand-sub">Admin CMS</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <router-link
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ 'is-active': isActive(item.path) }"
      >
        <el-icon :size="20"><component :is="item.icon" /></el-icon>
        <span>{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <div class="system-status">
        <div class="status-dot" :class="isOnline ? 'online' : 'offline'" />
        <span>{{ isOnline ? 'System Online' : 'Offline' }}</span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  DataBoard,
  List,
  Van,
  TrendCharts,
} from '@element-plus/icons-vue'

const route = useRoute()
const isOnline = ref(true)

const menuItems = [
  { path: '/', label: 'Dashboard', icon: DataBoard },
  { path: '/orders', label: 'Đơn hàng', icon: List },
  { path: '/shippers', label: 'Shipper', icon: Van },
  { path: '/revenue', label: 'Doanh thu', icon: TrendCharts },
]

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-weight: 700;
  font-size: 16px;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}

.brand-sub {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: rgba(59, 130, 246, 0.08);
  color: var(--text-primary);
}

.nav-item.is-active {
  background: rgba(59, 130, 246, 0.15);
  color: var(--color-primary-light);
}

.nav-item.is-active .el-icon {
  color: var(--color-primary-light);
}

.sidebar-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

.system-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: var(--color-success);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.status-dot.offline {
  background: var(--text-muted);
}
</style>
