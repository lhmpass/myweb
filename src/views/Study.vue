<script setup>
// Study.vue —— 3 学业帮扶：资料库 / 结对帮扶 / 答疑预约 / 学习打卡（四个标签页）
import { reactive, ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import NavBar from '../components/NavBar.vue'
import { store, guard, isVerified, addMsg, fmtLeft } from '../store/mock'

const tab = ref('lib')

/* ===== 资料库 ===== */
const cats = ['全部', '期末课件', '专升本备考', '习题笔记']
const cat = ref('全部')
const list = computed(() => cat.value === '全部' ? store.materials : store.materials.filter(m => m.cat === cat.value))

function toggleFav(m) {
  if (!guard(ElMessageBox)) return
  const i = store.favorites.indexOf(m.id)
  if (i >= 0) { store.favorites.splice(i, 1); ElMessage('已取消收藏') }
  else { store.favorites.push(m.id); ElMessage.success('已收藏，可在个人中心查看') }
}
function detail(m) {
  ElMessageBox.alert(`${m.desc}<br><br>分类：${m.cat}　大小：${m.size}　更新：${m.time}`,
    m.title, { dangerouslyUseHTMLString: true, confirmButtonText: '关闭' })
}
function download(m) {
  if (!guard(ElMessageBox)) return
  ElMessage.success(`正在下载《${m.title}》，请稍候…`)
}

/* ===== 结对帮扶申请 ===== */
const buddyForm = reactive({ subject: '', grade: '', desc: '' })
const buddyRef = ref(null)
const buddyRules = {
  subject: [{ required: true, message: '请选择帮扶科目', trigger: 'change' }],
  desc: [{ required: true, message: '请描述您的困难', trigger: 'blur' }]
}
async function submitBuddy() {
  if (!guard(ElMessageBox)) return
  try { await buddyRef.value.validate() } catch { return }
  // 从志愿者池匹配帮扶战友
  const v = store.volunteers[Math.floor(Math.random() * store.volunteers.length)]
  store.buddyApps.unshift({ time: new Date().toLocaleString('zh-CN', { hour12: false }), subject: buddyForm.subject, desc: buddyForm.desc, volunteer: `${v.name}（${v.major} ${v.grade}）` })
  addMsg(store, { type: '结对帮扶', title: '结对申请已提交', text: `已为您匹配志愿者 ${v.name}，等待对方确认。` })
  ElMessage.success('提交成功，已为您匹配志愿者')
  buddyForm.subject = ''; buddyForm.grade = ''; buddyForm.desc = ''
}

/* ===== 答疑预约 ===== */
const apptForm = reactive({ subject: '', mode: '线上', date: '', slot: '19:00-20:00' })
const apptRef = ref(null)
const apptRules = {
  subject: [{ required: true, message: '请选择科目', trigger: 'change' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }]
}
async function submitAppt() {
  if (!guard(ElMessageBox)) return
  try { await apptRef.value.validate() } catch { return }
  store.appointments.unshift({ ...apptForm, date: apptForm.date, status: '待确认' })
  addMsg(store, { type: '答疑预约', title: '预约已提交', text: `${apptForm.subject}（${apptForm.mode}）${apptForm.date} ${apptForm.slot}，等待确认。` })
  ElMessage.success('预约成功，等待确认')
  apptForm.subject = ''; apptForm.date = ''
}

/* ===== 学习打卡 ===== */
const note = ref('')
function doCheckin() {
  if (!guard(ElMessageBox)) return
  if (!note.value.trim()) { ElMessage.warning('写一句今天的打卡内容吧'); return }
  const today = new Date().toISOString().slice(0, 10)
  if (store.checkins.some(c => c.date === today)) { ElMessage.info('今天已经打过卡啦'); return }
  store.checkins.unshift({ date: today, note: note.value.trim() })
  note.value = ''
  ElMessage.success('打卡成功，连续加油！')
}
const streak = computed(() => store.checkins.length)
</script>

<template>
  <NavBar title="学业帮扶" />
  <div class="page">
    <el-tabs v-model="tab">
      <!-- 学习资料库 -->
      <el-tab-pane label="资料库" name="lib">
        <el-segmented v-model="cat" :options="cats" block style="margin-bottom:10px;" />
        <div v-for="m in list" :key="m.id" class="rt-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:14px;color:#1b2a4a;">{{ m.title }}</div>
              <p style="font-size:12px;color:#7a8698;margin:4px 0;">{{ m.desc }}</p>
              <span class="rt-badge">{{ m.cat }}</span>
              <span style="font-size:11px;color:#9aa4b2;margin-left:8px;">{{ m.size }} · {{ m.time }}</span>
            </div>
            <el-icon :size="20" :color="store.favorites.includes(m.id) ? '#c9a44c' : '#c4c9c0'" style="cursor:pointer;" @click="toggleFav(m)">
              <StarFilled v-if="store.favorites.includes(m.id)" /><Star v-else />
            </el-icon>
          </div>
          <div style="margin-top:8px;">
            <el-button size="small" type="primary" plain @click="detail(m)">查看详情</el-button>
            <el-button size="small" type="primary" @click="download(m)">下载</el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- 结对帮扶 -->
      <el-tab-pane label="结对帮扶" name="buddy">
        <el-form ref="buddyRef" :model="buddyForm" :rules="buddyRules" label-position="top">
          <div class="rt-card">
            <el-form-item label="帮扶科目" prop="subject">
              <el-select v-model="buddyForm.subject" placeholder="选择需要帮扶的科目" style="width:100%;">
                <el-option v-for="s in ['高等数学','线性代数','大学英语','数据结构','专业核心课']" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
            <el-form-item label="当前年级"><el-input v-model="buddyForm.grade" placeholder="如 大二" /></el-form-item>
            <el-form-item label="困难描述" prop="desc">
              <el-input v-model="buddyForm.desc" type="textarea" :rows="3" placeholder="描述落课情况、目标等，便于匹配合适的志愿者战友" />
            </el-form-item>
            <el-button type="primary" style="width:100%;" @click="submitBuddy">提交帮扶申请</el-button>
          </div>
        </el-form>
        <div v-if="store.buddyApps.length" class="rt-card">
          <h3 class="rt-card-title">我的结对记录</h3>
          <p v-for="(b, i) in store.buddyApps" :key="i" style="font-size:12px;color:#3d4757;line-height:1.8;margin:0 0 6px;">
            {{ b.time }} · {{ b.subject }} · 已匹配：{{ b.volunteer }}
          </p>
        </div>
      </el-tab-pane>

      <!-- 答疑预约 -->
      <el-tab-pane label="答疑预约" name="appt">
        <el-form ref="apptRef" :model="apptForm" :rules="apptRules" label-position="top">
          <div class="rt-card">
            <el-form-item label="科目" prop="subject">
              <el-select v-model="apptForm.subject" placeholder="选择科目" style="width:100%;">
                <el-option v-for="s in ['高等数学','线性代数','大学英语','数据结构','其他']" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
            <el-form-item label="答疑方式">
              <el-radio-group v-model="apptForm.mode">
                <el-radio value="线上">线上（腾讯会议）</el-radio>
                <el-radio value="线下">线下（图书馆）</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="日期" prop="date">
              <el-date-picker v-model="apptForm.date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%;" />
            </el-form-item>
            <el-form-item label="时段">
              <el-select v-model="apptForm.slot" style="width:100%;">
                <el-option v-for="s in ['14:00-15:00','16:00-17:00','19:00-20:00','20:00-21:00']" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
            <el-button type="primary" style="width:100%;" @click="submitAppt">提交预约</el-button>
          </div>
        </el-form>
        <div v-if="store.appointments.length" class="rt-card">
          <h3 class="rt-card-title">我的预约</h3>
          <p v-for="(a, i) in store.appointments" :key="i" style="font-size:12px;color:#3d4757;line-height:1.8;margin:0 0 6px;">
            {{ a.date }} {{ a.slot }} · {{ a.subject }}（{{ a.mode }}） · {{ a.status }}
          </p>
        </div>
      </el-tab-pane>

      <!-- 学习打卡 -->
      <el-tab-pane label="学习打卡" name="checkin">
        <div class="rt-card" style="text-align:center;">
          <div style="font-size:32px;font-weight:800;color:#1b2a4a;">{{ streak }}</div>
          <div style="font-size:12px;color:#7a8698;">累计打卡天数</div>
        </div>
        <div class="rt-card">
          <el-input v-model="note" type="textarea" :rows="2" placeholder="今天学了什么？写一句打卡内容…" />
          <el-button type="primary" style="width:100%;margin-top:10px;" @click="doCheckin">今日打卡</el-button>
        </div>
        <div v-for="(c, i) in store.checkins" :key="i" class="rt-card">
          <span class="rt-badge">{{ c.date }}</span>
          <p style="font-size:13px;color:#3d4757;margin:6px 0 0;">{{ c.note }}</p>
        </div>
        <p v-if="!store.checkins.length" style="text-align:center;color:#9aa4b2;font-size:13px;">还没有打卡记录，今天开始吧！</p>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
