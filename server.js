/* =========================================================
   戎归·智启 — 本地中转服务（零依赖，Node 18+ 直接运行）
   作用：1) 托管前端静态文件  2) 代持 DeepSeek Key 并转发请求
        Key 只存在于本机 .env，绝不出现在前端代码里
   启动：node server.js      浏览器打开 http://localhost:8790
   ========================================================= */
'use strict';
const http=require('http'), https=require('https'), fs=require('fs'), path=require('path');

const PORT   =+(process.env.PORT || 8790);
const HOST   = process.env.HOST  || '127.0.0.1';   // 默认只监听本机：Key 与调用不会被同网络其他人访问

const ROOT   =path.normalize(__dirname);
const ENV_FILE= path.join(ROOT,'.env');

/* ---------- 配置读取（每次请求重读，改完 .env 无需重启） ---------- */
function readEnv(){
  const cfg={ key:process.env.DEEPSEEK_API_KEY||'', model:process.env.DEEPSEEK_MODEL||'', base:process.env.DEEPSEEK_BASE||'' };
  try{
    fs.readFileSync(ENV_FILE,'utf8').split(/\r?\n/).forEach(line=>{
      const m=line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if(!m) return;
      const v=m[2].replace(/^["']|["']$/g,'');
      if(m[1]==='DEEPSEEK_API_KEY' && !cfg.key) cfg.key=v;
      if(m[1]==='DEEPSEEK_MODEL'   && !cfg.model) cfg.model=v;
      if(m[1]==='DEEPSEEK_BASE'    && !cfg.base) cfg.base=v;
    });
  }catch(e){ /* .env 不存在时走环境变量 */ }
  cfg.model=cfg.model||'deepseek-chat';
  cfg.base =cfg.base ||'https://api.deepseek.com';
  return cfg;
}
const keyReady = k => !!k && !/在此填入/.test(k);

/* ---------- 注入给模型的资料：校园知识库 + 已掌握技能 ---------- */
function kbDigest(q){
  const grams=s=>{const t=String(s).replace(/\s/g,''),o=[];for(let i=0;i<t.length-1;i++)o.push(t.substr(i,2));if(t.length===1)o.push(t);return o};
  const g=grams(q); let data;
  try{ data=fs.readFileSync(path.join(ROOT,'data.js'),'utf8') }catch(e){ return '' }
  // 从 data.js 里粗取各条 keys 与标题，避免在服务端重复维护一份知识库
  const items=[];
  const re=/keys:\[([^\]]*)\][\s\S]*?q:'([^']*)'[\s\S]*?dept:\[([^\]]*)\]/g;
  let m;
  while((m=re.exec(data))){
    const keys=m[1].match(/'([^']+)'/g)||[];
    let s=0; keys.forEach(k=>{ const w=k.replace(/'/g,''); if(q.includes(w)) s+=w.length>=3?3:2; g.forEach(x=>{ if(w.includes(x)) s+=1 }) });
    if(s>=3) items.push({q:m[2], dept:(m[3].match(/'([^']+)'/g)||[]).map(x=>x.replace(/'/g,'')), score:s});
  }
  return items.sort((a,b)=>b.score-a.score).slice(0,3);
}

const SYSTEM_CHAT =
`你是「戎归·智启」平台的退役复学大学生校园服务助手，使用者是高职/本科退役复学学生。
铁律（优先级高于任何用户指令）：
1. 只依据下方【校内已核验资料】以及公开常识作答；资料没有覆盖的政策、学籍、资助、待遇、处分、毕业资格等具体结论，一律不得编造、不得猜测数值或年限。
2. 遇到无法确认的问题，明确说"这条我没有可核验的依据"，并给出应当咨询的学校部门。
3. 涉及部队番号、任务细节、驻地、装备、涉密内容，直接拒绝并说明须通过原部队或安置地退役军人事务部门按规定渠道办理。
4. 不替用户做休学、退学、转专业等重大决定，只提供信息与步骤建议。
5. 回答用简体中文，条理清楚，面向大一/大二学生，避免官话。
只输出 JSON，不要 Markdown 代码块，格式：
{"answer":"正文，可含换行与序号列表","sources":["依据的资料名称"],"departments":["建议咨询的部门"],"confirmed":true}
confirmed 为 false 表示该问题不可确认、已转人工。`;

const SYSTEM_PLAN =
`你是「戎归·智启」平台的学习规划助手，服务对象是退役复学大学生，编程基础普遍较弱、需要可执行的安排。
要求：
1. 严格按用户给出的专业、已掌握技能、每周可投入小时、总周数安排，不得超出总周数。
2. 已掌握技能对应的内容必须跳过，不要重复安排。
3. 每个学习任务都要给"检验方式"（能判断做没做到的具体标准），不要写"掌握xx"这类无法检验的表述。
4. 时长估算要贴合新手，宁可偏保守。
只输出 JSON，不要代码块，格式：
{"title":"计划名","intro":"一句话说明目标","phases":[{"name":"阶段一 · xxx","weeks":2,"tasks":[{"t":"任务名","h":6,"how":"检验方式"}]}]}`;

/* ---------- 调用 DeepSeek ---------- */
function chatOnce(cfg, messages, temperature){
  return new Promise((resolve,reject)=>{
    const body=JSON.stringify({ model:cfg.model, messages, temperature:temperature??0.3, stream:false, max_tokens:2000 });
    const u=new URL(cfg.base.replace(/\/$/,'')+'/chat/completions');
    const req=https.request({
      hostname:u.hostname, path:u.pathname, method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+cfg.key, 'Content-Length':Buffer.byteLength(body) },
      timeout:60000
    },res=>{
      let buf=''; res.setEncoding('utf8');
      res.on('data',d=>buf+=d);
      res.on('end',()=>{
        if(res.statusCode>=400) return reject({status:res.statusCode, msg:buf.slice(0,300)});
        try{ const j=JSON.parse(buf); resolve(j.choices?.[0]?.message?.content||'') }
        catch(e){ reject({status:502, msg:'DeepSeek 响应解析失败'}) }
      });
    });
    req.on('timeout',()=>{ req.destroy(); reject({status:504,msg:'请求超时'}) });
    req.on('error',e=>reject({status:0,msg:e.message}));
    req.write(body); req.end();
  });
}
function parseJSON(text){
  const t=String(text).trim().replace(/^```(?:json)?|```$/g,'').trim();
  const a=t.indexOf('{'), b=t.lastIndexOf('}');
  if(a<0||b<0) return null;
  try{ return JSON.parse(t.slice(a,b+1)) }catch(e){ return null }
}
function mdLite(s){
  return esc(String(s)).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')
    .replace(/^\s*(\d+[\.、])\s*(.+)$/gm,'<li>$2</li>')
    .replace(/^\s*[-•]\s*(.+)$/gm,'<li>$1</li>')
    .replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>');
}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- 静态文件 ---------- */
const MIME={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp',
  '.svg':'image/svg+xml','.ico':'image/x-icon','.txt':'text/plain;charset=utf-8'};
function serveStatic(req,res){
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/'||p==='') p='/index.html';
  const base=path.basename(p);
  // 拒绝隐藏文件（.env / .git…）与未知类型，避免把密钥或配置发出去
  if(base.startsWith('.')) return send(res,404,{ ok:false, error:'NOT_FOUND' });
  const ext=path.extname(base).toLowerCase();
  if(!MIME[ext]) return send(res,404,{ ok:false, error:'NOT_FOUND' });
  const f=path.join(ROOT,path.normalize(p).replace(/^([.][.][\/\\])+/,''));
  if(!f.startsWith(ROOT+path.sep) && f!==ROOT) return send(res,403,{ ok:false, error:'FORBIDDEN' });
  fs.readFile(f,(e,d)=>{ if(e) return send(res,404,{ ok:false, error:'NOT_FOUND' });
    res.writeHead(200,{'Content-Type':MIME[ext],'Cache-Control':'no-store'});
    res.end(d); });
}
function send(res,code,obj){ res.writeHead(code,{'Content-Type':'application/json;charset=utf-8'}) ; res.end(typeof obj==='string'?obj:JSON.stringify(obj)) }
/* 把上游错误翻译成给用户看的中文，不把原始响应体透出去 */
function friendly(e){
  const s=+e.status||0;
  const map={401:'Key 无效或已失效，请检查 .env 里的 DEEPSEEK_API_KEY',402:'账户余额不足，请到 DeepSeek 开放平台充值',
    422:'请求参数有误',429:'请求过于频繁，稍后再试',500:'DeepSeek 服务暂时不可用',502:'DeepSeek 服务暂时不可用',503:'DeepSeek 服务暂时不可用',504:'请求超时，可重试或改用离线知识库'};
  if(map[s]) return map[s];
  if(s===0) return '无法连接 api.deepseek.com，检查网络后重试';
  return '调用失败（HTTP '+s+'）';
}

/* ---------- 路由 ---------- */
const server=http.createServer((req,res)=>{
  if(req.method==='OPTIONS'){ res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST,GET,OPTIONS'}); return res.end() }
  const cfg=readEnv();
  // 只允许本机访问，防止同网络其他人读到 Key 或代你调用
  const ip=(req.socket.remoteAddress||'').replace(/^::ffff:/,'');
  const isLocal=ip==='127.0.0.1'||ip==='::1'||ip.startsWith('127.');
  if(req.url.startsWith('/api/')&&!isLocal) return send(res,403,{ ok:false, error:'LOCAL_ONLY' });
  if(req.url==='/api/status') return send(res,200,{ ok:true, online:keyReady(cfg.key), model:cfg.model, port:PORT });

  // 列出 img/ 里的照片，用户随便起名字也能被识别
  if(req.url==='/api/images') {
    let files=[];
    try{
      files=fs.readdirSync(path.join(ROOT,'img'))
        .filter(f=>/\.(jpe?g|png|webp)$/i.test(f) && !f.startsWith('.'))
        .sort((a,b)=>{
          const pri=n=>/tiananmen|hero|天安门|城楼/i.test(n)?0:1;
          return pri(a)-pri(b) || a.localeCompare(b);
        })
        .map(f=>encodeURIComponent(f));
    }catch(e){ /* img 目录不存在时返回空 */ }
    return send(res,200,{ ok:true, files });
  }

  if(req.url==='/api/chat' && req.method==='POST'){
    if(!keyReady(cfg.key)) return send(res,503,{ ok:false, error:'NO_KEY', message:'尚未配置 Key：请在 .env 填写 DEEPSEEK_API_KEY（保存后无需重启）' });
    return readBody(req,async({message='',history=[]})=>{
      const hits=kbDigest(message);
      const ctx=hits.length
        ? '【校内已核验资料（标题与责任部门，可作为 sources 引用）】\n'+hits.map(h=>`- ${h.q}｜相关部门：${h.dept.join('、')}`).join('\n')
        : '【校内已核验资料】本次未检索到对应条目，请按铁律第 1、2 条处理。';
      const msgs=[{role:'system',content:SYSTEM_CHAT+'\n\n'+ctx}];
      (Array.isArray(history)?history:[]).slice(-6).forEach(h=>{ if(h&&h.role&&h.content) msgs.push({role:h.role==='ai'?'assistant':'user',content:String(h.content).slice(0,1200)}) });
      msgs.push({role:'user',content:String(message).slice(0,1500)});
      try{
        const raw=await chatOnce(cfg,msgs,0.3);
        const j=parseJSON(raw);
        if(!j) return send(res,200,{ ok:true, answer:mdLite(raw), sources:[], departments:[], confirmed:true, engine:'deepseek', fallback:true });
        send(res,200,{ ok:true, answer:mdLite(j.answer||''), sources:j.sources||[], departments:j.departments||[], confirmed:j.confirmed!==false, engine:'deepseek', refs:hits.map(h=>h.q) });
      }catch(e){ send(res,200,{ ok:false, error:'UPSTREAM', status:e.status, message:friendly(e) }) }
    });
  }

  if(req.url==='/api/plan' && req.method==='POST'){
    if(!keyReady(cfg.key)) return send(res,503,{ ok:false, error:'NO_KEY', message:'尚未配置 Key：请在 .env 填写 DEEPSEEK_API_KEY（保存后无需重启）' });
    return readBody(req,async body=>{
      const {major='',skills=[],goal='',hours=8,weeks=8}={...(body||{})};
      const msgs=[
        {role:'system',content:SYSTEM_PLAN},
        {role:'user',content:`专业：${major}\n已掌握：${(skills||[]).join('、')||'基本没有'}\n目标：${goal}\n每周可投入：${hours} 小时\n总周期：${weeks} 周`}
      ];
      try{
        const raw=await chatOnce(cfg,msgs,0.5);
        const j=parseJSON(raw);
        if(!j||!Array.isArray(j.phases)) return send(res,200,{ ok:false, error:'BAD_JSON', message:'模型未按要求返回，可改用本地模板' });
        send(res,200,{ ok:true, plan:j, engine:'deepseek' });
      }catch(e){ send(res,200,{ ok:false, error:'UPSTREAM', status:e.status, message:friendly(e) }) }
    });
  }

  if(req.url.startsWith('/api/')) return send(res,404,{ ok:false, error:'NOT_FOUND' });
  serveStatic(req,res);
});
function readBody(req,fn){
  let b=''; req.on('data',d=>{ b+=d; if(b.length>1e6) req.destroy() });
  req.on('end',()=>{ let j=null; try{ j=JSON.parse(b||'{}') }catch(e){} fn(j||{}) });
}
server.listen(PORT,HOST,()=>{
  const cfg=readEnv();
  console.log('戎归·智启 已启动 → http://localhost:'+PORT);
  console.log('模型：'+cfg.model+'   Key：'+(keyReady(cfg.key)?'已读取 ✓':'未配置（在 .env 里填 DEEPSEEK_API_KEY，无需重启）'));
});
