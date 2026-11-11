'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..'), SITES=['nl-nl','nl-be','en-nl','en-gb'];
const LEADERS={'nl-nl':'nl-nl','nl-be':'nl-nl','en-nl':'en-nl','en-gb':'en-nl'};
const read=p=>fs.existsSync(p)?fs.readFileSync(p,'utf8'):null;
const norm=u=>{try{return new URL(u).pathname.replace(/\/+$/,'')||'/'}catch{return u.split('?')[0].replace(/\/+$/,'')}};
const setFrom=(s)=>new Set([...s.matchAll(/^URL:\s*(https?:\/\/[^\s]+)/gm)].map(m=>norm(m[1])));
const batchId=s=>{let m=s.match(/^(\d+)-/);return m?m[1]:null};
const parseSummary=s=>{let res={}; if(!s)return res;
 const ix=s.indexOf('## Batches');if(ix<0)return res;
 const section=s.slice(ix).split(/\r?\n## /)[0];
 const heads=[...section.matchAll(/^### (\d+) — ([^\r\n]+)/gm)];
 for(let i=0;i<heads.length;i++){
  const h=heads[i],chunk=section.slice(h.index,(heads[i+1]?.index??section.length));
  const n=k=>Number(chunk.match(new RegExp('^- '+k+': (\\d+)','m'))?.[1]||0);
  res[h[1]]={name:h[2],reviewed:n('Reviewed pages'),components:n('Components'),live:n('LIVE'),pending:n('PENDING'),mismatch:n('MISMATCH'),match:n('MATCH'),differs:n('DIFFERS'),missing:n('PAGE MISSING'),report:chunk.match(/^- Report: (.+)$/m)?.[1]?.trim()};
 }return res;
};
const leaderData={},followers={},batchSources={};
for(const leader of ['nl-nl','en-nl']){
 const base=path.join(ROOT,'SEO',leader);
 const report=read(path.join(base,'review','decisions.md'));
 leaderData[leader]={text:report,summary:parseSummary(report),updated:report?.match(/^Last updated: (.+)$/m)?.[1]};
 const folder=path.join(base,'batches');
 batchSources[leader]={};
 if(fs.existsSync(folder))for(const fname of fs.readdirSync(folder)){
  const id=batchId(fname);if(!id||!/\.md$/i.test(fname)||fname==='batch-tree.md')continue;
  const source=read(path.join(folder,fname))||'';
  if(!/^# SEO Batch \d+/.test(source))continue;
  const pages=setFrom(source);
  if(!pages.size)continue;
  // Duplicate stale files: prefer newest file
  const old=batchSources[leader][id];
  const mtime=fs.statSync(path.join(folder,fname)).mtimeMs;
  if(!old||mtime>=old.mtime)batchSources[leader][id]={pages,name:source.match(/^# SEO Batch \d+ — (.+)$/m)?.[1]||fname,mtime};
 }
}
for(const site of ['nl-be','en-gb']){
 const s=read(path.join(ROOT,'SEO',site,'review','decisions.md'));
 followers[site]={summary:parseSummary(s),leaderUpdated:s?.match(/^Authoritative decisions last updated: (.+)$/m)?.[1],text:s};
}
const allIds=[...new Set(Object.values(batchSources).flatMap(o=>Object.keys(o)).concat(Object.values(leaderData).flatMap(o=>Object.keys(o.summary))))].sort((a,b)=>Number(a)-Number(b));
const table=[],counts=Object.fromEntries(SITES.map(s=>[s,{Reviewed:0,Pending:0,'Check needed':0,'—':0}]));
function status(site,id){
 const leader=LEADERS[site],info=leaderData[leader].summary[id],source=batchSources[leader][id];
 if(!info||!info.reviewed)return '—';
 // Compare exact batch page membership with recorded per-batch reviews, not counts alone.
 if(source){
   const report=info.report&&read(path.join(ROOT,'SEO',leader,'review',info.report));
   if(report){
     const recorded=setFrom(report);
     if(recorded.size!==source.pages.size||[...source.pages].some(p=>!recorded.has(p)))return 'Check needed';
   } else if(info.reviewed!==source.pages.size)return 'Check needed';
 }
 if(site===leader)return info.pending||info.mismatch||info.live<info.components?'Pending':'Reviewed';
 const follower=followers[site],f=follower.summary[id];
 if(!f)return 'Pending';
 const lt=Date.parse(leaderData[leader].updated||''),ft=Date.parse(follower.leaderUpdated||'');
 if(Number.isFinite(lt)&&(!Number.isFinite(ft)||ft<lt))return 'Pending';
 return f.differs||f.missing||f.match<f.components?'Pending':'Reviewed';
}
for(const id of allIds){
 const title=(batchSources['en-nl'][id]?.name||batchSources['nl-nl'][id]?.name||leaderData['en-nl'].summary[id]?.name||leaderData['nl-nl'].summary[id]?.name||'Unlabelled batch').replace(/\|/g,'/');
 const cells=SITES.map(site=>{const s=status(site,id);counts[site][s]++;return s==='Reviewed'?'✓ Reviewed':s==='Pending'?'… Pending':s==='Check needed'?'! Check needed':'—'});
 table.push(`| ${id} — ${title} | ${cells.join(' | ')} |`);
}
let out=`# SEO batch progress\n\nGenerated: ${new Date().toISOString()}\n\nThis report is generated automatically. Do not edit it manually.\n\n`;
out+='**Legend:** ✓ Reviewed = decisions recorded and live (followers: matching); … Pending = approved decisions not fully live/matched or follower verification out of date; ! Check needed = batch membership changed since review; — = no recorded decisions.\n\n';
out+='| Batch | nl-nl | nl-be | en-nl | en-gb |\n|---|---|---|---|---|\n'+table.join('\n')+'\n\n';
out+='## Summary\n\n| Site | Reviewed | Pending | Check needed | — |\n|---|---:|---:|---:|---:|\n';
for(const site of SITES){const c=counts[site];out+=`| ${site} | ${c.Reviewed} | ${c.Pending} | ${c['Check needed']} | ${c['—']} |\n`;}
out+='\n**Sources:** leader `SEO/<leader>/review/decisions.md`, per-batch review files, current leader batch Markdown files, and follower review summaries. Batch membership is generated upstream from the configured SEO scan scope (`cache/<site>/urls-check.json`).\n';
const target=path.join(ROOT,'SEO','batch-progress.md');
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,out,'utf8');
console.log('Batch progress updated:',target);
