<script setup>
// Profile.vue —— 8 个人中心：认证状态卡 + 功能菜单 + 消息通知
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import NavBar from '../components/NavBar.vue'
import { store, isVerified, maskPhone } from '../store/mock'

const router = useRouter()
/* 当前登录手机号（来自登录会话） */
const sessionPhone = computed(() => {
  try { return maskPhone(JSON.parse(localStorage.getItem('rongtu_session') || '{}').phone) } catch { return '' }
})
const statusMap = { none: ['尚未认证', 'warning'], pending: ['审核中', 'info'], approved: ['已认证', 'success'] }
const status = computed(() => statusMap[store.user.verified])

/* 各菜单项点击：跳转或弹出对应数据 */
const unread = computed(() => store.messages.filter(m => !m.read).length)

function goAuth() { router.push('/auth') }
function goApply() { router.push('/help-apply') }

function showFavs() {
  const list = store.materials.filter(m => store.favorites.includes(m.id))
  ElMessageBox.alert(
    list.length ? list.map(m => `· ${m.title}（${m.cat}）`).join('<br>') : '暂无收藏，去【学业帮扶-资料库】收藏资料吧。',
    '我的收藏', { dangerouslyUseHTMLString: true })
}
function showAppts() {
  const a = store.appointments, b = store.buddyApps, t = store.trainingApps
  ElMessageBox.alert(
    [a.length ? a.map(x => `· 答疑预约：${x.subject} ${x.date} ${x.slot}（${x.status}）`).join('<br>') : '',
     b.length ? b.map(x => `· 结对申请：${x.subject} → ${x.volunteer}`).join('<br>') : '',
     t.length ? t.map(x => `· 培训报名：${x.title}`).join('<br>') : ''].filter(Boolean).join('<br>') || '暂无预约/报名记录。',
    '我的预约', { dangerouslyUseHTMLString: true })
}
function showOrders() { router.push('/help-apply') }
function showPosts() {
  ElMessageBox.alert(
    store.myPosts.length ? store.myPosts.map(p => `· 《${p.title}》— 审核中`).join('<br>') : '暂无发帖记录。',
    '我的发帖', { dangerouslyUseHTMLString: true })
}
function feedback() {
  ElMessageBox.prompt('请输入您的意见或建议：', '意见反馈', { inputPattern: /\S/, inputErrorMessage: '内容不能为空' })
    .then(({ value }) => { addMsg(store, { type: '反馈', title: '反馈已收到', text: value }); ElMessage.success('感谢您的反馈！') })
    .catch(() => {})
}

/* 消息通知抽屉 */
const drawer = ref(false)
function openMsg() { drawer.value = true; store.messages.forEach(m => { m.read = true }) }
function markAll() { ElMessage.success('已全部标为已读') }
</script>

<template>
  <NavBar title="个人中心" />
  <div class="page">
    <!-- 用户信息卡 -->
    <div class="rt-banner" style="display:flex;align-items:center;gap:14px;">
      <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;">
        <el-icon :size="28"><UserFilled /></el-icon>
      </div>
      <div style="flex:1;">
        <div style="font-size:16px;font-weight:700;">{{ store.user.name }}</div>
        <div style="font-size:12px;color:#cfd8e8;margin-top:2px;">退役复学学子{{ sessionPhone ? ' · ' + sessionPhone : '' }}</div>
      </div>
      <el-tag :type="status[1]" effect="dark" size="small">认证状态：{{ status[0] }}</el-tag>
    </div>
    <el-button v-if="store.user.verified !== 'approved'" type="primary" style="width:100%;margin-top:10px;" @click="goAuth">
      {{ store.user.verified === 'pending' ? '查看认证进度' : '立即身份认证' }}
    </el-button>

    <!-- 功能菜单 -->
    <div class="rt-card" style="margin-top:12px;">
      <h3 class="rt-card-title">我的服务</h3>
      <div v-for="m in [
        { label: '我的收藏', icon: 'Star', fn: showFavs },
        { label: '我的预约', icon: 'Calendar', fn: showAppts },
        { label: '我的帮扶申请', icon: 'HandsUp', fn: showOrders },
        { label: '我的发帖', icon: 'EditPen', fn: showPosts },
        { label: '消息通知', icon: 'Bell', fn: openMsg, badge: unread },
        { label: '意见反馈', icon: 'ChatLineSquare', fn: feedback }
      ]" :key="m.label"
        style="display:flex;align-items:center;padding:12px 2px;border-bottom:1px solid #f0f2ec;cursor:pointer;"
        @click="m.fn">
        <el-icon color="#4a5d23"><component :is="m.icon" /></el-icon>
        <span style="flex:1;margin-left:10px;font-size:14px;">{{ m.label }}</span>
        <el-badge v-if="m.badge" :value="m.badge" :max="9">
          <span style="width:1px;height:1px;display:block;"></span>
        </el-badge>
        <el-icon color="#c4c9c0"><ArrowRight /></el-icon>
      </div>
    </div>

    <!-- 管理后台入口 -->
    <div class="rt-card" style="text-align:center;">
      <el-button type="info" plain style="width:100%;" @click="router.push('/admin')">
        <el-icon style="margin-right:6px;"><Setting /></el-icon> 管理员后台入口
      </el-button>
    </div>

    <!-- 消息抽屉 -->
    <el-drawer v-model="drawer" title="消息通知" size="80%">
      <div v-for="m in store.messages" :key="m.id" style="border-bottom:1px dashed #e8eae4;padding:10px 0;">
        <div style="display:flex;justify-content:space-between;">
          <b style="font-size:13px;color:#1b2a4a;">【{{ m.type }}】{{ m.title }}</b>
        </div>
        <p style="font-size:12px;color:#3d4757;margin:4px 0;">{{ m.text }}</p>
        <span style="font-size:11px;color:#9aa4b2;">{{ m.time }}</span>
      </div>
      <el-button v-if="store.messages.length" style="width:100%;margin-top:12px;" @click="markAll">全部已读</el-button>
    </el-drawer>
  </div>
</template>
