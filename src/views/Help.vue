<script setup>
// Help.vue —— 7 帮扶申请中心：三类申请 + 表单 + 进度查看（待审核/处理中/已办结）
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import NavBar from '../components/NavBar.vue'
import { store, guard, isVerified, addMsg } from '../store/mock'

const tab = ref('apply')
const cats = [
  { key: '学业帮扶', icon: 'Reading', desc: '课程跟不上、考试复习需要战友支援' },
  { key: '心理疏导帮扶', icon: 'Sunny', desc: '复学适应、情绪压力，一对一倾听陪伴' },
  { key: '生活困难帮扶', icon: 'House', desc: '住宿、勤工俭学、临时困难补助对接' }
]
const form = reactive({ cat: '学业帮扶', desc: '', phone: '' })
const rules = {
  desc: [{ required: true, message: '请描述您遇到的问题', trigger: 'blur' }, { min: 10, message: '描述至少 10 个字，便于管理员了解情况', trigger: 'blur' }],
  phone: [
    { required: true, message: '请填写联系方式', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ]
}
const formRef = ref(null)
const catTag = s => ({ 待审核: 'info', 处理中: 'warning', 已办结: 'success' }[s])

async function submit() {
  if (!guard(ElMessageBox)) return
  try { await formRef.value.validate() } catch { return }
  store.helpOrders.unshift({
    id: 'H' + Date.now().toString().slice(-6),
    cat: form.cat, desc: form.desc, phone: form.phone,
    status: '待审核', reply: '', time: new Date().toLocaleString('zh-CN', { hour12: false })
  })
  addMsg(store, { type: '帮扶申请', title: '申请已提交', text: `【${form.cat}】申请已提交，管理员将在 1 个工作日内审核。` })
  ElMessage.success('提交成功，可在"我的申请"中查看进度')
  form.desc = ''
  tab.value = 'progress'
}
</script>

<template>
  <NavBar title="帮扶申请中心" />
  <div class="page">
    <el-tabs v-model="tab">
      <!-- 提交申请 -->
      <el-tab-pane label="提交申请" name="apply">
        <div class="rt-card">
          <h3 class="rt-card-title">申请分类</h3>
          <div style="display:grid;gap:8px;">
            <div v-for="c in cats" :key="c.key"
                 style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;cursor:pointer;border:1px solid;"
                 :style="form.cat === c.key ? 'border-color:#1b2a4a;background:#f0f3f9;' : 'border-color:#e8eae4;background:#fff;'"
                 @click="form.cat = c.key">
              <el-icon :size="20" color="#4a5d23"><component :is="c.icon" /></el-icon>
              <div>
                <div style="font-size:13px;font-weight:700;color:#1b2a4a;">{{ c.key }}</div>
                <div style="font-size:11px;color:#7a8698;">{{ c.desc }}</div>
              </div>
            </div>
          </div>
        </div>
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
          <div class="rt-card">
            <el-form-item label="问题描述" prop="desc">
              <el-input v-model="form.desc" type="textarea" :rows="4" placeholder="请具体描述遇到的困难，管理员会据此安排帮扶" />
            </el-form-item>
            <el-form-item label="联系方式" prop="phone"><el-input v-model="form.phone" maxlength="11" type="tel" placeholder="手机号" /></el-form-item>
            <el-button type="primary" size="large" style="width:100%;" @click="submit">提交申请</el-button>
          </div>
        </el-form>
      </el-tab-pane>

      <!-- 我的申请进度 -->
      <el-tab-pane label="我的申请" name="progress">
        <div v-for="o in store.helpOrders" :key="o.id" class="rt-card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <b style="font-size:14px;color:#1b2a4a;">{{ o.cat }}</b>
            <el-tag size="small" :type="catTag(o.status)">{{ o.status }}</el-tag>
          </div>
          <p style="font-size:12px;color:#7a8698;margin:6px 0;">{{ o.desc }}</p>
          <div style="font-size:11px;color:#9aa4b2;">单号 {{ o.id }} · 提交于 {{ o.time }}</div>
          <div v-if="o.reply" style="font-size:12px;color:#4a5d23;background:#f4f7ee;border-radius:6px;padding:8px;margin-top:8px;">
            <b>管理员回复：</b>{{ o.reply }}
          </div>
        </div>
        <p v-if="!store.helpOrders.length" style="text-align:center;color:#9aa4b2;font-size:13px;">还没有申请记录，遇到困难请及时提交。</p>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
