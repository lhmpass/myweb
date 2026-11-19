<script setup>
// PostDetail.vue —— 帖子详情：正文 + 评论 + 点赞
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import NavBar from '../components/NavBar.vue'
import { store, guard } from '../store/mock'

const route = useRoute()
const router = useRouter()
const p = computed(() =>
  store.posts.find(x => x.id === Number(route.params.id)) ||
  store.myPosts.find(x => x.id === Number(route.params.id)) || null
)

const input = ref('')
function send() {
  if (!guard(ElMessageBox)) return
  if (!input.value.trim()) { ElMessage.warning('请输入评论内容'); return }
  p.value.comments.push({ user: store.user.name || '我', text: input.value.trim(), time: '刚刚' })
  input.value = ''
  ElMessage.success('评论成功')
}
function like() {
  if (!guard(ElMessage)) return
  p.value.liked = !p.value.liked
  p.value.likes += p.value.liked ? 1 : -1
}
</script>

<template>
  <NavBar title="帖子详情" />
  <div class="page" v-if="p">
    <div class="rt-card">
      <h3 class="rt-card-title" style="border-left-color:#1b2a4a;">{{ p.title }}</h3>
      <div style="font-size:11px;color:#9aa4b2;margin-bottom:8px;">发布人：{{ p.author || '我' }} · {{ p.time }}</div>
      <p style="font-size:14px;line-height:1.9;color:#3d4757;">{{ p.content }}</p>
      <el-button size="small" :type="p.liked ? 'warning' : 'default'" @click="like">
        <el-icon style="margin-right:4px;"><CaretTop /></el-icon> 点赞 {{ p.likes }}
      </el-button>
    </div>

    <div class="rt-card">
      <h3 class="rt-card-title">评论（{{ p.comments.length }}）</h3>
      <div v-for="(c, i) in p.comments" :key="i" style="border-bottom:1px dashed #e8eae4;padding:8px 0;">
        <div style="font-size:12px;color:#4a5d23;font-weight:700;">{{ c.user }} <span style="color:#9aa4b2;font-weight:400;">{{ c.time }}</span></div>
        <p style="font-size:13px;color:#3d4757;margin:4px 0 0;">{{ c.text }}</p>
      </div>
      <p v-if="!p.comments.length" style="color:#9aa4b2;font-size:13px;text-align:center;">还没有评论，来抢沙发</p>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <el-input v-model="input" placeholder="友善交流，文明发言" @keyup.enter="send" />
        <el-button type="primary" @click="send">发送</el-button>
      </div>
    </div>
  </div>
  <div v-else class="page"><p style="text-align:center;color:#9aa4b2;">帖子不存在</p></div>
</template>
