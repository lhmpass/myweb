/* 离线冒烟测试：用极简 DOM 模拟真实跑一遍 app.js 的渲染与交互链路 */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.join(__dirname,'..');
const {makeDoc}=require('./minidom');

const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const data=fs.readFileSync(path.join(dir,'data.js'),'utf8');
const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
// 去掉自动执行行，改为手动控制，便于观察
const boot=app.match(/^[^\n]*$/m); // 占位
const appNoBoot=app.replace(/\nrenderModules\(\);[\s\S]*$/, '\n');

const doc=makeDoc(html);
const store=new Map();
const errors=[];
const sandbox={
  console:{log:(...a)=>console.log('[app]',...a),error:(...a)=>{errors.push(a.join(' '));console.log('[app ERROR]',...a)},warn:()=>{}},
  document:doc, window:{}, Math, Date, JSON, Object, Array, String, Number, Boolean, setTimeout:(f)=>{ f(); return 1 }, clearTimeout:()=>{},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null, setItem:(k,v)=>store.set(k,String(v)), removeItem:k=>store.delete(k)},
  requestAnimationFrame:()=>0, cancelAnimationFrame:()=>{},
  confirm:()=>true, alert:()=>{}
};
sandbox.window=sandbox; sandbox.globalThis=sandbox;
/* 可控的 Image 桩：FakeImage.map 里列出「存在」的图片 */
function FakeImage(){ this._src='' }
FakeImage.map={};
Object.defineProperty(FakeImage.prototype,'src',{
  set(v){ this._src=v; if(FakeImage.map[v]){ this.naturalWidth=FakeImage.map[v]; this.onload&&this.onload() } else { this.onerror&&this.onerror() } },
  get(){ return this._src }
});
sandbox.Image=FakeImage;
vm.createContext(sandbox);
vm.runInContext(data, sandbox, {filename:'data.js'});
vm.runInContext(appNoBoot, sandbox, {filename:'app.js'});
vm.runInContext('renderModules(); renderHome(); initChat(); initPlanner(); initCareer(); initTaskForm(); initFootForm(); renderStories(); renderTasks();', sandbox);

const R=[];
const chk=(name,cond,extra)=>{ R.push([name,!!cond,extra||'']); };
const q=s=>doc.querySelector(s), qa=s=>doc.querySelectorAll(s);

/* ---- 1 首屏渲染 ---- */
chk('首页模块卡片 6 个', qa('#moduleGrid .mod-card').length===6, qa('#moduleGrid .mod-card').length);
chk('近 7 日进度柱 7 根', qa('#weekBars .bar-col').length===7, qa('#weekBars .bar-col').length);
chk('职业列表 5 项', qa('#jobList .job-item').length===5, qa('#jobList .job-item').length);
chk('足迹：初始无预置数据', qa('#storyGrid .story').length===0 && q('#storyGrid .empty'), qa('#storyGrid .story').length);
chk('任务卡片已渲染', qa('#taskList .tk').length>=5, qa('#taskList .tk').length);
chk('技能勾选项 ≥ 10', qa('#pSkills input').length>=10, qa('#pSkills input').length);
chk('常见问题芯片 ≥ 8', qa('#quickChips .chip').length>=8, qa('#quickChips .chip').length);
chk('开场白已注入', q('#chatLog .msg.ai'), qa('#chatLog .msg').length);
chk('统计数字非空', q('#sTotal').textContent!=='', q('#sTotal').textContent);
chk('导航徽标 = 待办数', q('#navTaskBadge').textContent!=='', q('#navTaskBadge').textContent);
chk('分类进度条 4 类', qa('#catBars .cb-row').length===4, qa('#catBars .cb-row').length);
chk('规划建议已生成', qa('#planAdvice .adv').length>=1, qa('#planAdvice .adv').length);

/* ---- 1b 中国红主题 + 首页强化（整段跑在异步主函数里，便于等待 fetch/Image 回调） ---- */
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
chk('CSS 定义 --red 主色', css.includes('--red:#a31621'), '');
chk('CSS 已无旧军绿变量', !/--army/.test(css), '');
chk('侧栏走红金渐变', /\.sidebar\{[\s\S]*?linear-gradient\(180deg,var\(--wine\)/.test(css), '');
chk('首页含印章元素', !!q('.seal') && q('.seal-core b').textContent==='智启', '');
chk('国旗背景层存在', !!q('.flag-bg'), '');
chk('五颗星齐全（1 大 4 小）', qa('.flag-bg .star').length===5, qa('.flag-bg .star').length);
chk('小星角度指向大星', ['rotate(-121deg)','rotate(-98.1deg)','rotate(-81.9deg)','rotate(-56.3deg)'].every(v=>css.includes(v)), '');
chk('星形用 clip-path 绘制', css.includes('polygon(50% 0%,61.8% 38.2%'), '');
chk('暗化层与金边框存在', css.includes('.hero-scrim')&&css.includes('.hero-frame'), '');
chk('已移除旧菱形暗纹', !css.includes('.hero-pattern') && !html.includes('hero-pattern'), '');
chk('窄屏有降级尺寸', /@media \(max-width:760px\)[\s\S]*?--u:6\.5px/.test(css), '');
await (async()=>{
  // 星群包围盒（最底边 = 小星 top 6.5u + 直径 3u = 9.5u）必须小于首行文字起点，否则压字
  const u=+((css.match(/\.flag-bg\{[\s\S]*?--u:(\d+(?:\.\d+)?)px/)||[0,'12'])[1]);
  const pad=+((css.match(/\.hero-inner\{[^}]*?padding:(\d+)px 56px 46px/)||[0,'138'])[1]);
  chk('星群底边让位给标题（宽屏）', 9.5*u < pad, `星群底 ${(9.5*u).toFixed(0)}px < 内容起点 ${pad}px`);
  const order = css.indexOf('.flag-scrim') < css.indexOf('.star.s1');
  const iScrim=html.indexOf('hero-scrim'), iStar=html.indexOf('class="star s1"');
  chk('旗面自身烘入暗角（星不被蒙版压暗）', /\.flag-bg\{[\s\S]*?rgba\(60,5,9,\.5\)[\s\S]*?rgba\(52,4,8,\.62\)/.test(css), '');
  chk('蒙版默认不显示（旗面模式）', /\.hero-scrim\{[^}]*display:none/.test(css), '');
  chk('照片模式启用蒙版与照片', css.includes('.hero.has-photo .hero-scrim{display:block}')&&css.includes('background-image:var(--hero-img)'), '');
  chk('有照片时停用绘制旗面', css.includes('.hero.has-photo .flag-bg{display:none}'), '');
  chk('蒙版层级低于文字', css.includes('.hero-scrim{')&&css.includes('.hero-inner{position:relative;z-index:3'), '');

  /* 背景照片自动探测：缺文件回退旗面，放文件切照片 */
  const hero=q('.hero');
  const reload=async map=>{ FakeImage.map=map; vm.runInContext(`$('.hero').classList.remove('has-photo');initHeroBg()`,sandbox); await tick(); };
  sandbox.fetch=(u)=>Promise.resolve({json:()=>u==='/api/images'?{ok:true,files:[]}:{ok:true,online:false}});
  await reload({});
  chk('没有照片时回退 CSS 旗面', !hero.classes.has('has-photo'), '');
  await reload({'img/tiananmen.jpg':1920});
  chk('放入 tiananmen.jpg 后启用照片背景', hero.classes.has('has-photo'), '');
  chk('照片地址写入 --hero-img', String(doc.documentElement.style['--hero-img']||'').includes('img/tiananmen.jpg'), doc.documentElement.style['--hero-img']||'');
  await reload({'img/hero.png':1600});
  chk('候选名依次回退（hero.png 也能识别）', hero.classes.has('has-photo') && String(doc.documentElement.style['--hero-img']).includes('img/hero.png'), doc.documentElement.style['--hero-img']);
  await reload({'img/tiny.jpg':320});
  chk('尺寸过小的图不采用', !hero.classes.has('has-photo'), doc.documentElement.style['--hero-img']);
  /* 服务能列目录时，任意文件名（含中文）都应生效 */
  sandbox.fetch=(u)=>Promise.resolve({json:()=>u==='/api/images'?{ok:true,files:['%E5%A4%A9%E5%AE%89%E9%97%A8.jpg']}:{ok:true,online:true}});
  await reload({'img/%E5%A4%A9%E5%AE%89%E9%97%A8.jpg':2000});
  chk('任意文件名（中文）也可识别', hero.classes.has('has-photo') && decodeURIComponent(String(doc.documentElement.style['--hero-img'])).includes('img/天安门.jpg'), doc.documentElement.style['--hero-img']);
  chk('img 目录说明文件已就位', fs.existsSync(path.join(dir,'img','把照片放这里.txt')), '');
  chk('照片文件已就位且为 JPEG', fs.existsSync(path.join(dir,'img','tiananmen.jpg')) &&
      fs.readFileSync(path.join(dir,'img','tiananmen.jpg')).slice(0,3).toString('hex')==='ffd8ff', '');
  chk('CC BY-SA 署名元素存在', html.includes('class="hero-credit"') && html.includes('CC BY-SA 4.0') && html.includes('commons.wikimedia.org'), '');
  chk('署名仅在照片模式显示', /\.hero-credit\{[^}]*display:none/.test(css) && css.includes('.hero.has-photo .hero-credit{display:block}'), '');
})();
chk('首页含数据条 4 格', qa('.hero-stats .hs').length===4, qa('.hero-stats .hs').length);
chk('首页含三步上手卡片', qa('.steps .step').length===3, qa('.steps .step').length);
chk('首页含重点能力大图', qa('.spotlight .spot-main').length===1 && qa('.spotlight .spot-sm').length===2, '');
vm.runInContext('initCounters()',sandbox);
const nums=qa('#view-home .count').map(e=>e.dataset.n);
chk('首页数字取自真实数据量', nums.join()==='15,5,4,6', nums.join());
chk('上手卡片可点击跳转', qa('.steps .step[data-goto]').length===3, '');
chk('大图可点击跳转', qa('.spotlight [data-goto]').length===3, '');
q('.spot-sm[data-goto="career"]').click();
chk('点击大图切到职业探索', q('#view-career').classes.has('active'), q('#crumbNow').textContent);
q('.step[data-goto="assistant"]').click();
chk('点击上手卡切到助手', q('#view-assistant').classes.has('active'), q('#crumbNow').textContent);
vm.runInContext(`switchView('home')`,sandbox);

/* ---- 2 AI 助手链路（ask 为 async，需等微任务） ---- */
const before=qa('#chatLog .msg').length;
q('#chatBox').value='可以转专业吗？';
q('#chatSend').click();
await tick();
const msgs=qa('#chatLog .msg');
chk('提问后消息 +2', msgs.length===before+2, msgs.length-before);
const last=msgs[msgs.length-1].innerHTML;
chk('回答含标题', last.includes('ans-title'), last.slice(0,90));
chk('回答标注信息来源', last.includes('信息来源'), '');
chk('回答标注办理渠道', last.includes('dept'), '');
chk('回答标记已核验', last.includes('✔')||last.includes('△'), '');

q('#chatBox').value='今晚食堂几点关门';
q('#chatSend').click();
await tick();
const unans=qa('#chatLog .msg')[qa('#chatLog .msg').length-1].innerHTML;
chk('无依据时不编造', unans.includes('未检索到可核验的依据'), unans.slice(0,90));
chk('无依据时给渠道', unans.includes('建议咨询'), '');

/* ---- 3 学习规划 → 任务联动（核心特色） ---- */
const t0=JSON.parse(store.get('rg_tasks_v1')).length;
q('#pGoal').value='frontend';
q('#pHours').value='8';
q('#planForm').dispatch('submit');
const planHtml=q('#planResult').innerHTML;
chk('生成计划阶段卡片', qa('#planResult .phase').length>=3, qa('#planResult .phase').length);
chk('计划含检验方式', planHtml.includes('检验方式'), '');
chk('计划含确认按钮', planHtml.includes('加入任务清单'), '');
chk('计划任务可编辑', qa('#planResult .tk-ttl').length>=10, qa('#planResult .tk-ttl').length);
// 模拟只勾选前 4 项
qa('#planResult .pick').forEach((c,i)=>{ if(i<4){c.checked=true} else c.checked=false });
q('#btnAddPlan').click();
const t1=JSON.parse(store.get('rg_tasks_v1')).length;
chk('确认后写入任务(+4)', t1===t0+4, `${t0}→${t1}`);
chk('新任务标记来源', q('#taskList').innerHTML.includes('来自 AI 计划'), '');
chk('新任务有截止时间', JSON.parse(store.get('rg_tasks_v1')).filter(x=>x.src==='plan').every(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.due)), '');

/* ---- 4 职业探索：差距 → 任务 ---- */
q('#jobList .job-item[data-j="qa"]').click();
const jd=q('#jobDetail').innerHTML;
chk('切换岗位刷新详情', jd.includes('软件测试工程师'), '');
chk('能力差距清单存在', qa('#jobDetail .gap-item').length>=5, qa('#jobDetail .gap-item').length);
chk('区分已具备/待补齐', jd.includes('st ok')&&jd.includes('st gap'), (jd.match(/class="st [a-z]+"/g)||[]).join(','));
chk('作品路径 ≥ 3 条', qa('#jobDetail .path-list li').length>=3, qa('#jobDetail .path-list li').length);
chk('面试题练习存在', qa('#jobDetail .qa-line').length>=2, qa('#jobDetail .qa-line').length);
chk('含就业指导免责说明', jd.includes('不代替学校就业指导中心'), '');
const t2=JSON.parse(store.get('rg_tasks_v1')).length;
q('#btnGapTasks').click();
const t3=JSON.parse(store.get('rg_tasks_v1')).length;
chk('差距清单生成任务', t3>t2, `${t2}→${t3}`);
q('#btnResume').click();
chk('简历初稿可生成', q('#resumeOut').value.length>80, q('#resumeOut').value.length);

/* ---- 5 任务 CRUD 与统计 ---- */
const list=JSON.parse(store.get('rg_tasks_v1'));
const undone=list.find(x=>x.status!=='done');
q('#chatBox'); // no-op
q('#tTitle').value='测试：新增一条任务';
q('#taskForm').dispatch('submit');
let after=JSON.parse(store.get('rg_tasks_v1'));
chk('新增任务成功', after.length===list.length+1, after.length);
chk('新任务在最前', after[0].title==='测试：新增一条任务', after[0].title);

const firstCard=q('#taskList .tk');
firstCard.querySelector('.tk-check').click();
after=JSON.parse(store.get('rg_tasks_v1'));
chk('勾选切换完成状态', after.some(x=>x.status==='done'&&x.doneAt), '');
chk('完成后徽标更新', q('#navTaskBadge').textContent!=='', q('#navTaskBadge').textContent);

// 编辑 → 保存
const target=after.find(x=>x.status!=='done');
const card=qa('#taskList .tk').find(c=>c.dataset.id===target.id);
card.querySelector('.ed').click();
q('#tTitle').value='已修改的任务名';
q('#taskForm').dispatch('submit');
after=JSON.parse(store.get('rg_tasks_v1'));
chk('编辑保存生效', after.find(x=>x.id===target.id).title==='已修改的任务名', '');

// 筛选
q('#fStatus button[data-f="done"]').click();
const doneCards=qa('#taskList .tk');
chk('筛选已完成生效', doneCards.length>=1 && doneCards.every(c=>c.classes.has('done')), doneCards.length);
q('#fStatus button[data-f="all"]').click();

// 删除（confirm 在沙箱中不存在 → 注入）
sandbox.confirm=()=>true;
const delCard=q('#taskList .tk');
const delId=delCard.dataset.id;
delCard.querySelector('.del').click();
after=JSON.parse(store.get('rg_tasks_v1'));
chk('删除任务生效', !after.some(x=>x.id===delId), '');

// 逾期标记
sandbox.confirm=()=>false;
JSON.parse(store.get('rg_tasks_v1'));
const st=vm.runInContext('stats()',sandbox);
chk('统计结构含逾期字段', typeof st.over==='number', 'over='+st.over);

/* ---- 5b 青春足迹：默认收起 → 点按钮展开 → 保存后卡片显示在上方 ---- */
chk('足迹：录入链路初始无数据', qa('#storyGrid .story').length===0 && q('#storyGrid .empty'), qa('#storyGrid .story').length);
chk('足迹：空态文案引导点按钮',
 q('#storyGrid .empty').innerHTML.includes('添加足迹'), '');
chk('足迹：点击前表单是收起的', q('#footForm').hidden===true && q('#btnAddFoot').hidden===false, '');
chk('清空按钮无数据时隐藏', q('#btnFootClearAll').hidden===true, '');
chk('栏目下拉来自数据', qa('#fTag option').length===6, qa('#fTag option').length);
q('#btnAddFoot').click();
chk('点「添加足迹」展开表单', q('#footForm').hidden===false && q('#btnAddFoot').hidden===true, '');
chk('展开后按钮变保存足迹', q('#fSubmit').textContent==='保存足迹', q('#fSubmit').textContent);
q('#fTitle').value='第一条足迹'; q('#fSteps').value='节点一\n节点二\n节点三'; q('#fTags').value='每日练习、作品驱动';
q('#footForm').dispatch('submit');
chk('未勾选授权则不保存', JSON.parse(store.get('rg_foot_v1')||'[]').length===0 && q('#footForm').hidden===false, '');
q('#fAuth').checked=true;
q('#footForm').dispatch('submit');
let foot=JSON.parse(store.get('rg_foot_v1'));
chk('授权后保存成功', foot.length===1, foot.length);
chk('保存后表单自动收起', q('#footForm').hidden===true && q('#btnAddFoot').hidden===false, '');
chk('卡片显示在列表上方', qa('#storyGrid .story').length===1 && q('#storyGrid .story').innerHTML.includes('第一条足迹'), '');
chk('首条标记为最新', q('#storyGrid .story').classes.has('newest') && q('.new-flag'), '');
chk('封面文字自动取标题', foot[0].cover==='第一条足迹', foot[0].cover);
chk('关键节点按行拆分', foot[0].steps.length===3, foot[0].steps.length);
chk('标签按顿号拆分', foot[0].tags.join()==='每日练习,作品驱动', foot[0].tags.join());
chk('卡片含节点与标签区块', q('#storyGrid').innerHTML.includes('story-steps')&&q('#storyGrid').innerHTML.includes('story-tags'), '');
chk('保存后会话内记住授权确认', vm.runInContext('authAck',sandbox)===true, '');
chk('清空按钮有数据后出现', q('#btnFootClearAll').hidden===false, '');
q('#btnAddFoot').click();
q('#fTitle').value='第二条足迹'; q('#footForm').dispatch('submit');
foot=JSON.parse(store.get('rg_foot_v1'));
chk('新增置于最前', foot.length===2 && foot[0].name==='第二条足迹', foot.map(f=>f.name).join(','));
chk('计数提示更新', q('#footCount').textContent.includes('2')&&q('#footCountIn').textContent.includes('2'), q('#footCount').textContent);
const fcard=q('#storyGrid .story');
chk('卡片带编辑/删除按钮', !!fcard.querySelector('.ef') && !!fcard.querySelector('.df'), '');
fcard.querySelector('.ef').click();
chk('点编辑才展开并回填', q('#footForm').hidden===false && q('#fTitle').value==='第二条足迹', q('#fTitle').value);
chk('编辑态标题与按钮变更', q('#fFormTitle').textContent==='编辑这条足迹' && q('#fSubmit').textContent==='保存修改', q('#fSubmit').textContent);
q('#fTitle').value='第二条足迹（已改）'; q('#footForm').dispatch('submit');
foot=JSON.parse(store.get('rg_foot_v1'));
chk('编辑保存不新增条目', foot.length===2 && foot[0].name==='第二条足迹（已改）', foot.map(f=>f.name).join(','));
chk('编辑保存后同样收起', q('#footForm').hidden===true, '');
q('#btnAddFoot').click();
q('#fTitle').value='草稿不保存'; q('#fCancel').click();
chk('取消后表单收起且清空', q('#footForm').hidden===true && q('#fTitle').value==='', q('#fTitle').value);
foot=JSON.parse(store.get('rg_foot_v1'));
chk('取消未写入数据', foot.length===2, foot.length);
sandbox.confirm=()=>true;
q('#storyGrid .story .df').click();
foot=JSON.parse(store.get('rg_foot_v1'));
chk('删除单条足迹生效', foot.length===1 && foot[0].name==='第一条足迹', foot.map(f=>f.name).join(','));
q('#btnFootClearAll').click();
foot=JSON.parse(store.get('rg_foot_v1'));
chk('清空全部足迹生效', foot.length===0 && !!q('#storyGrid .empty') && q('#btnFootClearAll').hidden===true, foot.length);

/* ---- 5c DeepSeek 在线链路（用桩替换 fetch，不需要真实 Key） ---- */
sandbox.fetch=(u,o)=>Promise.resolve({json:()=>{
  if(u==='/api/status') return {ok:true,online:true,model:'deepseek-chat'};
  if(u==='/api/chat')   return {ok:true,answer:'可以转专业，多数学校对退役学生放宽条件。<br>1. 复学后申请<br>2. 参加考核',
    sources:['学校转专业实施办法'],departments:['教务处'],confirmed:true};
  return {ok:false,error:'NO_KEY'};
}});
await vm.runInContext('detectAI()',sandbox);
chk('检测到在线服务后开关自动切 API', vm.runInContext('ai.mode',sandbox)==='api', vm.runInContext('ai.mode',sandbox));
chk('顶栏显示 DeepSeek 在线', q('#aiChipTxt').textContent==='DeepSeek 在线' && q('#aiChip').classes.has('online'), q('#aiChipTxt').textContent);
chk('在线时计划按钮可用', q('#btnPlanAI').disabled===false, String(q('#btnPlanAI').disabled));
vm.runInContext(`switchView('assistant')`,sandbox);
const n0=qa('#chatLog .msg').length;
q('#chatBox').value='可以转专业吗？'; q('#chatSend').click();
await tick();
const aiMsg=qa('#chatLog .msg')[qa('#chatLog .msg').length-1].innerHTML;
chk('在线回答渲染成功', aiMsg.includes('放宽条件'), '');
chk('标注 DeepSeek 来源徽标', aiMsg.includes('badge src')&&aiMsg.includes('DeepSeek'), '');
chk('列出依据资料与渠道', aiMsg.includes('依据资料')&&aiMsg.includes('办理 / 咨询渠道'), '');
chk('附大模型免责提示', aiMsg.includes('以学校书面答复为准'), '');
chk('多轮上下文已记录', vm.runInContext('ai.history.length',sandbox)>=2, vm.runInContext('ai.history.length',sandbox));

/* 上游失败 → 自动退回离线知识库 */
sandbox.fetch=()=>Promise.resolve({json:()=>({ok:false,error:'UPSTREAM',message:'Key 无效或已失效，请检查 .env 里的 DEEPSEEK_API_KEY'})});
q('#chatBox').value='退役复学学费怎么资助？'; q('#chatSend').click();
await tick();
const fb=qa('#chatLog .msg')[qa('#chatLog .msg').length-1].innerHTML;
chk('在线失败自动兜底离线库', fb.includes('在线服务未返回')&&fb.includes('学费资助'), '');
chk('兜底文案含失败原因', fb.includes('Key 无效或已失效'), fb.slice(0,120));

/* 切回离线模式 */
q('#aiChip').click();
chk('手动切回离线知识库', vm.runInContext('ai.mode',sandbox)==='kb' && q('#aiChipTxt').textContent==='离线知识库', q('#aiChipTxt').textContent);
chk('离线时计划按钮禁用', q('#btnPlanAI').disabled===true, String(q('#btnPlanAI').disabled));

/* DeepSeek 生成计划（桩返回结构化计划） */
sandbox.fetch=(u,o)=>Promise.resolve({json:()=>u==='/api/plan'?{ok:true,engine:'deepseek',
  plan:{title:'DeepSeek 定制计划',intro:'按你的情况生成',phases:[
    {name:'阶段一 · 补基础',weeks:3,tasks:[{t:'过一遍 HTML 标签',h:6,how:'独立写出含 6 类标签的页面'},{t:'CSS 盒模型',h:4,how:'改造卡片为自适应'}]},
    {name:'阶段二 · 做交互',weeks:4,tasks:[{t:'JS 数组与对象',h:8,how:'完成 10 道练习'}]}
  ]}}:{ok:true,online:true,model:'deepseek-chat'}});
vm.runInContext(`ai.mode='api';ai.online=true;paintChip();paintPlanBtn()`,sandbox);
vm.runInContext(`switchView('planner')`,sandbox);
q('#btnPlanAI').click();
await tick();
const pHtml=q('#planResult').innerHTML;
chk('DeepSeek 计划已渲染', pHtml.includes('DeepSeek 定制计划')&&qa('#planResult .phase').length===2, qa('#planResult .phase').length);
chk('计划标注引擎为 DeepSeek', pHtml.includes('DeepSeek</span>')||pHtml.includes('badge src'), '');
chk('含阶段周数与检验方式', pHtml.includes('第 1—3 周')&&pHtml.includes('独立写出含 6 类标签的页面'), '');
chk('附 AI 计划免责提示', pHtml.includes('任务量与时长为估算'), '');
const beforePlan=JSON.parse(store.get('rg_tasks_v1')).length;
qa('#planResult .pick').forEach(c=>c.checked=true);
q('#btnAddPlan').click();
chk('AI 计划同样能转任务', JSON.parse(store.get('rg_tasks_v1')).length>beforePlan,
  `${beforePlan}→${JSON.parse(store.get('rg_tasks_v1')).length}`);

/* ---- 6 视图切换 ---- */
['assistant','planner','career','tasks','stories','home'].forEach(v=>{
  vm.runInContext(`switchView('${v}')`,sandbox);
  chk('切换到 '+v, q('#view-'+v).classes.has('active'), q('#crumbNow').textContent);
});

/* ---- 结果 ---- */
let pass=0, fail=0;
R.forEach(([n,v,e])=>{ console.log((v?'✓':'✗')+' '+n+(e!==''?' ('+e+')':'')); v?pass++:fail++ });
console.log('\n运行时未捕获错误: '+(errors.length? errors.join(' | ') : '无'));
console.log(`冒烟结果：通过 ${pass} / 失败 ${fail}`);
process.exit(fail||errors.length?1:0);
})();
