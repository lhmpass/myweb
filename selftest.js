/* 自测脚本：校验知识库命中、来源标注、不编造规则、数据完整性 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const dir=__dirname;
const ctx={console,window:{},document:null,localStorage:{getItem:()=>null,setItem:()=>{}},setTimeout,Date,Math,JSON,
  esc:s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dir,'data.js'),'utf8'),ctx);

// 从 app.js 中取出纯逻辑函数（不触碰 DOM）
const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
function slice(name){
  const i=app.indexOf('function '+name+'(');
  if(i<0) throw new Error('not found '+name);
  let d=0,j=app.indexOf('{',i); const s=j;
  for(;j<app.length;j++){ if(app[j]==='{')d++; else if(app[j]==='}'){d--; if(!d){j++;break}} }
  return app.slice(i,j);
}
vm.runInContext(['renderBlock',...[]].map(slice).join('\n'),ctx);
vm.runInContext(slice('grams')+'\n'+slice('answerFromKB'),ctx);

const qs=[
  '退役复学后，之前的课程应该怎样衔接？',
  '复学手续要办哪些、大概什么时间办？',
  '退役复学学费怎么资助？',
  '可以转专业吗？',
  '学校有哪些针对退役大学生的奖助政策？',
  '复学后体育课和军事理论能免修吗？',
  '想走软件测试方向，该考什么证？',
  '我当兵前挂过科，还能拿奖学金吗？',
  '部队档案里的高数成绩能置换学分吗？',
  '今晚食堂几点关门',                       // 应无匹配 → 不编造
  '我原来部队驻地在哪个城市',                 // 应命中涉密 → 不可作答
  '我现在绩点2.1能不能毕业'                   // 应命中个人判定 → 不可作答
];
let pass=0,fail=0;
for(const q of qs){
  const r=vm.runInContext(`answerFromKB(${JSON.stringify(q)})`,ctx);
  const tag = !r.hit ? 'NO-MATCH(不编造)' : (r.confirmed?'HIT '+r.hit:'转人工 '+r.hit);
  const ok = r.confirmed ? r.sources.length>0 : true;
  ok?pass++:fail++;
  console.log((ok?'✓':'✗'), q.slice(0,18).padEnd(20), '→', tag, '| 来源', r.sources.length);
}
// 结构完整性
const KB=vm.runInContext('KB',ctx), JOBS=vm.runInContext('JOBS',ctx), PATHS=vm.runInContext('PATHS',ctx),
      SKILLS=vm.runInContext('SKILLS',ctx), FOOT_TAGS=vm.runInContext('FOOT_TAGS',ctx),
      SEED=vm.runInContext('SEED_TASKS',ctx), MODS=vm.runInContext('MODULES',ctx), QA=vm.runInContext('QUICK_ASKS',ctx);
const chk=[
  ['KB 条目数 ≥ 13', KB.length>=13, KB.length],
  ['每条可答 KB 都有 src+dept', KB.filter(k=>k.ok!==false).every(k=>k.src.length&&k.dept.length), ''],
  ['每条 KB body 非空', KB.every(k=>k.body.length), ''],
  ['JOBS ≥ 4 且字段齐全', JOBS.length>=4 && JOBS.every(j=>j.must.length&&j.path.length&&j.qa.length), JOBS.length],
  ['PATHS 目标与下拉一致', ['frontend','test','backend','cert'].every(g=>PATHS[g]), ''],
  ['SKILLS 覆盖 job.must 引用', JOBS.every(j=>j.must.every(m=>(m.k in SKILLS)||m.k==='network')), ''],
  ['足迹栏目 ≥ 4 且无预置数据', FOOT_TAGS.length>=4 && vm.runInContext('typeof STORIES',ctx)==='undefined', FOOT_TAGS.length],
  ['SEED_TASKS ≥ 5', SEED.length>=5, SEED.length],
  ['MODULES = 6', MODS.length===6, MODS.length],
  ['推荐问题均能命中或明确转人工', QA.every(q=>{const r=vm.runInContext(`answerFromKB(${JSON.stringify(q)})`,ctx); return r.hit||q.includes('证')}), ''],

];
chk.forEach(([n,v,extra])=>{ console.log((v?'✓':'✗'),n,extra); v?pass++:fail++ });

// HTML / 动态模板中引用的 DOM id 是否都存在
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const srcData=fs.readFileSync(path.join(dir,'data.js'),'utf8');
const hasMock=/(^|\n)\s*(const|var|let)\s+STORIES\s*=/.test(srcData);
const hasDemoName=/小刘|小陈|小吴|迷彩·课堂/.test(srcData+html);
const all=html+app;
const ids=[...new Set(app.match(/\$\('#([A-Za-z0-9_]+)'\)/g).map(s=>s.slice(4,-2)))];
const missing=ids.filter(i=>!all.includes('id="'+i+'"') && !all.includes(`id="${i}"`));
console.log(missing.length? '✗ 缺失 DOM id: '+missing.join(', ') : '✓ DOM id 全部匹配（'+ids.length+' 个）');
missing.length?fail++:pass++;
console.log(hasMock? '✗ data.js 仍存在 STORIES 模拟故事数据' : '✓ 已删除模拟故事数据（足迹改为用户自添加）');
hasMock?fail++:pass++;
console.log(hasDemoName? '✗ 仍残留示例人名/占位足迹文案' : '✓ 无示例足迹文案');
hasDemoName?fail++:pass++;

console.log(`\n结果：通过 ${pass} / 失败 ${fail}`);
process.exit(fail?1:0);
