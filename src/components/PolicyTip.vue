<script setup>
// PolicyTip.vue —— 首页板块3：政策小贴士（每次进入随机换一条）
import { ref, onMounted } from 'vue'
import { store } from '../store/mock'
const tip = ref('')
onMounted(() => {
  tip.value = store.tips[Math.floor(Math.random() * store.tips.length)]
})
</script>

<template>
  <div class="rt-card" style="background:#f7f8f3;">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
      <el-icon color="#4a5d23"><InfoFilled /></el-icon>
      <span class="rt-badge">政策小贴士</span>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.7;color:#3d4757;">{{ tip }}</p>
  </div>
</template>
