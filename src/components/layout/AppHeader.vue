<template>
  <header class="app-header">
    <div class="header-left">
      <h1 class="page-title">{{ pageTitle }}</h1>
    </div>
    <div class="header-right">
      <!-- Theme Toggle -->
      <div class="theme-toggle" @click="themeStore.toggleTheme" title="Chuyển chế độ tối/sáng">
        <el-icon :size="20" class="theme-icon">
          <Sunny v-if="themeStore.theme === 'light'" />
          <Moon v-else />
        </el-icon>
      </div>

      <!-- Notification Bell -->
      <div class="notification-wrapper" @click="toggleNotifications">
        <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99" class="notif-badge">
          <el-icon :size="22" class="notif-icon"><Bell /></el-icon>
        </el-badge>

        <!-- Notification Dropdown -->
        <transition name="fade">
          <div v-if="showDropdown" class="notif-dropdown" @click.stop>
            <div class="notif-header">
              <span class="notif-title">Thông báo</span>
              <el-button link type="primary" size="small" @click="store.markAllAsRead">
                Đọc tất cả
              </el-button>
            </div>
            <div class="notif-list">
              <div
                v-for="notif in store.notifications.slice(0, 10)"
                :key="notif.id"
                class="notif-item"
                :class="{ unread: !notif.read }"
                @click="handleNotifClick(notif)"
              >
                <div class="notif-icon-wrap" :class="'type-' + notif.type">
                  <span>{{ getNotifEmoji(notif.type) }}</span>
                </div>
                <div class="notif-content">
                  <div class="notif-text">{{ notif.title }}</div>
                  <div class="notif-time">{{ formatTimeAgo(notif.createdAt) }}</div>
                </div>
              </div>
              <div v-if="store.notifications.length === 0" class="notif-empty">
                Không có thông báo mới
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- User Avatar -->
      <div class="user-avatar">
        <div class="avatar-circle">A</div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bell, Sunny, Moon } from '@element-plus/icons-vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useThemeStore } from '@/stores/themeStore'
import type { AppNotification } from '@/types'

const route = useRoute()
const router = useRouter()
const store = useNotificationStore()
const themeStore = useThemeStore()
const showDropdown = ref(false)

const pageTitle = computed(() => {
  return (route.meta?.title as string) || 'Dashboard'
})

const unreadCount = computed(() => store.unreadCount)

function toggleNotifications() {
  showDropdown.value = !showDropdown.value
}

function handleNotifClick(notif: AppNotification) {
  store.markAsRead(notif.id)
  if (notif.orderId) {
    router.push({ name: 'orders', query: { viewOrder: notif.orderId } })
  }
  showDropdown.value = false
}

function getNotifEmoji(type: string): string {
  const emojis: Record<string, string> = {
    new_order: '📦',
    no_shipper: '⚠️',
    completed: '✅',
    failed: '❌',
    info: 'ℹ️',
  }
  return emojis[type] || '📌'
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  return `${Math.floor(hours / 24)} ngày trước`
}

// Close dropdown on outside click
function handleOutsideClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.notification-wrapper')) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
  store.init()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<style scoped>
.app-header {
  height: var(--header-height);
  background: var(--bg-header);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  position: sticky;
  top: 0;
  z-index: 50;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.notification-wrapper {
  position: relative;
  cursor: pointer;
}

.notif-icon {
  color: var(--text-secondary);
  transition: color 0.2s;
}

.notif-icon:hover {
  color: var(--text-primary);
}

.notif-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  right: -8px;
  width: 380px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  z-index: 200;
}

.notif-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.notif-title {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
}

.notif-list {
  max-height: 400px;
  overflow-y: auto;
}

.notif-item {
  display: flex;
  gap: 12px;
  padding: 14px 20px;
  cursor: pointer;
  transition: background 0.15s;
}

.notif-item:hover {
  background: var(--bg-card-hover);
}

.notif-item.unread {
  background: rgba(59, 130, 246, 0.06);
}

.notif-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  background: rgba(59, 130, 246, 0.1);
}

.type-new_order { background: rgba(59, 130, 246, 0.12); }
.type-no_shipper { background: rgba(245, 158, 11, 0.12); }
.type-completed { background: rgba(16, 185, 129, 0.12); }
.type-failed { background: rgba(239, 68, 68, 0.12); }

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-text {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.4;
}

.notif-time {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

.notif-empty {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.user-avatar {
  cursor: pointer;
}

.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: white;
}
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  transition: background-color 0.2s;
}

.theme-toggle:hover {
  background: var(--bg-card-hover);
}

.theme-icon {
  color: var(--text-secondary);
  transition: color 0.2s, transform 0.4s ease;
}

.theme-toggle:hover .theme-icon {
  color: var(--text-primary);
  transform: rotate(25deg);
}
</style>
