# 戎归·智启

面向退役复学大学生的 AI 成长服务平台 · 前端框架（新中式视觉）

## 一、怎么看页面

**直接双击根目录的 `index.html`** 即可。

它是一个自包含的单文件（约 4.3 MB）：Vue、Element Plus、ECharts、全部样式与图标都已内联，
路由使用 hash 模式，不需要服务器、不需要联网、不依赖 `file://` 之外的任何东西。

导航：左侧固定栏 7 个入口（首页 / 校园问答 / 学习规划 / 职业探索 / 成长任务 / 数据统计 / 青春足迹），
移动端收进汉堡抽屉，点击即跳转。

## 二、启动脚本（可选）

双击 `启动.cmd`，按提示输入：

| 输入 | 作用 |
| --- | --- |
| `1` | 直接打开成品 `index.html` |
| `2` | 重新构建单文件（**改过 `src/` 后必须执行**） |
| `3` | 开发模式（Vite 热更新，地址 http://localhost:5173/dev.html） |

## 三、目录结构

```
index.html            自包含成品（双击即用，由构建生成，勿手改）
dev.html              Vite 开发入口（npm run dev / npm run build）
启动.cmd              启动菜单
vite.config.js        开发与常规构建配置（入口指向 dev.html）
scripts/
  build-standalone.mjs 以 IIFE 格式打包（无 ES module，file:// 可运行）
  inline.mjs           把 JS/CSS 内联进 index.html，并清理中间产物
src/
  assets/styles/      全局主题变量（配色/字号/圆角/阴影/间距/动效）
  components/layout/  AppSidebar 左侧导航 · AppHeader 吸顶眉批栏 · AppFooter · DefaultLayout
  components/common/  AppIcon 自绘线性图标 · PageUnderConstruction 占位页
  components/home/    Hero 首屏 · FeatureSection 四分区 · visuals/ 各分区视觉卡 · FootprintSection
  views/              7 个页面 + 404
  api/                后端契约层（modules/*）与 mock 数据
  router/ stores/ composables/ directives/
```

## 四、技术栈

Vue 3（`<script setup>`）· Vite 6 · Vue Router 4（hash）· Pinia · Element Plus · ECharts

纯 CSS 变量管理主题，未使用 Tailwind。AI 能力统一走 `src/api/` 契约层，
当前 `USE_MOCK = true` 用 mock 数据占位，接入真实后端时只需切换该开关。

## 五、常用命令

```bash
npm install              # 安装依赖
npm run dev              # 开发（热更新，打开 /dev.html）
npm run build:standalone # 重新生成双击即用的 index.html
```
