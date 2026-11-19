<script setup>
// Login.vue —— 手机号 + 验证码登录页（全站入口，登录成功后写入本地会话并记录登录日志）
import { reactive, ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { addLoginLog } from '../store/mock'

const router = useRouter()
const form = reactive({ phone: '', code: '' })
const formRef = ref(null)
const rules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '验证码为 6 位数字', trigger: 'blur' }
  ]
}

/* 验证码倒计时（当前版本测试验证码固定为 123456，接入短信服务后改为实时下发） */
const seconds = ref(0)
let timer = null
function sendCode() {
  if (!/^1[3-9]\d{9}$/.test(form.phone)) { ElMessage.warning('请先输入正确的手机号'); return }
  seconds.value = 60
  timer = setInterval(() => { seconds.value--; if (seconds.value <= 0) clearInterval(timer) }, 1000)
  ElMessage.success('验证码已发送（本平台测试验证码：123456）')
}
onUnmounted(() => clearInterval(timer))

async function login() {
  try { await formRef.value.validate() } catch { return }
  if (form.code !== '123456') { ElMessage.error('验证码不正确'); return }
  // 写入本地会话 + 登录日志，随后进入首页
  localStorage.setItem('rongtu_session', JSON.stringify({ phone: form.phone, time: Date.now() }))
  addLoginLog(form.phone)
  ElMessage.success('登录成功')
  router.replace('/')
}
</script>

<template>
  <div style="min-height:100vh;background:linear-gradient(160deg,#1b2a4a 0%,#2c4069 55%,#4a5d23 100%);display:flex;flex-direction:column;justify-content:center;padding:24px;">
    <div style="text-align:center;color:#fff;margin-bottom:24px;">
      <div style="font-size:34px;font-weight:800;letter-spacing:2px;">戎途助学</div>
      <div style="font-size:13px;color:#cfd8e8;margin-top:6px;">退役复学学子帮扶平台 · 退伍不褪色 复学再出发</div>
    </div>

    <div style="background:#fff;border-radius:12px;padding:20px 16px;box-shadow:0 8px 24px rgba(0,0,0,.25);">
      <h2 style="margin:0 0 14px;font-size:17px;color:#1b2a4a;">手机号登录</h2>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @keyup.enter="login">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" type="tel" maxlength="11" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="验证码" prop="code">
          <div style="display:flex;gap:8px;width:100%;">
            <el-input v-model="form.code" maxlength="6" placeholder="6 位验证码" style="flex:1;" />
            <el-button :disabled="seconds > 0" @click="sendCode">{{ seconds > 0 ? seconds + 's 后重发' : '获取验证码' }}</el-button>
          </div>
        </el-form-item>
        <el-button type="primary" size="large" style="width:100%;" @click="login">登 录</el-button>
      </el-form>
      <p style="font-size:11px;color:#9aa4b2;margin:12px 0 0;line-height:1.7;">
        未注册手机号登录后将自动创建账号；登录即代表同意平台服务协议与隐私政策。
      </p>
    </div>
  </div>
</template>
