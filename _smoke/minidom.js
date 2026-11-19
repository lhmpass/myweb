/* 极简 DOM 模拟：用于离线冒烟测试 app.js（不依赖任何第三方包） */
'use strict';
const VOID={input:1,br:1,img:1,meta:1,link:1,hr:1,source:1};
class El{
  constructor(tag){
    this.tagName=(tag||'div').toUpperCase(); this.tag=tag||'div';
    this.id=''; this.classes=new Set(); this.attrs={}; this.dataset={};
    this.children=[]; this.parent=null; this.text=''; this.listeners={};
        this.style={ setProperty(k,v){ this[k]=v }, removeProperty(k){ delete this[k] } };
 this.value=''; this.checked=false; this.hidden=false; this.scrollTop=0;
    this.scrollHeight=100;
  }
  set className(v){ this.classes=new Set(String(v).split(/\s+/).filter(Boolean)) }
  get className(){ return [...this.classes].join(' ') }
  get classList(){ const c=this.classes; return {
    add:(...a)=>a.forEach(x=>c.add(x)), remove:(...a)=>a.forEach(x=>c.delete(x)),
    contains:x=>c.has(x), toggle:(x,f)=>{ if(f===undefined){ c.has(x)?c.delete(x):c.add(x) } else { f?c.add(x):c.delete(x) } } } }
  set innerHTML(h){ this.children=parse(String(h),this); this.text='' }
  get innerHTML(){ return this.children.map(serialize).join('') }
  set textContent(v){ this.children=[]; this.text=String(v) }
  get textContent(){ return this.text + this.children.map(c=>c.textContent).join('') }
  appendChild(el){ el.parent=this; this.children.push(el); return el }
  addEventListener(t,f){ (this.listeners[t]=this.listeners[t]||[]).push(f) }
  removeEventListener(t,f){ this.listeners[t]=(this.listeners[t]||[]).filter(x=>x!==f) }
  dispatch(t,ev){ (this.listeners[t]||[]).forEach(f=>f(Object.assign({preventDefault(){},target:this},ev||{}))) }
  click(){ this.dispatch('click') }
  reset(){ // 模拟浏览器：控件恢复为初始 attribute 值
    walk(this,el=>{
      if(['input','select','textarea'].includes(el.tag)){
        el.value = el.attrs.value!==undefined ? el.attrs.value : '';
        el.checked = el.attrs.checked!==undefined;
      }
    });
    this.dispatch('reset');
  }
  focus(){} scrollIntoView(){}
  matches(sel){ return matchSimple(this,sel) }
  querySelector(s){ return this.querySelectorAll(s)[0]||null }
  querySelectorAll(s){ return queryAll(this,s) }
  get offsetHeight(){ return 10 }
  get options(){ return this.children.filter(c=>c.tag==='option') }
  get selectedIndex(){ const i=this.options.findIndex(o=>o.attrs.selected!==undefined); return i<0?0:i }
}
function serialize(el){
  let a='<'+el.tag;
  if(el.id) a+=' id="'+el.id+'"';
  if(el.className) a+=' class="'+el.className+'"';
  Object.keys(el.attrs).forEach(k=>{ if(['id','class','style'].includes(k)) return; a+=' '+k+'="'+el.attrs[k]+'"' });
  if(VOID[el.tag]) return a+'>';
  a+='>'; return a + (el.children.length? el.children.map(serialize).join('') : escapeText(el.text)) + '</'+el.tag+'>';
}
function escapeText(t){ return String(t).replace(/&/g,'&amp;') }
const ATTR=/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
function parse(html,parent){
  const out=[]; const stack=[{children:out}];
  const re=/<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)\s*>|<([a-zA-Z0-9]+)((?:\s+[^>]*?)?)(\/?)>|([^<]+)/g;
  let m;
  while((m=re.exec(html))){
    if(m[0].startsWith('<!--')) continue;
    if(m[1]){ const top=stack.pop(); if(stack.length===0){ out.push(top.el||new El(m[1])) } continue }
    if(m[2]){
      const el=new El(m[2]); applyAttrs(el,m[3]||'');
      el.parent=parent;
      (stack[stack.length-1].children).push(el);
      if(!VOID[el.tag] && !m[4]) stack.push({children:el.children,el});
      if(VOID[el.tag]||m[4]){ /* nothing */ }
      continue
    }
    if(m[5]){ const t=m[5]; const cur=stack[stack.length-1];
      const txt=t.replace(/^\s+|\s+$/g,''); if(txt) cur.children.push(Object.assign(new El('#text'),{text:txt})) }
  }
  return out;
}
function applyAttrs(el,s){
  ATTR.lastIndex=0; let m;
  while((m=ATTR.exec(s))){
    const k=m[1], v=m[2]!==undefined?m[2]:(m[3]!==undefined?m[3]:(m[4]!==undefined?m[4]:''));
    if(k==='id') el.id=v;
    else if(k==='class') el.className=v;
    else if(k==='style') el.attrs.style=v;
    else if(k==='checked') el.checked=true;
    else if(k==='hidden') el.hidden=true;
    else if(k.startsWith('data-')) el.dataset[k.slice(5).replace(/-(\w)/g,(_,c)=>c.toUpperCase())]=v;
    else if(k==='value') el.value=v;
    else el.attrs[k]=v;
  }
}
function matchSimple(el,sel){
  if(el.tag==='#text') return false;
  // 伪类支持：:checked
  const pseudo=(sel.match(/:[a-z]+/g)||[]);
  sel=sel.replace(/:[a-z]+/g,'');
  if(pseudo.includes(':checked') && !el.checked) return false;
  const parts=sel.match(/([a-zA-Z][\w-]*)?(#[\w-]+)?((?:\.[\w-]+)*)((?:\[[^\]]+\])*)/);
  if(!parts) return false;
  const [,tag,id,cls,attr]=parts;
  if(tag && el.tagName!==tag.toUpperCase()) return false;
  if(id && el.id!==id.slice(1)) return false;
  if(cls){ for(const c of cls.split('.').filter(Boolean)) if(!el.classes.has(c)) return false }
  if(attr){ for(const a of attr.match(/\[[^\]]+\]/g)||[]){
      const inner=a.slice(1,-1); const [k,v]=inner.split('=');
      const real=k.startsWith('data-')? k.slice(5).replace(/-(\w)/g,(_,c)=>c.toUpperCase()) : k;
      if(v===undefined){ if(el.dataset[real]===undefined && el.attrs[k]===undefined) return false }
      else { const want=v.replace(/^["']|["']$/g,''); if(String(el.dataset[real])!==want && el.attrs[k]!==want) return false }
    } }
  return true;
}
function walk(el,fn){ el.children.forEach(c=>{ if(c.tag!=='#text'){ fn(c); walk(c,fn) } }) }
function queryAll(root,sel){
  const groups=sel.split(',').map(s=>s.trim()).filter(Boolean);
  const res=[];
  groups.forEach(g=>{
    const chain=g.split(/\s+/);
    let pool=[root];
    chain.forEach((part,i)=>{
      const next=[];
      pool.forEach(p=>walk(p,c=>{ if(matchSimple(c,part) && !next.includes(c)) next.push(c) }));
      pool=next;
    });
    pool.forEach(p=>{ if(!res.includes(p)) res.push(p) });
  });
  return res;
}
function makeDoc(html){
  const doc=new El('#document');
  doc.children=parse(html,doc);
  const byId={}; walk(doc,e=>{ if(e.id) byId[e.id]=e });
  doc.getElementById=id=>byId[id]||null;
  doc.createElement=t=>new El(t);
  doc.body=doc.querySelector('body')||doc;
  doc.documentElement=doc.querySelector('html')||Object.assign(new El('html'),{parent:doc});
  doc.addEventListener=()=>{};
  return doc;
}
module.exports={El,makeDoc,parse,byIdMap:()=>null};
