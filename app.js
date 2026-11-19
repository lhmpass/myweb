/* =========================================================
   戎归·智启 — 应用逻辑（演示原型，无框架依赖，双击即可运行）
   模块：导航 / 首页统计 / AI校园助手 / AI学习规划 / AI职业探索 / 任务管理 / 青春足迹
   ========================================================= */
'use strict';

/* ---------- 存储 ---------- */
const LS = {
  get(k, d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d }catch(e){ return d } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)) }catch(e){} }
};
const K_TASKS='rg_tasks_v1', K_SKILLS='rg_skills_v1', K_SEED='rg_seeded_v1', K_CHAT='rg_chat_v1';

const DAY = 86400000;
const $  = (s,r=document)=>r.querySelector(s);
const selText = s => { const el=$(s); if(!el) return '';
  const i=(el.selectedIndex!=null && el.selectedIndex>=0)?el.selectedIndex:0;
  const o=el.options && el.options[i];
  return String((o&&(o.textContent||o.text))||el.value||'').trim() };
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pad = n => String(n).padStart(2,'0');
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today = () => dstr(new Date());
const addDays = n => { const d=new Date(); d.setDate(d.getDate()+n); return dstr(d) };

/* ---------- 全局状态 ---------- */
let tasks = LS.get(K_TASKS, null);
if(!tasks){ tasks = (SEED_TASKS||[]).map((t,i)=>({
  id:'seed'+i, title:t.title, cat:t.cat, pri:t.pri, status:t.status,
  due:addDays(t.day), doneAt: t.status==='done'? addDays(t.day<=0?t.day:-1) : null, src:'seed'
})); LS.set(K_TASKS,tasks); LS.set(K_SEED,1); }
let owned = LS.get(K_SKILLS, ['html','office']);   // 已掌握技能
let filters = { status:'all', range:'all' };
let curJob  = JOBS[0].id;
let lastPlan = null;

/* =========================================================
   AI 接口层
   mode: 'kb' 离线内置知识库（默认，永远可用）
         'api' DeepSeek 在线（需本机 node server.js，Key 只在服务端）
   ========================================================= */
const ai = { mode:'kb', online:false, history:[] };

async function api(path_, payload){
  if(typeof fetch!=='function') return {ok:false,error:'NO_FETCH'};
  try{
    const r = await fetch(path_, payload?{
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
    }:undefined);
    return await r.json();
  }catch(e){ return {ok:false,error:'OFFLINE', message:String(e&&e.message||e)} }
}
async function detectAI(){
  const s = await api('/api/status');
  ai.online = !!(s && s.ok && s.online);
  if(ai.online && ai.mode==='kb') ai.mode='api';
  paintChip(); paintPlanBtn();
  return ai.online;
}
function paintChip(){
  const chip=$('#aiChip'), txt=$('#aiChipTxt'); if(!chip) return;
  chip.classList.toggle('online', ai.mode==='api' && ai.online);
  chip.classList.toggle('off', !ai.online);
  txt.textContent = !ai.online ? '离线知识库' : (ai.mode==='api' ? 'DeepSeek 在线' : '离线知识库');
  chip.title = ai.online ? '点击在 DeepSeek 与离线知识库之间切换' : '未检测到本机服务：node server.js 启动后可在线';
}
function paintPlanBtn(){
  const b=$('#btnPlanAI'); if(!b) return;
  b.disabled = !(ai.online && ai.mode==='api');
  b.textContent = ai.online ? 'DeepSeek 生成' : 'DeepSeek 生成（未连接）';
}
let lastAIError='';
async function callDeepSeek(message){
  const r = await api('/api/chat',{ message, history:ai.history.slice(-6) });
  if(!r || !r.ok){ lastAIError = (r&&(r.message||r.error))||'未连接服务'; return null }
  lastAIError='';
  ai.history.push({role:'user',content:message},{role:'ai',content:r.answer||''});
  if(ai.history.length>14) ai.history=ai.history.slice(-14);
  return r;
}
async function callAI(text){
  if(ai.mode==='api' && ai.online){
    const r = await callDeepSeek(text);
    if(r) return {
      html:`<span class="ans-title">${esc(text.length>26?text.slice(0,26)+'…':text)}<span class="badge src">DeepSeek</span></span>
        <p>${r.answer}</p>
        ${r.confirmed?'':'<div class="unconfirmed">这条我没有可核验的依据，请勿据此办理，建议直接联系下列部门确认。</div>'}
        ${r.sources&&r.sources.length?`<div class="sec"><div class="sec-h">依据资料</div><div class="src-list">${r.sources.map((s,i)=>`<div class="src-item"><i>[${i+1}]</i><span>${esc(s)}</span></div>`).join('')}</div></div>`:''}
        ${r.departments&&r.departments.length?`<div class="sec"><div class="sec-h">办理 / 咨询渠道</div><div class="dept-chips">${r.departments.map(d=>`<span class="dept">${esc(d)}</span>`).join('')}</div></div>`:''}
        <div class="ai-note">⚠ 由大模型生成，资料引用可能不完整。政策、学籍、资助类结论请以学校书面答复为准。</div>`,
      sources:r.sources||[], depts:r.departments||[], confirmed:r.confirmed!==false, hit:'DeepSeek 在线回答'
    };
    // 在线失败：明确告知原因，并退回离线知识库，不让页面卡死
    const kb = answerFromKB(text);
    kb.html = `<div class="unconfirmed">在线服务未返回（${esc(lastAIError||'网络异常')}），下面改为离线知识库结果。</div>` + kb.html;
    kb.hit = '离线兜底：'+(kb.hit||'无匹配条目');
    return kb;
  }
  return answerFromKB(text);
}

/* ---------- 知识库检索（关键词 n-gram 命中计分） ---------- */
function grams(s){
  const t = s.replace(/\s/g,''); const out=[];
  for(let i=0;i<t.length-1;i++) out.push(t.substr(i,2));
  if(t.length===1) out.push(t);
  return out;
}
function answerFromKB(q){
  const g = grams(q);
  let best=null, bestScore=0;
  KB.forEach(k=>{
    let s=0;
    k.keys.forEach(w=>{ if(q.includes(w)) s += w.length>=3 ? 3 : 2; });
    g.forEach(x=>{ k.keys.forEach(w=>{ if(w.includes(x)) s+=1 }) });
    if(s>bestScore){ bestScore=s; best=k }
  });

  if(!best || bestScore<3){
    return {
      html:`<span class="ans-title">未检索到可核验的依据</span>
        <p>这个问题在学校公开资料中未找到对应条目，为避免误导，我不作具体回答。</p>
        <div class="sec"><div class="sec-h">建议咨询</div>
        <div class="dept-chips"><span class="dept">学校人民武装部 / 学生处</span><span class="dept">教务处</span><span class="dept">所在学院辅导员</span></div></div>
        <div class="sec"><div class="sec-h">你可以这样问</div>
        <p style="font-size:12.8px;color:var(--ink-2)">把问题具体化，例如「退役复学后课程怎样衔接」「复学手续什么时间办」「学费资助怎么申请」。</p></div>`,
      sources:[], depts:[], confirmed:false, hit:''
    };
  }

  if(best.ok===false){
    return {
      html:`<span class="ans-title">这类问题需要转人工办理</span>
        ${best.body.map(renderBlock).join('')}
        <div class="sec"><div class="sec-h">请通过以下渠道确认</div>
        <div class="dept-chips">${best.dept.map(d=>`<span class="dept">${esc(d)}</span>`).join('')}</div></div>`,
      sources:best.src, depts:best.dept, confirmed:false, hit:best.q
    };
  }

  return {
    html:`<span class="ans-title">${esc(best.q)}</span>${best.body.map(renderBlock).join('')}
      <div class="sec"><div class="sec-h">信息来源（正式发布前须逐条核验）</div>
      <div class="src-list">${best.src.map((s,i)=>`<div class="src-item"><i>[${i+1}]</i><span><b>${esc(s.name)}</b> — ${esc(s.note)}</span></div>`).join('')}</div></div>
      <div class="sec"><div class="sec-h">办理 / 咨询渠道</div>
      <div class="dept-chips">${best.dept.map(d=>`<span class="dept">${esc(d)}</span>`).join('')}</div></div>`,
    sources:best.src, depts:best.dept, confirmed:true, hit:best.q
  };
}
function renderBlock(b){
  if(b.type==='list') return `<ul>${b.items.map(i=>`<li>${i}</li>`).join('')}</ul>`;
  if(b.type==='step') return `<div class="sec"><div class="sec-h">${esc(b.title||'办理步骤')}</div><ol>${b.items.map(i=>`<li>${i}</li>`).join('')}</ol></div>`;
  return `<p>${b.text}</p>`;
}

/* =========================================================
   导航与视图切换
   ========================================================= */
const VIEW_META = {
  home:['首页','平台总览'], assistant:['智能服务','AI 校园助手'], planner:['智能服务','AI 学习规划'],
  career:['智能服务','AI 职业探索'], tasks:['成长管理','个人成长任务'], stories:['特色栏目','青春足迹']
};
function switchView(v){
  if(!VIEW_META[v]) v='home';
  $$('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.view===v));
  $$('.view').forEach(s=>s.classList.toggle('active', s.id==='view-'+v));
  $('#crumbGroup').textContent = VIEW_META[v][0];
  $('#crumbNow').textContent   = VIEW_META[v][1];
  $('#scroll').scrollTop = 0;
  document.body.classList.remove('nav-open');
  if(v==='home') renderHome();
  if(v==='tasks') renderTasks();
  if(v==='stories') renderStories();
}
$$('.nav-item').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
$$('[data-goto]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.goto)));
$('#menuBtn').addEventListener('click',()=>document.body.classList.toggle('nav-open'));
$('#aiChip').addEventListener('click',async()=>{
  if(!ai.online){ const ok=await detectAI(); toast(ok?'已连接 DeepSeek 服务':'未检测到服务：先运行 node server.js 并在 .env 填 Key'); return }
  ai.mode = ai.mode==='api' ? 'kb' : 'api';
  ai.history=[]; paintChip(); paintPlanBtn();
  toast(ai.mode==='api'?'已切换到 DeepSeek 在线回答':'已切换到离线知识库回答');
});

/* =========================================================
   01 首页
   ========================================================= */
function renderModules(){
  $('#moduleGrid').innerHTML = MODULES.map(m=>`
    <div class="mod-card" data-goto="${m.view}">
      <span class="no">${m.no}</span><h4>${esc(m.title)}</h4>
      <p>${esc(m.desc)}</p><span class="tagline">${esc(m.tag)}</span>
      <span class="go">进入 →</span>
    </div>`).join('');
  $$('#moduleGrid .mod-card').forEach(c=>c.addEventListener('click',()=>switchView(c.dataset.goto)));
}
function stats(){
  const total=tasks.length, done=tasks.filter(t=>t.status==='done').length;
  const doing=tasks.filter(t=>t.status==='doing').length;
  const over=tasks.filter(isOverdue).length;
  return {total, done, doing, todo:total-done-doing, over, rate: total? Math.round(done/total*100):0};
}
function isOverdue(t){ return t.status!=='done' && t.due && t.due < today() }
function renderHome(){
  const s=stats();
  $('#sTotal').textContent=s.total; $('#sDone').textContent=s.done;
  $('#sRate').textContent=s.rate+'%'; $('#sOver').textContent=s.over;
  $('#ringTxt').textContent=s.rate+'%';
  $('#lgDone').textContent=s.done; $('#lgDoing').textContent=s.doing; $('#lgTodo').textContent=s.todo;
  const deg=Math.round(s.rate*3.6);
  const deg2=deg + Math.round((s.total? s.doing/s.total : 0)*3.6);
  $('#ring').style.background=`conic-gradient(var(--red) ${deg}deg, var(--gold) ${deg}deg ${deg2}deg, #efe6e2 ${deg2}deg)`;
  $('#navTaskBadge').textContent = s.total - s.done;

  // 近 7 日完成柱状图
  const days=[]; for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days.push({key:dstr(d), wd:d.getDay()}) }
  const cnt = days.map(o=>tasks.filter(t=>t.status==='done'&&t.doneAt===o.key).length);
  const mx = Math.max(1,...cnt);
  const lbl=['日','一','二','三','四','五','六'];
  $('#weekBars').innerHTML = days.map((o,i)=>`
    <div class="bar-col">
      <span class="bar-val">${cnt[i]||''}</span>
      <div class="bar-fill ${o.key===today()?'today':''}" style="height:${Math.max(3,Math.round(cnt[i]/mx*120))}px"></div>
      <span class="bar-lbl">${i===6?'今天':'周'+lbl[o.wd]}</span>
    </div>`).join('');
}

/* =========================================================
   02 AI 校园助手
   ========================================================= */
function pushMsg(role, html){
  const log=$('#chatLog');
  const div=document.createElement('div');
  div.className='msg '+role;
  div.innerHTML=`<div class="ava">${role==='user'?'我':'智启'}</div><div class="bubble">${html}</div>`;
  log.appendChild(div); log.scrollTop=log.scrollHeight;
  return div;
}
async function ask(q){
  if(!q.trim()) return;
  pushMsg('user', esc(q));
  const typing = pushMsg('ai','<span class="typing"><i></i><i></i><i></i> 正在检索核验知识库…</span>');
  const r = await callAI(q);
  await new Promise(res=>setTimeout(res, 550));
  const isAI = r.hit && r.hit.indexOf('DeepSeek')===0;
  typing.querySelector('.bubble').innerHTML = r.html +
    `<div class="kb-hit">${isAI
      ? `◇ 引擎 DeepSeek · 引用资料 ${r.sources.length} 条 · 结论需自行向学校核验`
      : `${r.confirmed?'✔ 命中内置核验知识库':'△ 未确认，已转人工渠道'}：${esc(r.hit||'无匹配条目')} · 来源 ${r.sources.length} 条`}</div>`;
  $('#chatLog').scrollTop = $('#chatLog').scrollHeight;
}
function initChat(){
  $('#quickChips').innerHTML = QUICK_ASKS.map(q=>`<span class="chip">${esc(q)}</span>`).join('');
  $$('#quickChips .chip').forEach(c=>c.addEventListener('click',()=>ask(c.textContent)));
  $('#chatSend').addEventListener('click',()=>{ const v=$('#chatBox').value; $('#chatBox').value=''; ask(v) });
  $('#chatBox').addEventListener('keydown',e=>{
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); const v=e.target.value; e.target.value=''; ask(v) }
  });
  pushMsg('ai',`<span class="ans-title">你好，我是「智启」校园助手</span>
    <p>可以问我退役复学相关的<b>校园事务、课程衔接、资助政策、专业选择、校园服务</b>等问题。我会依据学校公开资料作答，并给出信息来源与办理渠道。</p>
    <div class="sec"><div class="sec-h">我不会做的事</div>
    <ul><li>不编造政策、不猜测个人学籍结论</li><li>不采集、不回答涉及部队任务与内部信息的内容</li></ul></div>
    <div class="sec"><div class="sec-h">先来一个典型问题</div>
    <div class="dept-chips"><span class="dept" id="introAsk">退役复学后，之前的课程应该怎样衔接？</span></div></div>`);
  $('#introAsk').style.cursor='pointer';
  $('#introAsk').addEventListener('click',e=>ask(e.target.textContent));
}

/* =========================================================
   03 AI 学习规划（核心技术特色：计划 → 确认可改 → 转任务）
   ========================================================= */
function initPlanner(){
  $('#pSkills').innerHTML = Object.entries(SKILLS).map(([k,v])=>
    `<label><input type="checkbox" value="${k}" ${owned.includes(k)?'checked':''}>${esc(v.name)}</label>`).join('');
  $('#pHours').addEventListener('input',e=>$('#pHoursOut').textContent = e.target.value+' 小时 / 周');
  $$('#pPeriod button').forEach(b=>b.addEventListener('click',()=>{
    $$('#pPeriod button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
  }));
  $('#planForm').addEventListener('submit',e=>{ e.preventDefault(); genPlan() });
  $('#btnPlanAI').addEventListener('click',()=>{ if(!$('#btnPlanAI').disabled) genPlanAI(); });
}
function genPlan(){
  const goal=$('#pGoal').value, hours=+$('#pHours').value;
  const weeks=+($('#pPeriod button.on').dataset.w);
  const path = PATHS[goal];
  owned = $$('#pSkills input:checked').map(i=>i.value); LS.set(K_SKILLS, owned);

  // 依据每周时长折算每阶段实际周数，并按总周期截断
  let cursor=0;
  const phases = path.phases.map((ph,idx)=>{
    const load = ph.tasks.reduce((a,t)=>a+t.h,0);
    const real = Math.max(1, Math.round(load/hours));
    const start = cursor; cursor += real;
    return {...ph, idx, load, real, start};
  }).filter(p=>p.start < weeks);

  lastPlan = {goal, hours, weeks, created:today(), phases, engine:'本地模板'};
  paintPlan(path.title, path.intro, phases, {skip:true});
}
/* 统一渲染计划：本地模板与 DeepSeek 结果共用同一套「确认→转任务」链路 */
function paintPlan(title,intro,phases,opt){
  const o=opt||{}, weeks=lastPlan.weeks, hours=lastPlan.hours;
  const total=phases.reduce((a,p)=>a+p.load,0);
  const skip=o.skip?phases.reduce((a,p)=>a+p.tasks.filter(t=>t.need&&owned.includes(t.need)).length,0):0;
  $('#planResult').innerHTML = `
    <div class="page-head" style="margin-top:24px">
      <h2>为你生成的学习计划（可修改）</h2>
      <p>${esc(title)} · ${weeks} 周 · 每周约 ${hours} 小时 · 学习总量约 ${total} 小时
         ${skip?`（已按你的基础跳过 ${skip} 项）`:''}
         <span class="badge ${lastPlan.engine==='DeepSeek'?'src':'guess'}">${esc(lastPlan.engine)}</span></p>
    </div>
    <div class="notice" style="margin:0 0 14px"><b>说明</b>：${esc(intro)} AI 建议仅供参考，请先核对再确认为任务；带 <b>✓已掌握</b> 标记的内容会自动跳过。</div>
    ${phases.map(p=>`
      <div class="phase">
        <div class="phase-head">
          <span class="phase-no">${p.idx+1}</span>
          <h4>${esc(p.name)}</h4>
          <span class="meta">约 ${p.real} 周 · 第 ${p.start+1}—${Math.min(weeks,p.start+p.real)} 周 · ${p.load}h</span>
        </div>
        <div class="phase-body">
          ${p.tasks.map((t,ti)=>{
            const mastered = !!(t.need && owned.includes(t.need));
            return `<div class="task-row" data-p="${p.idx}" data-t="${ti}">
              <input type="checkbox" class="pick" ${mastered?'':'checked'} ${mastered?'disabled':''}>
              <div class="txt">
                <b class="tk-ttl" contenteditable="true">${esc(t.t)}</b>
                <small>检验方式：${esc(t.how)} · 预计 ${t.h} 小时${mastered?' · ✓你已掌握，默认不加入任务':''}</small>
              </div>
              <span class="how">第 ${p.start+1}—${Math.min(weeks,p.start+p.real)} 周</span>
            </div>`}).join('')}
        </div>
      </div>`).join('')}
    <div class="plan-foot">
      <span class="grow">勾选要执行的任务，可直接点击任务文字修改内容。系统将按各阶段结束日自动设置截止时间。</span>
      <button class="btn primary" id="btnAddPlan">加入任务清单</button>
      <button class="btn ghost" id="btnRegen">重新生成</button>
    </div>
    ${lastPlan.engine==='DeepSeek'?'<div class="ai-note">⚠ 本计划由 DeepSeek 生成，任务量与时长为估算，请按你的实际节奏调整后再加入任务清单。</div>':''}`;

  $('#btnAddPlan').addEventListener('click', addPlanToTasks);
  $('#btnRegen').addEventListener('click', ()=>{ lastPlan.engine==='DeepSeek'? genPlanAI() : genPlan() });
  $('#planResult').scrollIntoView({behavior:'smooth', block:'start'});
}
/* DeepSeek 生成计划：把表单发给服务端，返回结构需含 phases[].tasks[] */
async function genPlanAI(){
  owned = $$('#pSkills input:checked').map(i=>i.value); LS.set(K_SKILLS, owned);
  const weeks=+($('#pPeriod button.on').dataset.w), hours=+$('#pHours').value;
  const btn=$('#btnPlanAI'), old=btn.textContent;
  btn.disabled=true; btn.textContent='正在生成…';
  const body={ major:selText('#pMajor'), skills:owned.map(k=>SKILLS[k]?SKILLS[k].name:k),
    goal:selText('#pGoal'), hours, weeks };
  const r=await api('/api/plan',body);
  btn.textContent=old; paintPlanBtn();
  if(!r||!r.ok||!r.plan||!r.plan.phases||!r.plan.phases.length){
    toast('DeepSeek 未返回有效计划，已改用本地模板'); return genPlan();
  }
  let cursor=0;
  const phases=r.plan.phases.map((ph,idx)=>{
    const load=ph.tasks.reduce((a,t)=>a+(+t.h||0),0);
    const real=Math.max(1, +ph.weeks || Math.round(load/hours) || 1);
    const start=cursor; cursor+=real;
    return { name:ph.name||('阶段 '+(idx+1)), idx, load, real, start,
             tasks:ph.tasks.map(t=>({t:t.t, h:+t.h||2, how:t.how||'自查完成即可'})) };
  }).filter(p=>p.start<weeks);
  lastPlan={goal:$('#pGoal').value, hours, weeks, created:today(), phases, engine:'DeepSeek'};
  paintPlan(r.plan.title||'DeepSeek 定制计划', r.plan.intro||'按你填写的专业、基础与每周时长生成。', phases, {skip:false});
}
function addPlanToTasks(){
  if(!lastPlan) return;
  const rows = $$('#planResult .task-row');
  let n=0;
  rows.forEach(r=>{
    const cb=r.querySelector('.pick'); if(!cb.checked) return;
    const p=lastPlan.phases[+r.dataset.p], t=p.tasks[+r.dataset.t];
    const title=r.querySelector('.tk-ttl').textContent.trim();
    if(!title) return;
    const endDay = Math.min(lastPlan.weeks, p.start+p.real);
    tasks.push({
      id:'p'+Date.now()+n, title, cat:'study',
      pri: p.idx===0?'high':'mid', status:'todo',
      due: addDays(endDay*7), doneAt:null, src:'plan',
      note:`${lastPlan.goal} 阶段${p.idx+1} · 检验：${t.how} · 预计 ${t.h}h`
    }); n++;
  });
  if(!n) return toast('请先勾选至少一项任务');
  LS.set(K_TASKS,tasks); renderHome();
  toast(`已加入 ${n} 项学习任务，可前往「成长任务管理」调整`);
  setTimeout(()=>switchView('tasks'), 900);
}

/* =========================================================
   04 AI 职业探索
   ========================================================= */
function initCareer(){
  renderJobList(); renderJobDetail();
}
function renderJobList(){
  $('#jobList').innerHTML = JOBS.map(j=>`
    <div class="job-item ${j.id===curJob?'on':''}" data-j="${j.id}">
      <b>${esc(j.name)}</b><span class="ji-sub">${esc(j.sub)}</span>
    </div>`).join('');
  $$('#jobList .job-item').forEach(el=>el.addEventListener('click',()=>{ curJob=el.dataset.j; renderJobList(); renderJobDetail() }));
}
function renderJobDetail(){
  const j=JOBS.find(x=>x.id===curJob);
  const okN=j.must.filter(m=>owned.includes(m.k)).length;
  const gapN=j.must.length-okN;
  const rate=Math.round(okN/j.must.length*100);
  $('#jobDetail').innerHTML = `
    <div class="jd-head"><h3>${esc(j.name)}</h3><span class="salary">${esc(j.salary)}</span></div>
    <p class="jd-desc">${esc(j.desc)}</p>

    <div class="jd-sec">
      <h5>能力差距清单（依据你勾选的已掌握技能）</h5>
      <div class="gap-summary">
        <div class="gs g-ok"><b>${okN}</b><span>已具备</span></div>
        <div class="gs g-gap"><b>${gapN}</b><span>待补齐</span></div>
        <div class="gs g-part"><b>${rate}%</b><span>匹配度</span></div>
      </div>
      <div class="gap-list">
        ${j.must.map(m=>{
          const has=owned.includes(m.k);
          return `<div class="gap-item">
            <span class="st ${has?'ok':'gap'}">${has?'✓':'!'}</span>
            <span class="nm">${esc(m.name)} <span class="lv">· ${esc(m.req)}</span></span>
            ${has?'':`<button class="btn tiny ghost" data-add="${m.k}" data-nm="${esc(m.name)}">补此技能</button>`}
          </div>`}).join('')}
      </div>
      <div class="plan-foot" style="margin-top:12px">
        <span class="grow">匹配度 ${rate}%。建议先补齐「必会」项，再攻「核心」项；把待补技能加入学习任务可持续跟踪。</span>
        <button class="btn primary" id="btnGapTasks">把差距生成学习任务</button>
      </div>
      <div class="notice" style="margin-top:12px"><b>免责</b>：岗位技能要求与薪资为资料库整理值，须以最新公开招聘信息核验；本模块建议仅供参考，不代替学校就业指导中心的正式指导。</div>
    </div>

    <div class="jd-sec">
      <h5>实践任务与作品积累路径</h5>
      <ul class="path-list">${j.path.map((p,i)=>`<li><b>作品 ${i+1}</b> — ${esc(p)}</li>`).join('')}</ul>
    </div>

    <div class="jd-sec">
      <h5>面试问题练习</h5>
      ${j.qa.map((q,i)=>`<div class="qa-line"><span class="q">Q${i+1}</span>
        <span class="a"><b>${esc(q.q)}</b><br>${esc(q.a)}</span></div>`).join('')}
    </div>

    <div class="jd-sec">
      <h5>简历内容整理</h5>
      <div class="resume-box">
        把军旅经历写成岗位需要的能力描述，避免空泛。点击生成初稿后自行修改：
        <textarea id="resumeOut" placeholder="点击下方按钮生成初稿，再按你的真实经历修改"></textarea>
        <div style="display:flex;gap:10px;margin-top:10px">
          <button class="btn primary tiny" id="btnResume">生成简历段落初稿</button>
          <button class="btn ghost tiny" id="btnResumeSave">保存到我的简历</button>
        </div>
      </div>
    </div>`;

  $$('#jobDetail [data-add]').forEach(b=>b.addEventListener('click',()=>{
    const k=b.dataset.add; if(!owned.includes(k)) owned.push(k);
    LS.set(K_SKILLS,owned); renderJobDetail(); toast('已标记为待掌握技能，记得加入学习任务');
  }));
  $('#btnGapTasks').addEventListener('click',()=>{
    const gaps=j.must.filter(m=>!owned.includes(m.k));
    if(!gaps.length) return toast('该岗位必会/核心技能你已全部掌握');
    gaps.forEach((m,i)=>tasks.push({
      id:'c'+Date.now()+i, title:`补齐岗位技能：${m.name}（${j.name}要求 ${m.req}）`,
      cat:'career', pri: m.req==='必会'?'high':'mid', status:'todo',
      due: addDays((i+1)*10), doneAt:null, src:'career'
    }));
    LS.set(K_TASKS,tasks); renderHome(); renderJobDetail();
    toast(`已生成 ${gaps.length} 项职业准备任务`);
  });
  $('#btnResume').addEventListener('click',()=>{
    $('#resumeOut').value =
`【军旅经历 → 可迁移能力】
· 两年部队经历，养成任务导向与按时交付习惯，适应高强度节奏与反复打磨。
· 担任班级（班组）骨干，组织 ${'{人数}'} 人日常训练与勤务，具备分工协调与现场处置经验。
· 服役期间完成 ${'{具体事项}'}，书写报告与台账记录，文档习惯良好。

【与「${j.name}」岗位的对应】
· ${j.must.slice(0,3).map(m=>m.name).join(' / ')}：通过课程与自学掌握，已在 ${'{项目名}'} 中实践。
· 质量与责任意识：以 checklist 方式验证交付，主动记录并跟踪问题闭环。

【项目 / 作品】
1. ${j.path[0]}
2. ${j.path[1]||'待补充'}
（说明：以上为初稿占位，请替换为你的真实数据，不得虚构经历与证书。）`;
    toast('初稿已生成，请逐项替换为真实内容');
  });
  $('#btnResumeSave').addEventListener('click',()=>{
    const v=$('#resumeOut').value.trim();
    if(!v) return toast('内容还是空的');
    LS.set('rg_resume', v); toast('已保存到本地（浏览器 localStorage）');
  });
}

/* =========================================================
   05 成长任务管理
   ========================================================= */
function saveTasks(){ LS.set(K_TASKS,tasks); renderHome(); renderTasks(); }
function duePill(t){
  if(!t.due) return '';
  const d=Math.round((new Date(t.due) - new Date(today()))/DAY);
  if(t.status==='done') return `<span class="pill st done">已完成</span>`;
  if(d<0)  return `<span class="pill due-over">逾期 ${-d} 天</span>`;
  if(d===0) return `<span class="pill due-soon">今天到期</span>`;
  if(d<=2) return `<span class="pill due-soon">还剩 ${d} 天</span>`;
  return `<span class="pill st">截止 ${t.due.slice(5).replace('-','/')}</span>`;
}
function matchFilter(t){
  if(filters.status!=='all' && t.status!==filters.status) return false;
  if(filters.range==='today'  && t.due!==today()) return false;
  if(filters.range==='week'){
    if(!t.due) return false;
    const d=(new Date(t.due)-new Date(today()))/DAY;
    if(d<0 || d>7) return false;
  }
  return true;
}
function renderTasks(){
  const list=tasks.filter(matchFilter);
  const priTxt={high:'高',mid:'中',low:'低'};
  const stTxt={todo:'未开始',doing:'进行中',done:'已完成'};
  $('#taskList').innerHTML = list.length ? list.map(t=>`
    <div class="tk ${t.pri} ${t.status==='done'?'done':''} ${isOverdue(t)?'over':''}" data-id="${t.id}">
      <div class="tk-top">
        <button class="tk-check" title="标记完成"></button>
        <div class="tk-title">${esc(t.title)}</div>
        <div class="tk-acts">
          <button class="ed">编辑</button>
          <button class="del">删除</button>
        </div>
      </div>
      <div class="tk-meta">
        <span class="pill p-${t.pri}">${priTxt[t.pri]}优先</span>
        <span class="pill cat">${esc(CATS[t.cat]||t.cat)}</span>
        ${t.status!=='done'?`<span class="pill st ${t.status}">${stTxt[t.status]}</span>`:duePill(t)}
        ${t.status!=='done'?duePill(t):''}
        ${t.src==='plan'?'<span class="pill st doing">来自 AI 计划</span>':''}
        ${t.src==='career'?'<span class="pill st doing">来自职业探索</span>':''}
      </div>
      ${t.note?`<div class="tk-meta" style="margin-top:4px;color:var(--ink-3)">📋 ${esc(t.note)}</div>`:''}
    </div>`).join('')
    : `<div class="empty"><b>当前筛选下没有任务</b>切换筛选条件，或从「AI 学习规划」生成学习任务</div>`;

  $$('#taskList .tk').forEach(el=>{
    const id=el.dataset.id, t=tasks.find(x=>x.id===id);
    el.querySelector('.tk-check').addEventListener('click',()=>{
      t.status = t.status==='done' ? 'todo' : 'done';
      t.doneAt = t.status==='done' ? today() : null;
      saveTasks(); toast(t.status==='done'?'完成一项，继续保持':'已取消完成状态');
    });
    el.querySelector('.del').addEventListener('click',()=>{
      if(!confirm('删除任务「'+t.title+'」？')) return;
      tasks=tasks.filter(x=>x.id!==id); saveTasks(); toast('任务已删除');
    });
    el.querySelector('.ed').addEventListener('click',()=>editTask(t));
  });

  // 徽标 / 顶栏
  const s=stats();
  $('#navTaskBadge').textContent = s.total-s.done;
  $('#topStats').textContent = `待办 ${s.total-s.done} 项 · 完成率 ${s.rate}%`;
  renderCatBars(s); renderAdvice(s);
}
function editTask(t){
  $('#tEditId').value=t.id; $('#tTitle').value=t.title;
  $('#tDue').value=t.due||''; $('#tPri').value=t.pri; $('#tCat').value=t.cat;
  $('#tSubmit').textContent='保存修改'; $('#tCancel').hidden=false;
  $('#taskForm').scrollIntoView({behavior:'smooth'}); $('#tTitle').focus();
}
function initTaskForm(){
  $('#taskForm').addEventListener('submit',e=>{
    e.preventDefault();
    const title=$('#tTitle').value.trim(); if(!title) return;
    const eid=$('#tEditId').value;
    if(eid){
      const t=tasks.find(x=>x.id===eid);
      Object.assign(t,{title, due:$('#tDue').value||null, pri:$('#tPri').value, cat:$('#tCat').value});
      toast('已保存修改');
    }else{
      tasks.unshift({ id:'t'+Date.now(), title, cat:$('#tCat').value, pri:$('#tPri').value,
        status:'todo', due:$('#tDue').value||addDays(7), doneAt:null, src:'self' });
      toast('任务已添加');
    }
    $('#taskForm').reset(); $('#tPri').value='mid'; $('#tCat').value='study';
    $('#tEditId').value=''; $('#tSubmit').textContent='添加任务'; $('#tCancel').hidden=true;
    saveTasks();
  });
  $('#tCancel').addEventListener('click',()=>{
    $('#taskForm').reset(); $('#tEditId').value='';
    $('#tSubmit').textContent='添加任务'; $('#tCancel').hidden=true;
  });
  $$('#fStatus button').forEach(b=>b.addEventListener('click',()=>{
    $$('#fStatus button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
    filters.status=b.dataset.f; renderTasks();
  }));
  $$('#fRange button').forEach(b=>b.addEventListener('click',()=>{
    $$('#fRange button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
    filters.range=b.dataset.r; renderTasks();
  }));
  $('#btnClearDone').addEventListener('click',()=>{
    const n=tasks.filter(t=>t.status==='done').length;
    if(!n) return toast('没有已完成任务');
    if(!confirm(`确认清除 ${n} 项已完成任务？此操作不可撤销`)) return;
    tasks=tasks.filter(t=>t.status!=='done'); saveTasks(); toast(`已清除 ${n} 项`);
  });
  $('#tDue').value = addDays(7);
}
function renderCatBars(s){
  $('#catBars').innerHTML = Object.keys(CATS).map(k=>{
    const all=tasks.filter(t=>t.cat===k), dn=all.filter(t=>t.status==='done').length;
    const pct = all.length? Math.round(dn/all.length*100):0;
    return `<div class="cb-row"><span class="cb-name">${CATS[k]}</span>
      <div class="cb-track"><div class="cb-fill" style="width:${pct}%"></div></div>
      <span class="cb-num">${dn}/${all.length}</span></div>`;
  }).join('');
}
function renderAdvice(s){
  const out=[];
  if(!s.total){ out.push(['adv','还没有任务','去「AI 学习规划」生成一份学习计划，或直接添加第一个任务。']); }
  else{
    if(s.over>=3) out.push(['adv bad',`有 ${s.over} 项任务已逾期`,'建议先做减法：砍掉不重要的、把大任务拆成 1—2 小时能完成的小块，再重新安排截止时间。']);
    else if(s.over>0) out.push(['adv warn',`${s.over} 项任务逾期`,'挑出最能推进目标的一项，今天先把它做完，避免积压。']);
    if(s.rate>=70) out.push(['adv good',`完成率 ${s.rate}%，节奏很好`,'可以适当提升难度：把「学习」类任务加入 Vue / 接口联调等进阶内容。']);
    else if(s.rate>=40) out.push(['adv',`完成率 ${s.rate}%，中等`,'按「每周可投入时长」重估任务量，宁可少而稳。']);
    else out.push(['adv warn',`完成率 ${s.rate}%，偏慢`,'检查计划是否超出你实际可投入的时间；到学习规划页把每周时长调低后重新生成。']);
    const study=tasks.filter(t=>t.cat==='study');
    if(!study.length) out.push(['adv warn','缺少专业学习任务','平台核心目标是学业衔接，建议至少安排一条本周的专业学习任务。']);
    const doneToday=tasks.filter(t=>t.status==='done'&&t.doneAt===today()).length;
    if(doneToday) out.push(['adv good','今天已有推进','保持每天至少一项，比偶尔突击更有效。']);
  }
  $('#planAdvice').innerHTML = out.map(([c,b,p])=>`<div class="${c}"><b>${esc(b)}</b>${esc(p)}</div>`).join('');
}

/* =========================================================
   06 青春足迹（用户自添加，无预置数据）
   ========================================================= */
const K_FOOT='rg_foot_v1';
let footprints = LS.get(K_FOOT, []);
function saveFoot(){ LS.set(K_FOOT,footprints); renderStories(); }
let footSeq=0, authAck=false, flashId='';   // authAck：本次会话内已确认过授权，连续录入不必反复勾选
function newFootId(){ return 'f'+Date.now().toString(36)+(++footSeq) }   // 同一毫秒连续添加也不会撞 id
function splitTags(v){ return String(v).split(/[、,，;；\s]+/).map(s=>s.trim()).filter(Boolean).slice(0,6) }
function splitSteps(v){ return String(v).split(/[\n;；]+/).map(s=>s.trim()).filter(Boolean).slice(0,6) }

function renderStories(){
  const grid=$('#storyGrid'); if(!grid) return;
  const label=`共 ${footprints.length} 条`;
  $('#footCount').textContent=label;
  const ci=$('#footCountIn'); if(ci) ci.textContent=label;
  $('#btnFootClearAll').hidden = footprints.length===0;
  if(!footprints.length){
    grid.innerHTML = `<div class="empty"><b>还没有足迹</b>
      点上方「＋ 添加足迹」记录第一条。内容须真实、已获本人授权，且不含涉密信息。</div>`;
    return;
  }
  grid.innerHTML = footprints.map((s,i)=>`
    <div class="story ${s.id===flashId?'flash':''} ${i===0?'newest':''}" data-id="${s.id}">
      <div class="story-cover ${esc(s.cls)}">${esc(s.cover)}<em>${esc(s.tag)}</em>${i===0?'<span class="new-flag">最新</span>':''}</div>
      <div class="story-body">
        <h4>${esc(s.name)}</h4>
        ${s.who?`<div class="who">${esc(s.who)}</div>`:''}
        ${s.text?`<p>${esc(s.text)}</p>`:''}
        ${s.steps.length?`<ul class="story-steps">${s.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
        ${s.tags.length?`<div class="story-tags">${s.tags.map(t=>`<span class="tag">#${esc(t)}</span>`).join('')}</div>`:''}
        <div class="story-acts">
          <span class="story-date">添加于 ${esc(s.created)}</span>
          <button class="btn tiny ghost ef">编辑</button>
          <button class="btn tiny ghost df">删除</button>
        </div>
      </div>
    </div>`).join('');
  flashId='';

  $$('#storyGrid .story').forEach(el=>{
    const id=el.dataset.id;
    el.querySelector('.ef').addEventListener('click',()=>openFoot(id));
    el.querySelector('.df').addEventListener('click',()=>{
      const s=footprints.find(x=>x.id===id);
      if(!confirm(`删除足迹「${s.name}」？`)) return;
      footprints=footprints.filter(x=>x.id!==id); saveFoot(); toast('足迹已删除');
    });
  });
}
/* 表单默认收起，只有点「添加足迹 / 编辑」才展开 */
function openFoot(id){
  const f=$('#footForm'); f.hidden=false; $('#btnAddFoot').hidden=true;
  if(id){
    const s=footprints.find(x=>x.id===id); if(!s) return;
    $('#fEditId').value=s.id;
    $('#fTitle').value=s.name; $('#fWho').value=s.who; $('#fTag').value=s.tag;
    $('#fCover').value=s.cover; $('#fCls').value=s.cls; $('#fTags').value=s.tags.join('、');
    $('#fText').value=s.text; $('#fSteps').value=s.steps.join('\n'); $('#fAuth').checked=true;
    $('#fFormTitle').textContent='编辑这条足迹'; $('#fSubmit').textContent='保存修改';
  }else{
    clearFootForm();
  }
  f.scrollIntoView({behavior:'smooth', block:'nearest'}); $('#fTitle').focus();
}
function closeFoot(){
  $('#footForm').hidden=true; $('#btnAddFoot').hidden=false; clearFootForm();
}
function clearFootForm(){
  $('#footForm').reset(); $('#fEditId').value='';
  $('#fAuth').checked = authAck;          // 保留本次会话的授权确认，便于连续录入
  $('#fFormTitle').textContent='添加一条足迹'; $('#fSubmit').textContent='保存足迹';
}
function initFootForm(){
  $('#fTag').innerHTML = FOOT_TAGS.map(t=>`<option>${esc(t)}</option>`).join('');
  $('#btnAddFoot').addEventListener('click',()=>openFoot(null));
  $('#footForm').addEventListener('submit',e=>{
    e.preventDefault();
    const name=$('#fTitle').value.trim();
    if(!name) return toast('请填写足迹标题');
    if(!$('#fAuth').checked) return toast('请先确认内容已获本人授权且不含敏感信息');
    authAck = true;
    const editing=$('#fEditId').value;
    const old = editing ? footprints.find(x=>x.id===editing) : null;
    const rec={
      id: editing || newFootId(),
      name,
      who: $('#fWho').value.trim(),
      tag: $('#fTag').value,
      cover: ($('#fCover').value.trim() || name).slice(0,6),
      cls: $('#fCls').value,
      text: $('#fText').value.trim(),
      steps: splitSteps($('#fSteps').value),
      tags: splitTags($('#fTags').value),
      created: (old && old.created) || today()
    };
    const i=footprints.findIndex(x=>x.id===rec.id);
    if(i>=0){ footprints.splice(i,1); footprints.unshift(rec); flashId=rec.id; toast('已更新，移到列表最上方'); }
    else { footprints.unshift(rec); flashId=rec.id; toast('足迹已添加，显示在列表最上方'); }
    saveFoot(); closeFoot();
  });
  $('#fCancel').addEventListener('click',closeFoot);
  $('#btnFootClearAll').addEventListener('click',()=>{
    if(!footprints.length) return toast('当前没有足迹');
    if(!confirm(`确认清空全部 ${footprints.length} 条足迹？此操作不可撤销`)) return;
    footprints=[]; saveFoot(); closeFoot(); toast('已清空');
  });
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg){
  const t=$('#toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2400);
}

/* ---------- 首页数字滚动（数值取自实际数据量，非写死） ---------- */
function initCounters(){
  const real={'15':KB.length, '5':JOBS.length, '4':Object.keys(PATHS).length, '6':MODULES.length};
  $$('#view-home .count').forEach(el=>{
    const n=+el.dataset.n;
    el.dataset.n = real[el.dataset.n]!==undefined ? real[el.dataset.n] : n;
    el.dataset.suf=el.dataset.suf||'';
    el.textContent='0'+el.dataset.suf;
  });
  runCounters();
}
let countersDone=false;
function runCounters(){
  if(countersDone) return; countersDone=true;
  $$('#view-home .count').forEach(el=>{
    const to=+el.dataset.n, suf=el.dataset.suf, t0=Date.now(), dur=900;
    const step=()=>{
      const k=Math.min(1,(Date.now()-t0)/dur);
      el.textContent=Math.round(to*(1-Math.pow(1-k,3)))+suf;
      if(k<1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* ---------- 首页背景：img/ 里放任意照片即自动启用，缺文件回退 CSS 旗面 ---------- */
const HERO_IMGS=['img/tiananmen.jpg','img/tiananmen.jpeg','img/tiananmen.png','img/tiananmen.webp','img/hero.jpg','img/hero.png'];
function setHeroImg(src){
  document.documentElement.style.setProperty('--hero-img',`url("${src}")`);
  $('.hero').classList.add('has-photo');
}
function initHeroBg(){
  const hero=$('.hero'); if(!hero) return;
  const probe=list=>{
    const i=list.findIndex(Boolean); if(i<0 || i>8) return;
    const src=list[i], im=new Image();
    im.onload=()=>{ im.naturalWidth>=500 ? setHeroImg(src) : probe(list.slice(1)) };
    im.onerror=()=>probe(list.slice(1));
    im.src=src;
  };
  // 服务在跑时先问一次目录，支持任意文件名（含中文名）；否则用固定候选名
  api('/api/images').then(r=>{
    const list=(r&&r.ok&&r.files&&r.files.length)? r.files.map(f=>'img/'+f) : HERO_IMGS;
    probe(list);
  });
}

/* ---------- 启动 ---------- */
renderModules(); renderHome(); initChat(); initPlanner(); initCareer(); initTaskForm(); initFootForm(); renderStories(); renderTasks(); initCounters(); detectAI(); initHeroBg();
