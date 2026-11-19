<script setup>
// PolicyDetail.vue —— 政策详情页：原文 + 申报材料 + 流程 + 截止提醒
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import NavBar from '../components/NavBar.vue'
import { store, fmtLeft } from '../store/mock'

const route = useRoute()
const router = useRouter()
const p = computed(() => store.policies.find(x => x.id === Number(route.params.id)) || store.policies[0])
const left = computed(() => fmtLeft(p.value.deadline))

function remind() { ElMessage.success('已设置申报截止提醒，截止前将通过消息通知提醒您') }
</script>

<template>
  <NavBar :title="p.title.length > 8 ? '政策详情' : p.title" />
  <div class="page">
    <div class="rt-card">
      <h3 class="rt-card-title">{{ p.title }}</h3>
      <div style="font-size:11px;color:#9aa4b2;margin-bottom:8px;">
        <span class="rt-badge">{{ p.cat }}</span>　发布时间：{{ p.time }}
      </div>
      <p style="font-size:13px;line-height:1.9;color:#3d4757;white-space:pre-line;">{{ p.content }}</p>
    </div>

    <div class="rt-card">
      <h3 class="rt-card-title">申报材料清单</h3>
      <div v-for="(d, i) in p.docs" :key="i" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <el-icon color="#4a5d23"><CircleCheck /></el-icon>
        <span style="font-size:13px;">{{ d }}</span>
      </div>
    </div>

    <div class="rt-card">
      <h3 class="rt-card-title">申报流程</h3>
      <el-steps direction="vertical" :active="p.steps.length" style="padding-left:4px;">
        <el-step v-for="(s, i) in p.steps" :key="i" :title="s" />
      </el-steps>
    </div>

    <div class="rt-card" style="background:#fdfaf2;">
      <el-icon color="#c9a44c"><AlarmClock /></el-icon>
      <b style="color:#8a6d1f;font-size:13px;margin-left:6px;">申报截止：{{ p.deadline }}</b>
      <p style="font-size:12px;color:#8a6d1f;margin:4px 0 8px;">距截止还有 {{ left }} 天，请提前准备材料。</p>
      <el-button type="warning" plain size="small" @click="remind">设置截止提醒</el-button>
    </div>
    <el-button style="width:100%;" @click="router.back()">返回政策列表</el-button>
  </div>
</template>
