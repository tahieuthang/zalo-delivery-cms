<template>
  <div :class="themeStore.theme">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useThemeStore } from '@/stores/themeStore'

const themeStore = useThemeStore()

onMounted(() => {
  themeStore.init()
})
</script>

