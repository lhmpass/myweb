<script setup>
// Home.vue —— 1 首页：轮播banner / 公告 / 快捷导航 / 政策小贴士 / 底部版权
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElCarousel, ElTag } from 'element-plus'
import NavBar from '../components/NavBar.vue'
import PolicyTip from '../components/PolicyTip.vue'
import { store } from '../store/mock'
import bannerFlag from '../assets/banner-flag.jpg'
import bannerCampus from '../assets/banner-campus.jpg'
import bannerRed from '../assets/banner-red.jpg'

const router = useRouter()

// 轮播 banner 数据（红色主题配图）
const banners = [
  { img: bannerFlag, title: '戎途助学 · 退役复学学子帮扶平台', desc: '退伍不褪色，复学再出发。为退役复学大学生提供学业、政策、就业、心理全方位帮扶。' },
  { img: bannerCampus, title: '帮扶宗旨', desc: '让每一位退役复学学子学业跟得上、政策看得懂、升学就业有方向、身边有战友。' },
  { img: bannerRed, title: '战友同行计划', desc: '学业结对、答疑预约、学习打卡，和战友一起把落下的课补回来。' }
]

// 快捷导航入口
const entries = [
  { label: '学业帮扶', icon: 'Reading', to: '/study', color: '#1b2a4a' },
  { label: '政策专区', icon: 'Document', to: '/policy', color: '#4a5d23' },
  { label: '就业升学', icon: 'Opportunity', to: '/career', color: '#8a6d1f' },
  { label: '战友圈子', icon: 'ChatDotRound', to: '/community', color: '#35502f' },
  { label: '帮扶申请', icon: 'HandsUp', to: '/help-apply', color: '#2c4069' }
]

// 公告默认展示 3 条，可展开全部
const expanded = ref(false)
const noticeList = computed(() => (expanded.value ? store.notices : store.notices.slice(0, 3)))
</script>

<template>
  <NavBar title="戎途助学" />

  <div class="page">
    <!-- 轮播 banner -->
    <el-carousel height="128px" :interval="4000" arrow="never" indicator-position="none" style="margin-bottom:12px;">
      <el-carousel-item v-for="(b, i) in banners" :key="i">
        <div class="rt-banner" :style="{ backgroundImage: 'linear-gradient(to top, rgba(27,42,74,.92) 20%, rgba(27,42,74,.35)), url(' + b.img + ')', backgroundSize: 'cover', backgroundPosition: 'center' }">
          <div style="font-size:17px;font-weight:700;letter-spacing:1px;text-shadow:0 1px 4px rgba(0,0,0,.4);">{{ b.title }}</div>
          <p style="font-size:12px;line-height:1.7;color:#e3e9f2;margin:8px 0 0;text-shadow:0 1px 3px rgba(0,0,0,.4);">{{ b.desc }}</p>
        </div>
      </el-carousel-item>
    </el-carousel>

    <!-- 公告通知 -->
    <div class="rt-card">
      <h3 class="rt-card-title">公告通知</h3>
      <div v-for="n in noticeList" :key="n.id"
           style="display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px dashed #e8eae4;cursor:pointer;"
           @click="router.push('/policy')">
        <div style="flex:1;min-width:0;">
          <el-tag size="small" :color="n.tag === '武装部' ? '#eef1e6' : '#eef2f8'" style="border:none;color:#4a5d23;margin-right:6px;">{{ n.tag }}</el-tag>
          <span style="font-size:13px;line-height:1.5;">{{ n.title }}</span>
        </div>
        <span style="font-size:11px;color:#9aa4b2;white-space:nowrap;">{{ n.date }}</span>
      </div>
      <div style="text-align:center;margin-top:8px;">
        <el-link type="primary" :underline="false" @click="expanded = !expanded">
          {{ expanded ? '收起' : `展开全部（共 ${store.notices.length} 条）` }}
        </el-link>
      </div>
    </div>

    <!-- 快捷导航 -->
    <div class="rt-card">
      <h3 class="rt-card-title">快捷导航</h3>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;">
        <div v-for="e in entries" :key="e.to" style="text-align:center;cursor:pointer;" @click="router.push(e.to)">
          <div style="width:46px;height:46px;margin:0 auto;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#f4f6f2;">
            <el-icon :size="22" :color="e.color"><component :is="e.icon" /></el-icon>
          </div>
          <div style="font-size:11px;margin-top:5px;color:#3d4757;">{{ e.label }}</div>
        </div>
      </div>
    </div>

    <!-- 政策小贴士 -->
    <PolicyTip />

    <!-- 底部说明 -->
    <div style="text-align:center;color:#9aa4b2;font-size:11px;line-height:1.8;padding:10px 0;">
      戎途助学——退役复学学子帮扶平台<br />
      高校公益帮扶项目 · 退役不褪色 复学再出发<br />
      © 2026 戎途助学项目组 · 平台信息以学校官方发布为准
    </div>
  </div>
</template>
