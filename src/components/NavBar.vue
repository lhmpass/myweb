<script setup>
// NavBar.vue —— 顶部标题栏 + 面包屑导航
// 用法：<NavBar title="学业帮扶" />；路由 meta 里有 parent 时自动显示二级面包屑
import { useRoute, useRouter } from 'vue-router'
const props = defineProps({ title: { type: String, required: true } })
const route = useRoute()
const router = useRouter()
</script>

<template>
  <header class="rt-navbar">
    <div style="display:flex;align-items:center;">
      <el-icon v-if="route.path !== '/'" class="back" @click="router.back()"><ArrowLeftBold /></el-icon>
      <h1>{{ props.title }}</h1>
    </div>
    <div class="crumb">
      首页
      <template v-if="route.meta.parent"> / {{ route.meta.parent }}</template>
      / {{ props.title }}
    </div>
  </header>
</template>
