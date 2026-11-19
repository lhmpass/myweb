import { createRouter, createWebHashHistory } from 'vue-router'

// hash 路由：构建为纯静态站点时无需服务器重写配置
const routes = [
  { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { title: '登录', hideTabbar: true } },
  { path: '/', name: 'home', component: () => import('../views/Home.vue'), meta: { title: '首页', tab: 'home' } },
  { path: '/auth', name: 'auth', component: () => import('../views/Auth.vue'), meta: { title: '身份认证', tab: 'profile' } },
  { path: '/study', name: 'study', component: () => import('../views/Study.vue'), meta: { title: '学业帮扶', tab: 'help' } },
  { path: '/policy', name: 'policy', component: () => import('../views/Policy.vue'), meta: { title: '政策服务专区', tab: 'policy' } },
  { path: '/policy/:id', name: 'policyDetail', component: () => import('../views/PolicyDetail.vue'), meta: { title: '政策详情', tab: 'policy', parent: '政策服务专区' } },
  { path: '/career', name: 'career', component: () => import('../views/Career.vue'), meta: { title: '就业升学', tab: 'help' } },
  { path: '/community', name: 'community', component: () => import('../views/Community.vue'), meta: { title: '战友互助社区', tab: 'community' } },
  { path: '/post/:id', name: 'postDetail', component: () => import('../views/PostDetail.vue'), meta: { title: '帖子详情', tab: 'community', parent: '战友互助社区' } },
  { path: '/help-apply', name: 'helpApply', component: () => import('../views/Help.vue'), meta: { title: '帮扶申请中心', tab: 'help' } },
  { path: '/profile', name: 'profile', component: () => import('../views/Profile.vue'), meta: { title: '个人中心', tab: 'profile' } },
  { path: '/admin', name: 'admin', component: () => import('../views/Admin.vue'), meta: { title: '管理员后台', tab: 'profile', parent: '个人中心', hideTabbar: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

/* 登录拦截：未登录（本地无会话）访问任何页面都先进入登录页 */
router.beforeEach(to => {
  const logged = !!localStorage.getItem('rongtu_session')
  if (to.path !== '/login' && !logged) return '/login'
  if (to.path === '/login' && logged) return '/'
})

// 同步页面标题
router.afterEach(to => { document.title = to.meta.title + ' - 戎途助学' })

export default router
