<script setup>
// Career.vue —— 5 就业升学：定向岗位 / 技能培训 / 简历模板 / 升学倒计时
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import NavBar from '../components/NavBar.vue'
import { store, guard, addMsg, fmtLeft } from '../store/mock'

const tab = ref('jobs')

/* 岗位报名 */
function applyJob(j) {
  if (!guard(ElMessageBox)) return
  ElMessageBox.confirm(`确认报名【${j.title}】？`, '定向岗位报名')
    .then(() => { addMsg(store, { type: '就业服务', title: '岗位报名成功', text: `${j.title}，后续请留意面试通知。` }); ElMessage.success('报名成功，请留意消息通知') })
    .catch(() => {})
}

/* 培训报名 */
function applyTraining(t) {
  if (!guard(ElMessageBox)) return
  if (store.trainingApps.some(a => a.id === t.id)) { ElMessage.info('已报名过该培训'); return }
  store.trainingApps.unshift({ id: t.id, title: t.title, time: t.time })
  addMsg(store, { type: '培训报名', title: '培训报名成功', text: `${t.title}（${t.time}），开班前将短信提醒。` })
  ElMessage.success('报名成功')
}

/* 简历模板预览 */
const resumeVisible = ref(false)
const currentResume = ref(null)

/* 升学倒计时 */
function leftOf(d) { return fmtLeft(d) }
</script>

<template>
  <NavBar title="就业升学" />
  <div class="page">
    <el-tabs v-model="tab">
      <!-- 定向岗位 -->
      <el-tab-pane label="定向岗位" name="jobs">
        <div v-for="j in store.jobs" :key="j.id" class="rt-card">
          <div style="font-weight:700;font-size:14px;color:#1b2a4a;">{{ j.title }}</div>
          <p style="font-size:12px;color:#7a8698;margin:5px 0;">{{ j.org }} · {{ j.place }} · {{ j.salary }}</p>
          <span class="rt-badge">{{ j.time }}</span>
          <p style="font-size:12px;color:#4a5d23;margin:6px 0 8px;">{{ j.note }}</p>
          <el-button size="small" type="primary" @click="applyJob(j)">报名</el-button>
        </div>
      </el-tab-pane>

      <!-- 技能培训 -->
      <el-tab-pane label="技能培训" name="train">
        <div v-for="t in store.trainings" :key="t.id" class="rt-card" style="display:flex;justify-content:space-between;align-items:center;">
          <div style="flex:1;">
            <div style="font-weight:700;font-size:14px;color:#1b2a4a;">{{ t.title }}</div>
            <p style="font-size:12px;color:#7a8698;margin:4px 0 0;">{{ t.time }} · {{ t.quota }}</p>
          </div>
          <el-button size="small" type="primary" @click="applyTraining(t)">报名</el-button>
        </div>
      </el-tab-pane>

      <!-- 简历模板 -->
      <el-tab-pane label="简历模板" name="resume">
        <div v-for="r in store.resumes" :key="r.id" class="rt-card">
          <div style="font-weight:700;font-size:14px;color:#1b2a4a;">{{ r.name }}</div>
          <p style="font-size:12px;color:#7a8698;margin:6px 0 8px;">{{ r.desc }}</p>
          <el-button size="small" type="primary" plain @click="currentResume = r; resumeVisible = true">预览</el-button>
        </div>
      </el-tab-pane>

      <!-- 升学倒计时 -->
      <el-tab-pane label="升学倒计时" name="count">
        <div v-for="c in store.countdowns" :key="c.id" class="rt-card" style="text-align:center;">
          <div style="font-size:13px;color:#7a8698;">{{ c.name }}</div>
          <div style="font-size:34px;font-weight:800;color:#1b2a4a;margin:4px 0;">{{ leftOf(c.date) }}<span style="font-size:13px;font-weight:400;color:#7a8698;"> 天</span></div>
          <div style="font-size:11px;color:#9aa4b2;">截止/考试日期：{{ c.date }}</div>
        </div>
        <p style="font-size:11px;color:#9aa4b2;text-align:center;">* 倒计时按平台公布的报名/考试日程计算。</p>
      </el-tab-pane>
    </el-tabs>

    <!-- 简历预览对话框 -->
    <el-dialog v-model="resumeVisible" :title="currentResume?.name" width="90%">
      <div style="border:1px solid #e5e8e2;border-radius:8px;padding:14px;font-size:13px;line-height:2;color:#3d4757;">
        <div style="font-weight:700;color:#1b2a4a;">姓名：军旅学子　意向岗位：____</div>
        <hr style="border:none;border-top:1px solid #e5e8e2;" />
        <b style="color:#4a5d23;">军旅经历（前置突出）</b><br />
        20XX.XX—20XX.XX 中国人民解放军某部队 义务兵<br />
        · 服役期间获"优秀义务兵"称号，执行力与抗压能力强<br />
        · 参与XX演训任务，具备团队协作与纪律意识
        <hr style="border:none;border-top:1px solid #e5e8e2;" />
        <b style="color:#4a5d23;">教育经历</b><br />
        20XX.XX 至今 本校 XX专业 本科在读（退役复学）<br />
        主修课程成绩 / 竞赛获奖……
        <hr style="border:none;border-top:1px solid #e5e8e2;" />
        <b style="color:#4a5d23;">技能证书</b><br />
        计算机二级 / 英语四级 / 驾驶证 ……
      </div>
      <p style="font-size:11px;color:#9aa4b2;">* 模板示例，请结合个人实际经历填写。</p>
    </el-dialog>
  </div>
</template>
