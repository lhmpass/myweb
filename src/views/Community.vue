<script setup>
// Community.vue —— 6 战友互助社区：帖子列表 + 发帖（提交后待审核）
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import NavBar from '../components/NavBar.vue'
import { store, guard, addMsg } from '../store/mock'

const router = useRouter()
const tab = ref('list')

/* 已审核通过的帖子 = 平台帖子 + 我发帖中已通过审核的 */
const approved = computed(() => store.posts.filter(p => p.status === 'approved'))

/* 发帖 */
const form = reactive({ title: '', content: '' })
const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }, { max: 30, message: '标题不超过 30 字', trigger: 'blur' }],
  content: [{ required: true, message: '请输入正文', trigger: 'blur' }, { min: 10, message: '正文至少 10 个字', trigger: 'blur' }]
}
const formRef = ref(null)
async function submitPost() {
  if (!guard(ElMessageBox)) return
  try { await formRef.value.validate() } catch { return }
  const post = { id: Date.now(), title: form.title, content: form.content, status: 'pending', time: new Date().toLocaleString('zh-CN', { hour12: false }), likes: 0, comments: [] }
  store.myPosts.unshift(post)
  addMsg(store, { type: '社区', title: '帖子已提交', text: `《${form.title}》已提交，管理员审核通过后将展示在社区。` })
  ElMessage.success('提交成功，等待管理员审核')
  form.title = ''; form.content = ''
  tab.value = 'list'
}

function like(p) {
  if (!guard(ElMessage)) return
  p.liked = !p.liked
  p.likes += p.liked ? 1 : -1
}
</script>

<template>
  <NavBar title="战友互助社区" />
  <div class="page">
    <el-tabs v-model="tab">
      <!-- 帖子列表 -->
      <el-tab-pane label="帖子列表" name="list">
        <div v-for="p in approved" :key="p.id" class="rt-card" style="cursor:pointer;" @click="router.push('/post/' + p.id)">
          <div style="font-weight:700;font-size:14px;color:#1b2a4a;">{{ p.title }}</div>
          <p style="font-size:12px;color:#7a8698;margin:6px 0;">{{ p.preview }}</p>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#9aa4b2;">
            <span>发布人：{{ p.author }} · {{ p.time }}</span>
            <span style="color:#4a5d23;">
              <el-icon style="vertical-align:-2px;"><ChatDotRound /></el-icon> {{ p.comments.length }}
              <el-icon style="vertical-align:-2px;margin-left:8px;"><CaretTop /></el-icon> {{ p.likes }}
            </span>
          </div>
        </div>
        <div v-for="p in store.myPosts" :key="p.id" class="rt-card" style="opacity:.75;">
          <div style="font-weight:700;font-size:14px;color:#1b2a4a;">{{ p.title }}</div>
          <span class="rt-badge" style="background:#fdf3e0;color:#8a6d1f;">审核中，通过后将展示</span>
        </div>
      </el-tab-pane>

      <!-- 发帖 -->
      <el-tab-pane label="发布帖子" name="new">
        <div class="rt-card">
          <p style="font-size:12px;color:#8a6d1f;background:#fdfaf2;border-radius:6px;padding:8px;margin:0 0 10px;">
            * 社区坚持正能量交流，发帖需经管理员审核通过后才会展示。
          </p>
          <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
            <el-form-item label="标题" prop="title"><el-input v-model="form.title" maxlength="30" show-word-limit placeholder="一句话概括你想分享的内容" /></el-form-item>
            <el-form-item label="正文" prop="content">
              <el-input v-model="form.content" type="textarea" :rows="5" placeholder="分享复学经验、提问求助、聊聊军旅故事…" />
            </el-form-item>
            <el-button type="primary" style="width:100%;" @click="submitPost">提交（待审核）</el-button>
          </el-form>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
