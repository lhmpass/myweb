<script setup>
// App.vue —— 根组件：路由出口 + 底部标签栏
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
const route = useRoute()
const router = useRouter()

const tabs = [
  { key: 'home', label: '首页', icon: 'HomeFilled', to: '/' },
  { key: 'help', label: '帮扶', icon: 'Compass', to: '/study' },
  { key: 'policy', label: '政策', icon: 'Document', to: '/policy' },
  { key: 'community', label: '战友圈', icon: 'ChatDotRound', to: '/community' },
  { key: 'profile', label: '我的', icon: 'User', to: '/profile' }
]
const activeTab = computed(() => route.meta.tab || '')
const showTabbar = computed(() => !route.meta.hideTabbar)
</script>

<template>
  <router-view />
  <nav v-if="showTabbar" class="rt-tabbar">
    <div v-for="t in tabs" :key="t.key" class="tab" :class="{ on: activeTab === t.key }" @click="router.push(t.to)">
      <el-icon><component :is="t.icon" /></el-icon>
      {{ t.label }}
    </div>
  </nav>
</template>
