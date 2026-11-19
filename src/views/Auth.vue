<script setup>
// Auth.vue —— 2 身份认证：表单 + 证件图片上传 + 提交后"待审核"
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import NavBar from '../components/NavBar.vue'
import { store, isVerified } from '../store/mock'

const router = useRouter()

const form = reactive({
  name: '',
  sno: '',
  phone: '',
  major: '',
  serviceTime: '',     // 服役时间段
  retireCert: null,    // 退役证图片
  studentCert: null    // 学生证图片
})
const rules = {
  name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  sno: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  major: [{ required: true, message: '请输入学院/专业', trigger: 'blur' }],
  serviceTime: [{ required: true, message: '请填写服役时间段', trigger: 'blur' }]
}
const formRef = ref(null)

// 权限状态文案
const statusText = computed(() => ({
  none: '尚未认证：可浏览公告与公开政策，认证通过后解锁学业帮扶、战友社区、帮扶申请等全部功能。',
  pending: '审核中：管理员正在核验您提交的材料，通常 1—2 个工作日出结果，结果将通过消息通知告知。',
  approved: '已通过认证：您已解锁平台全部功能。'
}[store.user.verified]))

async function submit() {
  try { await formRef.value.validate() } catch { return }
  if (!form.retireCert || !form.studentCert) {
    ElMessage.warning('请上传退役证与学生证照片')
    return
  }
  store.authForm = JSON.parse(JSON.stringify(form))
  store.user.verified = 'pending'
  store.user.name = form.name
  ElMessage.success('提交成功，等待管理员审核')
}

function onRetire(file) { form.retireCert = file.name; return false }
function onStudent(file) { form.studentCert = file.name; return false }
</script>

<template>
  <NavBar title="身份认证" />
  <div class="page">
    <!-- 当前状态 -->
    <div class="rt-card" style="border-left:3px solid #4a5d23;">
      <span class="rt-badge">认证状态</span>
      <p style="font-size:13px;line-height:1.7;margin:8px 0 0;color:#3d4757;">{{ statusText }}</p>
    </div>

    <!-- 已通过：显示凭证卡片 -->
    <div v-if="isVerified()" class="rt-card" style="text-align:center;">
      <el-icon :size="40" color="#4a5d23"><CircleCheckFilled /></el-icon>
      <h3 style="color:#1b2a4a;margin:8px 0 4px;">{{ store.user.name }} · 已认证退役复学学子</h3>
      <el-button type="primary" plain @click="router.push('/study')">进入学业帮扶</el-button>
    </div>

    <!-- 认证表单 -->
    <el-form v-else-if="store.user.verified !== 'pending'" ref="formRef" :model="form" :rules="rules" label-position="top">
      <div class="rt-card">
        <h3 class="rt-card-title">基本信息</h3>
        <el-form-item label="姓名" prop="name"><el-input v-model="form.name" placeholder="与退役证一致" /></el-form-item>
        <el-form-item label="学号" prop="sno"><el-input v-model="form.sno" placeholder="如 20243001" /></el-form-item>
        <el-form-item label="手机号" prop="phone"><el-input v-model="form.phone" maxlength="11" type="tel" /></el-form-item>
        <el-form-item label="学院 / 专业" prop="major"><el-input v-model="form.major" placeholder="如 计算机学院 软件工程" /></el-form-item>
        <el-form-item label="服役时间段" prop="serviceTime">
          <el-input v-model="form.serviceTime" placeholder="如 2024.09 — 2026.09" />
        </el-form-item>
      </div>
      <div class="rt-card">
        <h3 class="rt-card-title">证件材料上传（必传）</h3>
        <el-form-item label="退役证照片">
          <el-upload :show-file-list="true" :auto-upload="false" :limit="1" :on-change="onRetire" accept="image/*">
            <el-button size="small">选择图片</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="学生证照片">
          <el-upload :show-file-list="true" :auto-upload="false" :limit="1" :on-change="onStudent" accept="image/*">
            <el-button size="small">选择图片</el-button>
          </el-upload>
        </el-form-item>
        <p style="font-size:11px;color:#9aa4b2;margin:0;">* 证件材料仅作登记存档，提交后进入"审核中"状态，由管理员人工核验。</p>
      </div>
      <el-button type="primary" size="large" style="width:100%;" @click="submit">提交认证申请</el-button>
    </el-form>

    <!-- 待审核占位 -->
    <div v-else class="rt-card" style="text-align:center;">
      <el-icon :size="40" color="#c9a44c"><Loading /></el-icon>
      <h3 style="color:#1b2a4a;">材料已提交，等待管理员审核</h3>
      <p style="font-size:12px;color:#9aa4b2;">审核结果将在【个人中心 - 消息通知】中展示。</p>
    </div>
  </div>
</template>
