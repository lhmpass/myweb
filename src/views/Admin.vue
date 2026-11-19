<script setup>
// Admin.vue —— 9 管理员后台：认证审核 / 公告管理 / 政策管理 / 帖子审核 / 工单回复 / 数据统计
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import NavBar from '../components/NavBar.vue'
import { store, addMsg, maskPhone } from '../store/mock'

const router = useRouter()

/* ===== 后台独立密码登录 ===== */
const unlocked = ref(false)          // 本次会话是否已通过后台密码校验
const pwd = ref('')
const ADMIN_PWD = 'rong2026'         // 后台登录密码（接入后端后改为服务端校验）
function unlock() {
  if (pwd.value === ADMIN_PWD) { unlocked.value = true; ElMessage.success('欢迎进入管理员后台') }
  else ElMessage.error('密码不正确')
}
const tab = ref('logs')

/* ===== 认证审核 ===== */
// 待审队列：用户提交的认证表单 + 已登记用户
const pendingAuths = computed(() => {
  const mine = store.authForm && store.user.verified === 'pending'
    ? [{ name: store.authForm.name, phone: store.authForm.phone, major: store.authForm.major, time: '刚刚', mine: true }]
    : []
  return [...store.adminSeed.users.map(u => ({ ...u, major: '—' })), ...mine]
})
function reviewAuth(u, pass) {
  if (u.mine) {
    store.user.verified = pass ? 'approved' : 'none'
    addMsg(store, { type: '认证', title: pass ? '认证已通过' : '认证未通过', text: pass ? '恭喜！您已解锁平台全部功能。' : '材料不全，请重新提交。' })
    ElMessage.success(pass ? '审核已通过' : '已驳回')
  } else {
    u.status = pass ? '已通过' : '已驳回'
    ElMessage.success('已更新')
  }
}

/* ===== 公告管理 ===== */
const noticeDialog = ref(false)
const noticeForm = ref({ title: '', tag: '武装部' })
function saveNotice() {
  if (!noticeForm.value.title.trim()) { ElMessage.warning('标题不能为空'); return }
  store.notices.unshift({ id: Date.now(), title: noticeForm.value.title, tag: noticeForm.value.tag, date: new Date().toISOString().slice(0, 10) })
  ElMessage.success('公告已发布'); noticeDialog.value = false; noticeForm.value.title = ''
}
function delNotice(n) {
  ElMessageBox.confirm(`确认删除公告「${n.title.slice(0, 12)}…」？`, '删除确认')
    .then(() => { const i = store.notices.indexOf(n); store.notices.splice(i, 1); ElMessage.success('已删除') })
    .catch(() => {})
}

/* ===== 政策管理 ===== */
function delPolicy(p) {
  ElMessageBox.confirm(`确认删除政策「${p.title.slice(0, 12)}…」？`, '删除确认')
    .then(() => { const i = store.policies.indexOf(p); store.policies.splice(i, 1); ElMessage.success('已删除') })
    .catch(() => {})
}
function editPolicy(p) { ElMessage.info(`编辑「${p.title.slice(0, 8)}…」政策信息`) }

/* ===== 帖子审核 ===== */
// 我的帖子视为"待审核"队列；种子帖也可撤回
function passPost(p, list) {
  const i = list.indexOf(p); list.splice(i, 1)
  if (list === store.myPosts) {
    // 审核通过：转为正式帖展示在社区
    store.posts.unshift({ ...p, status: 'approved', author: store.user.name, preview: p.content.slice(0, 40) + '…', likes: 0, liked: false, comments: [] })
    addMsg(store, { type: '社区', title: '帖子审核通过', text: `《${p.title}》已展示在社区。` })
  }
  ElMessage.success('已通过')
}
function rejectPost(p, list) {
  ElMessageBox.confirm('确认驳回该帖？', '驳回确认')
    .then(() => {
      const i = list.indexOf(p); list.splice(i, 1)
      if (list === store.myPosts) addMsg(store, { type: '社区', title: '帖子未通过审核', text: `《${p.title}》不符合社区规范，请修改后重发。` })
      ElMessage.success('已驳回')
    }).catch(() => {})
}

/* ===== 工单查看回复 ===== */
const replyDialog = ref(false)
const currentOrder = ref(null)
const replyText = ref('')
function openReply(o) { currentOrder.value = o; replyText.value = o.reply; replyDialog.value = true }
function saveReply() {
  currentOrder.value.reply = replyText.value
  currentOrder.value.status = '已办结'
  addMsg(store, { type: '帮扶申请', title: '工单已回复', text: currentOrder.value.reply })
  replyDialog.value = false; ElMessage.success('回复已发送，工单办结')
}
function setStatus(o, s) { o.status = s; ElMessage.success('状态已更新为 ' + s) }

/* ===== 登录记录 ===== */
const logKw = ref('')
const sortDesc = ref(true) // true=最近优先
// 按手机号聚合：展示最近一次登录 + 累计次数；支持搜索
const logSummary = computed(() => {
  const map = {}
  store.loginLogs.forEach(l => {
    const k = l.phone
    if (!map[k]) map[k] = { phone: k, last: l.time, ts: l.ts, count: 0, history: [] }
    map[k].count++
    map[k].history.push(l)
    if (l.ts > map[k].ts) { map[k].ts = l.ts; map[k].last = l.time }
  })
  let arr = Object.values(map)
  if (logKw.value) arr = arr.filter(u => u.phone.includes(logKw.value))
  arr.sort((a, b) => (sortDesc.value ? b.ts - a.ts : a.ts - b.ts))
  return arr
})
// 查看某手机号的完整登录历史
const historyOf = ref(null)
const historyVisibleControl = computed(() => !!historyOf.value)

// 手机号对应的身份认证状态（未登记手机号显示"未登记"）
function authStatusOf(phone) {
  if (store.authForm && store.authForm.phone === phone) {
    return { none: '未提交', pending: '审核中', approved: '已认证' }[store.user.verified]
  }
  const u = store.adminSeed.users.find(x => x.phone.replace(/\*+/g, '') && x.phone === maskPhone(phone))
  return u ? u.status : '未登记'
}

/* ===== 数据统计 ===== */
const statData = computed(() => ({
  registered: store.counters.registered + (store.user.verified === 'approved' ? 1 : 0),
  served: store.counters.served + store.helpOrders.length,
  posts: store.posts.length + store.myPosts.length,
  orders: store.helpOrders.length
}))
</script>

<template>
  <NavBar title="管理员后台" />
  <!-- 独立密码门禁：未通过校验不展示任何后台内容 -->
  <div v-if="!unlocked" class="page">
    <div class="rt-card" style="margin-top:20%;">
      <div style="text-align:center;margin-bottom:12px;">
        <el-icon :size="40" color="#1b2a4a"><Lock /></el-icon>
        <h3 style="color:#1b2a4a;margin:8px 0 4px;">管理员登录</h3>
        <p style="font-size:12px;color:#9aa4b2;margin:0;">请输入后台管理密码</p>
      </div>
      <el-input v-model="pwd" type="password" show-password placeholder="后台管理密码" @keyup.enter="unlock" />
      <el-button type="primary" size="large" style="width:100%;margin-top:12px;" @click="unlock">进入后台</el-button>
      <el-button style="width:100%;margin-top:4px;border:none;" @click="router.push('/profile')">返回个人中心</el-button>
    </div>
  </div>

  <div v-else class="page">
    <el-tabs v-model="tab">
      <!-- 登录记录 -->
      <el-tab-pane label="登录记录" name="logs">
        <div style="display:flex;gap:8px;margin-bottom:10px;">
          <el-input v-model="logKw" placeholder="按手机号搜索" clearable style="flex:1;">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-button @click="sortDesc = !sortDesc">{{ sortDesc ? '最近优先' : '最早优先' }}</el-button>
        </div>
        <div v-for="u in logSummary" :key="u.phone" class="rt-card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <b style="font-size:14px;color:#1b2a4a;">{{ maskPhone(u.phone) }}</b>
              <span style="font-size:11px;color:#9aa4b2;margin-left:8px;">登录 {{ u.count }} 次</span>
            </div>
            <el-tag size="small" type="success">正常</el-tag>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#7a8698;margin-top:4px;">
            <span>最近登录：{{ u.last }}</span>
            <span>认证状态：{{ authStatusOf(u.phone) }}</span>
          </div>
          <el-button size="small" type="primary" plain style="margin-top:8px;" @click="historyOf = u">查看登录历史</el-button>
        </div>
        <p v-if="!logSummary.length" style="text-align:center;color:#9aa4b2;font-size:13px;">暂无登录记录。</p>
      </el-tab-pane>

      <!-- 数据统计 -->
      <el-tab-pane label="数据统计" name="stats">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="rt-card" style="text-align:center;margin:0;">
            <div style="font-size:28px;font-weight:800;color:#1b2a4a;">{{ statData.registered }}</div>
            <div style="font-size:12px;color:#7a8698;">注册人数</div>
          </div>
          <div class="rt-card" style="text-align:center;margin:0;">
            <div style="font-size:28px;font-weight:800;color:#4a5d23;">{{ statData.served }}</div>
            <div style="font-size:12px;color:#7a8698;">帮扶人次</div>
          </div>
          <div class="rt-card" style="text-align:center;margin:0;">
            <div style="font-size:28px;font-weight:800;color:#8a6d1f;">{{ statData.posts }}</div>
            <div style="font-size:12px;color:#7a8698;">社区帖子</div>
          </div>
          <div class="rt-card" style="text-align:center;margin:0;">
            <div style="font-size:28px;font-weight:800;color:#2c4069;">{{ statData.orders }}</div>
            <div style="font-size:12px;color:#7a8698;">帮扶工单</div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 认证审核 -->
      <el-tab-pane label="认证审核" name="auth">
        <div v-for="(u, i) in pendingAuths" :key="i" class="rt-card">
          <b style="font-size:14px;color:#1b2a4a;">{{ u.name }}</b>
          <p style="font-size:12px;color:#7a8698;margin:4px 0;">{{ u.phone }} · {{ u.major }} · {{ u.time }}</p>
          <el-tag size="small" :type="u.status === '已通过' ? 'success' : 'warning'">{{ u.status || '待审核' }}</el-tag>
          <div style="margin-top:8px;" v-if="u.status !== '已通过'">
            <el-button size="small" type="primary" @click="reviewAuth(u, true)">通过</el-button>
            <el-button size="small" type="danger" plain @click="reviewAuth(u, false)">驳回</el-button>
          </div>
        </div>
        <p v-if="!pendingAuths.length" style="text-align:center;color:#9aa4b2;font-size:13px;">暂无待审核申请。</p>
      </el-tab-pane>

      <!-- 公告管理 -->
      <el-tab-pane label="公告管理" name="notice">
        <el-button type="primary" style="margin-bottom:10px;" @click="noticeDialog = true">新增公告</el-button>
        <div v-for="n in store.notices" :key="n.id" class="rt-card" style="display:flex;align-items:center;gap:8px;">
          <span class="rt-badge" style="white-space:nowrap;">{{ n.tag }}</span>
          <span style="flex:1;font-size:13px;">{{ n.title }}</span>
          <el-button size="small" type="danger" plain @click="delNotice(n)">删除</el-button>
        </div>
      </el-tab-pane>

      <!-- 政策管理 -->
      <el-tab-pane label="政策管理" name="policy">
        <div v-for="p in store.policies" :key="p.id" class="rt-card" style="display:flex;align-items:center;gap:8px;">
          <span class="rt-badge" style="white-space:nowrap;">{{ p.cat }}</span>
          <span style="flex:1;font-size:13px;">{{ p.title }}</span>
          <el-button size="small" @click="editPolicy(p)">编辑</el-button>
          <el-button size="small" type="danger" plain @click="delPolicy(p)">删除</el-button>
        </div>
      </el-tab-pane>

      <!-- 帖子审核 -->
      <el-tab-pane label="帖子审核" name="post">
        <h4 style="color:#1b2a4a;margin:6px 0;">待审核（{{ store.myPosts.length }}）</h4>
        <div v-for="p in store.myPosts" :key="p.id" class="rt-card">
          <b style="font-size:14px;color:#1b2a4a;">{{ p.title }}</b>
          <p style="font-size:12px;color:#7a8698;margin:4px 0;">{{ p.content }}</p>
          <el-button size="small" type="primary" @click="passPost(p, store.myPosts)">通过</el-button>
          <el-button size="small" type="danger" plain @click="rejectPost(p, store.myPosts)">驳回</el-button>
        </div>
        <h4 style="color:#1b2a4a;margin:14px 0 6px;">已发布帖子（{{ store.posts.length }}）</h4>
        <div v-for="p in store.posts" :key="p.id" class="rt-card" style="display:flex;align-items:center;gap:8px;">
          <span style="flex:1;font-size:13px;">{{ p.title }}</span>
          <el-button size="small" type="danger" plain @click="rejectPost(p, store.posts)">撤回</el-button>
        </div>
      </el-tab-pane>

      <!-- 帮扶工单 -->
      <el-tab-pane label="帮扶工单" name="order">
        <div v-for="o in store.helpOrders" :key="o.id" class="rt-card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <b style="font-size:14px;color:#1b2a4a;">{{ o.cat }} · {{ o.id }}</b>
            <el-tag size="small" :type="o.status === '已办结' ? 'success' : 'warning'">{{ o.status }}</el-tag>
          </div>
          <p style="font-size:12px;color:#7a8698;margin:6px 0;">{{ o.desc }}<br />联系方式：{{ o.phone }}</p>
          <el-button size="small" type="primary" @click="openReply(o)">查看 / 回复</el-button>
          <el-button v-if="o.status !== '处理中'" size="small" @click="setStatus(o, '处理中')">标记处理中</el-button>
        </div>
        <p v-if="!store.helpOrders.length" style="text-align:center;color:#9aa4b2;font-size:13px;">暂无工单。</p>
      </el-tab-pane>
    </el-tabs>

    <!-- 公告新增对话框 -->
    <el-dialog v-model="noticeDialog" title="新增公告" width="90%">
      <el-input v-model="noticeForm.title" placeholder="公告标题" />
      <div style="margin-top:10px;">
        <span style="font-size:12px;color:#7a8698;margin-right:8px;">类型：</span>
        <el-radio-group v-model="noticeForm.tag">
          <el-radio value="武装部">武装部</el-radio>
          <el-radio value="申报提醒">申报提醒</el-radio>
          <el-radio value="活动通知">活动通知</el-radio>
        </el-radio-group>
      </div>
      <template #footer>
        <el-button @click="noticeDialog = false">取消</el-button>
        <el-button type="primary" @click="saveNotice">发布</el-button>
      </template>
    </el-dialog>

    <!-- 工单回复对话框 -->
    <el-dialog v-model="replyDialog" title="工单回复" width="90%">
      <p v-if="currentOrder" style="font-size:13px;color:#3d4757;">{{ currentOrder.desc }}</p>
      <el-input v-model="replyText" type="textarea" :rows="3" placeholder="输入回复内容" />
      <template #footer>
        <el-button @click="replyDialog = false">取消</el-button>
        <el-button type="primary" @click="saveReply">发送并办结</el-button>
      </template>
    </el-dialog>
    <!-- 登录历史对话框 -->
    <el-dialog v-if="historyOf" v-model="historyVisibleControl" :title="maskPhone(historyOf.phone) + ' 的登录历史'" width="90%" @closed="historyOf = null">
      <div v-for="(l, i) in historyOf.history" :key="i" style="border-bottom:1px dashed #e8eae4;padding:8px 0;font-size:13px;display:flex;justify-content:space-between;">
        <span>{{ l.time }}</span>
        <el-tag size="small" type="success">{{ l.status }}</el-tag>
      </div>
      <p style="font-size:11px;color:#9aa4b2;margin-top:8px;">共 {{ historyOf.history.length }} 条记录，按时间倒序展示。</p>
    </el-dialog>
  </div>
</template>
