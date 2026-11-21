# 戎归·智启

面向退役复学大学生的 AI 成长服务平台 · 前端框架（红色家国 / 新中式视觉）

## 一、怎么看页面

**直接双击根目录的 `index.html`** 即可。

它是一个自包含的单文件：Vue、Element Plus、ECharts、全部样式与图标都已内联，
路由使用 hash 模式，不需要服务器、不需要联网。

导航：左侧固定栏 7 个入口（首页 / 校园问答 / 学习规划 / 职业探索 / 成长任务 / 数据统计 / 青春足迹），
移动端收进汉堡抽屉，点击即跳转。

## 二、青春足迹（真实内容模块）

首页底部「青春足迹」与左侧「青春足迹」页共用同一套真实记录：

- 点击「添加足迹」录入**访谈对象、访谈时间、标题 / 主题、正文**（院校 / 单位选填）；
- 提交后**立即**以独立小方块卡片出现在列表与首页，进入视口时按顺序逐个淡入上浮；
- 点击卡片可查看全文、编辑、删除（删除需二次确认）；
- 所有记录写入浏览器 `localStorage`；
- **初始为空，不预置、不生成任何模拟数据**；「数据统计」页的图表也全部由这些真实记录派生。

## 三、启动脚本（可选）

双击 `启动.cmd`，按提示输入：

| 输入 | 作用 |
| --- | --- |
| `1` | 直接打开成品 `index.html` |
| `2` | 重新构建单文件（**改过 `src/` 后必须执行**） |
| `3` | 开发模式（Vite 热更新，地址 http://localhost:5173/dev.html） |

## 四、目录结构

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
  components/common/  AppIcon 自绘线性图标 · PageUnderConstruction 建设中说明页
  components/home/    Hero · FeatureSection · FeatureArtwork 装饰视觉 · CompanionSection · FootprintSection
  components/footprint/  FootprintBoard 记录板 · FootprintCard 小方块卡片 · FootprintForm 录入 · FootprintDetail 详情
  views/              首页 / 青春足迹 / 数据统计 / 4 个建设中模块 / 404
  stores/footprint.js 真实访谈记录（localStorage 持久化，唯一内容数据源）
  router/ composables/ directives/
```

## 五、技术栈

Vue 3（`<script setup>`）· Vite 6 · Vue Router 4（hash）· Pinia · Element Plus · ECharts
纯 CSS 变量管理主题，未使用 Tailwind。

项目不再包含 mock / 演示数据层：首页与统计页的数字、图表均由真实录入的访谈记录派生，
尚未开放的模块只显示诚实的「建设中」状态。

## 六、常用命令

```bash
npm install              # 安装依赖
npm run dev              # 开发（热更新，打开 /dev.html）
npm run build:standalone # 重新生成双击即用的 index.html
```
