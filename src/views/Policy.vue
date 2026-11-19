<script setup>
// Policy.vue —— 4 政策服务专区：搜索 + 分类标签 + 政策卡片列表
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import NavBar from '../components/NavBar.vue'
import { store } from '../store/mock'

const router = useRouter()
const kw = ref('')
const cat = ref('全部')
const cats = ['全部', '学费减免资助', '专升本专项计划', '退役士兵考研专项', '优待证办理', '技能培训补贴']

// 关键词 + 分类双重过滤
const list = computed(() =>
  store.policies.filter(p =>
    (cat.value === '全部' || p.cat === cat.value) &&
    (!kw.value || p.title.includes(kw.value) || p.brief.includes(kw.value) || p.cat.includes(kw.value))
  )
)
</script>

<template>
  <NavBar title="政策服务专区" />
  <div class="page">
    <!-- 搜索框 -->
    <el-input v-model="kw" placeholder="搜索政策关键词，如：学费 / 专升本 / 考研" clearable style="margin-bottom:10px;">
      <template #prefix><el-icon><Search /></el-icon></template>
    </el-input>

    <!-- 分类标签 -->
    <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;">
      <el-check-tag v-for="c in cats" :key="c" :checked="cat === c" @change="cat = c" style="white-space:nowrap;">{{ c }}</el-check-tag>
    </div>

    <!-- 政策卡片列表 -->
    <div v-for="p in list" :key="p.id" class="rt-card" style="cursor:pointer;" @click="router.push('/policy/' + p.id)">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <div style="font-weight:700;font-size:14px;color:#1b2a4a;flex:1;">{{ p.title }}</div>
        <span class="rt-badge" style="white-space:nowrap;">{{ p.cat }}</span>
      </div>
      <p style="font-size:12px;color:#7a8698;line-height:1.7;margin:6px 0;">{{ p.brief }}</p>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#9aa4b2;">
        <span>发布时间：{{ p.time }}</span>
        <span style="color:#4a5d23;">查看详情 &gt;</span>
      </div>
    </div>
    <p v-if="!list.length" style="text-align:center;color:#9aa4b2;font-size:13px;">未找到相关政策，换个关键词试试。</p>
  </div>
</template>
