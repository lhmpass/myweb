/**
 * mock.js —— 全站数据源 + localStorage 轻量状态仓
 * 纯前端版本：所有提交/审核/收藏/打卡等操作写入本地存储，刷新后仍保留；
 * 后续接入后端时只需把本文件换成接口调用，页面代码无需改动。
 */
import { reactive, watch } from 'vue'

const KEY = 'rongtu_store_v1'

/* ---------- 平台基础数据 ---------- */
const seed = {
  // 公告通知（首页板块1）
  notices: [
    { id: 1, title: '关于开展2026年春季学期退役复学学生学费减免申报的通知', date: '2026-11-15', tag: '武装部' },
    { id: 2, title: '专升本专项计划报名将于11月30日截止，请尽快提交材料', date: '2026-11-12', tag: '申报提醒' },
    { id: 3, title: '"战友同行"学业帮扶结对活动本周六在图书馆三层举行', date: '2026-11-10', tag: '活动通知' },
    { id: 4, title: '退役士兵考研专项计划政策解读会（线上）11月25日晚7点', date: '2026-11-08', tag: '活动通知' },
    { id: 5, title: '优待证集中办理第二批名单公示', date: '2026-11-05', tag: '武装部' }
  ],
  // 政策小贴士（首页板块3，随机轮换）
  tips: [
    '退役大学生士兵考研可享受专项计划，初试单科线适当降低。',
    '应征入伍服兵役的在校生，退役复学后可申请学费减免与国家助学贷款代偿。',
    '退役复学学生可在规定年限内申请转专业，具体以学校教务处文件为准。',
    '持有《优待证》可在全国范围内享受公共交通、文化旅游等优待服务。',
    '退役士兵参加技能培训可申请职业技能培训补贴，每人每年最高一定额度。'
  ],
  // 学习资料库（学业帮扶）
  materials: [
    { id: 1, title: '高等数学（下）期末复习课件', cat: '期末课件', size: '8.2MB', time: '2026-10-20', desc: '覆盖第七章至第十二章重点题型与历年考点梳理。' },
    { id: 2, title: '大学英语四级高频词汇笔记', cat: '习题笔记', size: '2.1MB', time: '2026-10-28', desc: '按词频排序整理的高频词与真题例句，适合碎片时间背诵。' },
    { id: 3, title: '专升本《高等数学》备考资料包', cat: '专升本备考', size: '15.6MB', time: '2026-11-02', desc: '含近五年真题、考点图谱与冲刺模拟卷三套。' },
    { id: 4, title: '数据结构课程期末重点笔记', cat: '期末课件', size: '3.4MB', time: '2026-11-06', desc: '链表、二叉树、图算法手写笔记扫描版。' },
    { id: 5, title: '专升本《大学英语》语法精讲', cat: '专升本备考', size: '5.8MB', time: '2026-11-10', desc: '语法体系图 + 120 道配套练习题及解析。' },
    { id: 6, title: '线性代数历年期末真题汇编', cat: '习题笔记', size: '1.9MB', time: '2026-11-14', desc: '2018—2025 年真题按章节分类汇编，附答案。' }
  ],
  // 帮扶志愿者池（结对帮扶匹配）
  volunteers: [
    { name: '王志远', major: '计算机科学与技术', grade: '大三', skill: '高等数学、数据结构' },
    { name: '李思佳', major: '英语', grade: '大四', skill: '四六级、考研英语' },
    { name: '陈昊', major: '机械工程', grade: '研二', skill: '线性代数、力学' }
  ],
  // 政策专区
  policies: [
    {
      id: 1, cat: '学费减免资助', title: '服兵役学生国家教育资助实施细则', time: '2026-09-01',
      brief: '退役复学学生可申请学费减免，本专科生每年最高 16000 元，研究生每年最高 20000 元。',
      content: '根据《学生资助资金管理办法》，对应征入伍服兵役的高校学生退役复学后，实行学费减免。本专科学生每人每年最高不超过 16000 元，研究生每人每年最高不超过 20000 元。超出部分由学校视情况减免。申请需在复学后第一学期内向学校学生资助管理中心提出。',
      docs: ['退役证复印件', '学生证复印件', '学费减免申请表', '入伍批准书 / 退出现役登记表复印件'],
      steps: ['向学院提交申请材料', '学院初审并公示 3 个工作日', '学校资助管理中心复核', '财务处发放减免'],
      deadline: '2026-12-20'
    },
    {
      id: 2, cat: '专升本专项计划', title: '退役大学生士兵免试专升本专项计划', time: '2026-10-05',
      brief: '普通全日制专科退役士兵可申请免试入读省内本科高校，需在规定时间完成报名。',
      content: '退役后完成专科学业的士兵（含在校期间入伍、退役后复学完成学业），可申请参加省内退役大学生士兵免试专升本招生。招生计划单列，竞争范围仅为退役士兵考生，录取率显著高于普通专升本。',
      docs: ['退役证', '专科毕业证（或在读证明）', '免试专升本申请表', '体检报告'],
      steps: ['省教育考试院官网报名', '提交申请材料至报名院校', '院校审核公示', '免试录取'],
      deadline: '2026-11-30'
    },
    {
      id: 3, cat: '退役士兵考研专项', title: '退役大学生士兵专项硕士研究生招生计划', time: '2026-09-20',
      brief: '报考"退役大学生士兵"专项计划，初试总分与单科线可适当降低要求。',
      content: '高校学生应征入伍退役后，达到报考条件者可报考"退役大学生士兵"专项硕士研究生招生计划。专项计划全国每年安排一定名额，单列招生，复试线由招生单位自主划定，通常低于普通考生分数线。',
      docs: ['《退出现役证》', '学历学籍验证报告', '考生诚信承诺书'],
      steps: ['研招网报名并选择"退役大学生士兵计划"', '按规定提交退役证明材料', '参加初试与复试', '按专项计划录取'],
      deadline: '2026-10-25'
    },
    {
      id: 4, cat: '优待证办理', title: '退役军人优待证申领指南（校园集中办理）', time: '2026-08-15',
      brief: '学校武装部联合退役军人事务局集中受理优待证申领，每月一批次。',
      content: '退役军人优待证是持证人彰显荣誉、享受优待的凭证。校园集中办理每月一批，由学校武装部统一收集材料后报送属地退役军人服务中心制发。持证可享受公共交通、文化旅游、银行专属服务等优待。',
      docs: ['身份证', '退役证', '近期白底免冠电子照', '申领登记表'],
      steps: ['武装部网站预约登记', '按批次提交材料', '等待制卡（约 30 个工作日）', '凭通知领卡激活'],
      deadline: '2026-12-31'
    },
    {
      id: 5, cat: '技能培训补贴', title: '退役军人职业技能培训补贴申领办法', time: '2026-07-30',
      brief: '退役 1 年内参加指定技能培训并取得证书，可申领培训补贴与生活费补贴。',
      content: '退役一年以内的自主就业退役士兵，可免费参加属地退役军人事务部门组织的职业技能培训；在校退役复学学生参加指定培训目录内的项目并取得职业资格证书后，可按规定申领培训补贴。',
      docs: ['退役证', '职业资格证书', '培训发票 / 结业证明', '本人银行卡复印件'],
      steps: ['选择培训目录内项目', '完成培训并取证', '线上提交补贴申请', '补贴发放至个人账户'],
      deadline: '2027-06-30'
    }
  ],
  // 定向岗位（就业升学）
  jobs: [
    { id: 1, title: '某国企行政助理（面向退役大学生专项）', org: '省属国资集团', place: '本市', salary: '5.5K-7K', time: '2026-11-14', note: '优先录用退役复学学生，提供岗前培训。' },
    { id: 2, title: '校园招聘——安全管理专员', org: '某某科技有限公司', place: '本市高新区', salary: '6K-8K', time: '2026-11-12', note: '军旅经历者优先，需通过体能测试。' },
    { id: 3, title: '基层专干 / 社区工作者（退役军人岗位）', org: '区民政与退役军人事务局', place: '本区各街道', salary: '4.5K-5.5K', time: '2026-11-08', note: '定向招聘退役士兵，笔试加分。' },
    { id: 4, title: '辅导员助理岗位（校内勤工助学）', org: '本校学生工作部', place: '校内', salary: '按月补贴', time: '2026-11-05', note: '面向在校退役复学学生，锻炼综合能力。' }
  ],
  // 培训报名（就业升学）
  trainings: [
    { id: 1, title: '无人机驾驶执照培训班（补贴项目）', time: '2026-12-10 开班', quota: '剩 8 个名额' },
    { id: 2, title: '办公软件与数据处理实操班', time: '2026-12-02 开班', quota: '剩 15 个名额' },
    { id: 3, title: '应急救援与消防安全证书班', time: '2027-01-06 开班', quota: '剩 20 个名额' }
  ],
  // 简历模板（就业升学）
  resumes: [
    { id: 1, name: '军旅经历突出版', desc: '将服役经历前置，突出纪律性、执行力与集体荣誉，适合国企与基层岗位。' },
    { id: 2, name: '学业技能均衡版', desc: '学业成绩与军旅经历并重，适合技术类校招岗位。' },
    { id: 3, name: '升学自荐版', desc: '侧重科研潜力与学习规划，适合考研复试与专升本自荐材料。' }
  ],
  // 升学倒计时
  countdowns: [
    { id: 1, name: '考研初试', date: '2026-12-20' },
    { id: 2, name: '专升本报名截止', date: '2026-11-30' },
    { id: 3, name: '退役士兵专项计划复试（预计）', date: '2027-03-20' }
  ],
  // 社区帖子种子
  posts: [
    { id: 1, author: '张**', avatar: '', title: '复学第一学期，我是这样把高数补回来的', preview: '两年没碰课本，第一节课完全听不懂……后来我每天早上 7 点去图书馆，先补前一天的知识，再预习……', content: '两年没碰课本，第一节课完全听不懂。后来我给自己定了规矩：每天早上 7 点到图书馆，先用半小时补前一天没听懂的知识点，再预习下一节。坚持一个多月，期中考终于及格了。战友们，落下的课不要怕，按天补一定追得回来！', time: '2026-11-15', likes: 42, liked: false, comments: [{ user: '刘同学', text: '很有共鸣，我也在补线性代数。', time: '2026-11-16' }], status: 'approved' },
    { id: 2, author: '王**', title: '优待证办下来了，坐地铁真免费吗？', preview: '昨天领到优待证，听说本市地铁可以刷优待证免费乘坐，有人试过吗？', content: '昨天领到优待证，听说本市地铁可以刷优待证免费乘坐，有人试过吗？另外文旅优待具体是哪些景点？求分享经验。', time: '2026-11-13', likes: 18, liked: false, comments: [{ user: '陈同学', text: '本市地铁免费没问题，刷证进站即可。', time: '2026-11-13' }], status: 'approved' },
    { id: 3, author: '李**', title: '结对了大二的帮扶战友，答疑真的有用', preview: '在平台申请了高等数学结对帮扶，匹配到大三的学长，每周线下答疑两次，讲得比我上课听得还清楚……', content: '在平台申请了高等数学结对帮扶，匹配到大三的学长，每周线下答疑两次，讲得比上课听得还清楚。刚复学觉得跟不上的战友，强烈建议试一次。', time: '2026-11-10', likes: 35, liked: false, comments: [], status: 'approved' }
  ],
  /* ---------- 用户产生的动态状态（localStorage 持久化） ---------- */
  user: { name: '军旅学子', phone: '', verified: 'none' }, // verified: none未认证 pending审核中 approved已通过
  authForm: null,
  favorites: [],        // 收藏的资料 id
  checkins: [],         // [{date, note}]
  appointments: [],     // 答疑预约
  buddyApps: [],        // 结对申请
  helpOrders: [],       // 帮扶工单 {id,cat,desc,phone,status,reply,time}
  trainingApps: [],     // 培训报名
  myPosts: [],          // 我发的帖（pending）
  messages: [           // 消息通知
    { id: 1, type: '系统', title: '欢迎来到戎途助学', text: '请先完成退役复学学子身份认证，解锁全部功能。', time: '2026-11-15 09:00', read: false }
  ],
  profile: { desc: '问题描述…', contact: '' },
  counters: { registered: 236, served: 418 }, // 后台统计
  loginLogs: [], // 登录记录 [{phone, time}]，每次登录自动写入
  adminSeed: { users: [{ name: '张**', phone: '138****2210', time: '2026-11-14', status: '待审核' }, { name: '王**', phone: '159****8231', time: '2026-11-13', status: '已通过' }] }
}

/* ---------- 加载 / 保存 ---------- */
function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return JSON.parse(JSON.stringify(seed))
    const saved = JSON.parse(raw)
    return Object.assign(JSON.parse(JSON.stringify(seed)), saved)
  } catch { return JSON.parse(JSON.stringify(seed)) }
}

export const store = reactive(load())

watch(store, () => {
  // 只持久化动态状态，种子数据随代码更新
  const dyn = ['user', 'authForm', 'favorites', 'checkins', 'appointments', 'buddyApps', 'helpOrders', 'trainingApps', 'myPosts', 'messages', 'loginLogs']
  const snap = {}
  dyn.forEach(k => { snap[k] = JSON.parse(JSON.stringify(store[k])) })
  localStorage.setItem(KEY, JSON.stringify(snap))
}, { deep: true })

/* ---------- 常用方法 ---------- */
export const isVerified = () => store.user.verified === 'approved'

/** 未认证访问受控功能时的统一拦截提示 */
export function guard(api) {
  if (isVerified()) return true
  api.alert({ title: '需要身份认证', message: '该功能面向已通过认证的退役复学学子开放，请先在【个人中心-身份认证】提交认证。', confirmButtonText: '知道了' })
  return false
}

export function addMsg(list, obj) {
  store.messages.unshift(Object.assign({ id: Date.now(), time: new Date().toLocaleString('zh-CN', { hour12: false }), read: false }, obj))
}

/** 登录成功时调用：把手机号与登录时间写入登录记录（后台「登录记录」页读取展示） */
export function addLoginLog(phone) {
  store.loginLogs.unshift({
    phone,
    time: new Date().toLocaleString('zh-CN', { hour12: false }),
    ts: Date.now(),               // 用于时间排序
    status: '成功'
  })
}

/** 手机号脱敏：保留前 3 位与后 4 位，中间 4 位打码 */
export function maskPhone(p) {
  return p ? p.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2') : ''
}

export function fmtLeft(dateStr) {
  const d = Math.ceil((new Date(dateStr) - new Date('2026-11-19')) / 86400000)
  return d > 0 ? d : 0
}
