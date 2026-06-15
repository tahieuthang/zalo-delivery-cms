import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<'dark' | 'light'>((localStorage.getItem('theme') as 'dark' | 'light') || 'dark')

  function init() {
    applyTheme()
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', theme.value)
    applyTheme()
  }

  function applyTheme() {
    const root = document.documentElement
    if (theme.value === 'light') {
      root.classList.add('light')
      root.classList.remove('dark')
    } else {
      root.classList.add('dark')
      root.classList.remove('light')
    }
  }

  return {
    theme,
    init,
    toggleTheme,
  }
})
