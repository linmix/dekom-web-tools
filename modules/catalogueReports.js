'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const LOCALES = ['nl-nl','nl-be','en-nl','en-gb'];
const PAIRS = {nl:['nl-nl','nl-be'], en:['en-nl','en-gb']};
const read = f => JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const json = v => JSON.stringify(v,null,2)+'\n';
const sha = v => crypto.createHash('sha256').update(v).digest('hex');
const norm = s => String(s ?? '').replace(/\s+/gu,' ').trim();
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const md = s => String(s ?? '').replace(/[\\`*_{}\[\]<>#|]/g,'\\$&');
const value = v => typeof v === 'string' ? v : JSON.stringify(v,null,2);
const fenced = v => {const s=value(v) ?? 'null'; const fence='`'.repeat(Math.max(3,...[...s.matchAll(/`+/g)].map(m=>m[0].length+1)));return fence+'text\n'+s+'\n'+fence;};
function acquire(root) {
    const dir=path.join(root,'catalogue','.staging');fs.mkdirSync(dir,{recursive:true});
    const f=path.join(dir,'publication.lock');
    if(fs.existsSync(f)){const d=read(f);try{process.kill(d.pid,0);throw new Error('Another report publication is running.');}catch(e){if(e.code!=='ESRCH')throw e;fs.unlinkSync(f);}}
    fs.writeFileSync(f,json({pid:process.pid}),{flag:'wx'});return ()=>fs.unlinkSync(f);
}
function recover(root) {
    const base=path.join(root,'catalogue','.staging','transactions');if(!fs.existsSync(base))return;
    for(const name of fs.readdirSync(base)) {
        const dir=path.join(base,name),journal=path.join(dir,'journal.json');if(!fs.existsSync(journal)){fs.rmSync(dir,{recursive:true,force:true});continue;}
        const j=read(journal), target=path.resolve(root,j.target);
        if(!target.startsWith(path.join(root,'catalogue')+path.sep))throw new Error('Invalid publication recovery target.');
        // The journal exists only until all files have been replaced successfully.
        for(const entry of j.files){if(path.basename(entry.name)!==entry.name)throw new Error('Invalid recovery filename.');const dest=path.join(target,entry.name);if(entry.existed)fs.copyFileSync(path.join(dir,'old-'+entry.name),dest);else if(fs.existsSync(dest))fs.unlinkSync(dest);}
        fs.rmSync(dir,{recursive:true,force:true});
    }
}
function publishBundle(root,target,files) {
    const unlock=acquire(root);
    try {
        recover(root);fs.mkdirSync(target,{recursive:true});
        const tx=path.join(root,'catalogue','.staging','transactions',crypto.randomBytes(8).toString('hex'));fs.mkdirSync(tx,{recursive:true});
        const entries=[];
        for(const [name,body] of Object.entries(files)){
            const dest=path.join(target,name),existed=fs.existsSync(dest);if(existed)fs.copyFileSync(dest,path.join(tx,'old-'+name));
            fs.writeFileSync(path.join(tx,'new-'+name),body,'utf8');entries.push({name,existed});
        }
        fs.writeFileSync(path.join(tx,'journal.json'),json({target:path.relative(root,target),files:entries}));
        try{for(const {name} of entries)fs.renameSync(path.join(tx,'new-'+name),path.join(target,name));}
        catch(e){recover(root);throw e;}
        fs.unlinkSync(path.join(tx,'journal.json'));fs.rmSync(tx,{recursive:true,force:true});
    }finally{unlock();}
}
function pendingChecks(root,data) {
    const f=path.join(root,'catalogue','review','pending-changes.json');if(!fs.existsSync(f))return [];
    const input=read(f);if(!Array.isArray(input.changes))throw new Error('pending-changes.json must contain a changes array.');
    const supported=['display_name','short_description','bullets'];
    return input.changes.filter(c=>c.locale===data.manifest.locale && !['cancelled','withdrawn'].includes(String(c.status||'').toLowerCase())).map(c=>{
        if(!c.change_id || !c.catalogue_id || !Object.hasOwn(c,'accepted_value'))throw new Error('Pending changes require change_id, catalogue_id, locale, field and accepted_value.');
        const matches=data.products.filter(p=>String(p.catalogue_id)===String(c.catalogue_id));
        let state='Pending', observed=null;
        if(!supported.includes(c.field))state='Unsupported field — manual verification required';
        else if(matches.length!==1)state=matches.length?'Ambiguous identity':'Not observed';
        else{observed=matches[0][c.field];state=same(observed,c.accepted_value)?'Verified':'Pending';}
        return {...c,verification:state,observed_value:observed};
    });
}
const labels={
    'naming-review':'Product name difference — review',
    'strict-usp-mismatch':'USP wording/order/typography mismatch',
    'source-whitespace':'Source whitespace difference',
    'prose-difference-no-automatic-alignment':'Prose differs — no automatic alignment',
    'card-variant-set-difference':'Product-card text variants differ',
    'not-observed-in-one-locale':'Counterpart not observed',
    'ambiguous-identity':'Ambiguous catalogue identity',
    'locale-link-review':'Locale link needs review',
    'difference-beyond-bounded-evidence':'Difference beyond captured prose excerpt'
};
const fieldLabels={display_name:'Product name',bullets:'USP bullets',short_description:'Introductory description',descriptive_evidence:'Detailed description',locale_coverage:'Locale coverage',locale_link:'Locale link',card_variants:'Product-card variants',introductory_lists:'Additional introductory lists'};
function showValue(v,field,raw=false){
    if(raw)return fenced(v);
    if(v===null||v===undefined)return '*Not present.*';
    if(field==='card_variants'){
        if(!v.length)return '*No variant observed.*';
        return v.map((c,i)=>`**Variant ${i+1}: ${md(c.display_name||'[name missing]')}**\n\n`+
            showValue(c.bullets,'bullets')+'\n\n'+(c.descriptions?.length?showValue(c.descriptions,'short_description')+'\n\n':'')+
            `Observed in ${c.placement_count} placement(s). Example source locations:\n\n`+
            c.placements.map(p=>`- ${p.source_url} (position ${p.occurrence})`).join('\n')).join('\n\n');
    }
    if(field==='introductory_lists')return v.length?v.map((x,i)=>`**Additional list ${i+1}:**\n\n`+showValue(x.items,'bullets')).join('\n\n'):'*None observed.*';
    if(field==='descriptive_evidence'&&Array.isArray(v)){
        let text=v.map(x=>md(x.text)).join('\n\n');
        if(text.length>3500)text=text.slice(0,3500)+'\n\n*[Excerpt ends; full bounded evidence is in catalogue.json.]*';
        return text||'*No descriptive text captured.*';
    }
    if(Array.isArray(v))return v.length?v.map((x,i)=>(field==='bullets'?`${i+1}. `:'')+md(x)).join(field==='bullets'?'\n':'\n\n'):'*None observed.*';
    return md(v);
}
function findingText(f){
    if(f.kind==='additional-introductory-list')return 'An additional list occurs outside the explicitly styled USP block. It is retained separately; an empty list is a content/markup finding, not a failed extraction.';
    if(f.kind==='intro-content-review')return [f.missing_short_description?'Introductory description is missing.':'',f.unexpected_usp_count?`Observed ${f.usp_count} USP bullet(s); the usual convention is three or four. Review, without automatically rewriting existing content.`:''].filter(Boolean).join(' ');
    if(f.kind==='incomplete-product-card')return `Product card ID ${f.catalogue_id}: ${[f.missing_name?'displayed name missing':'',f.missing_link?'product link missing':''].filter(Boolean).join('; ')}. Occurrence ${f.occurrence}.`;
    if(f.kind==='card-id-absent-from-locale-inventory')return `Card ID ${f.catalogue_id} is not observed in this locale's product inventory. Its identity/publication status remains unresolved; retirement is not inferred.`;
    if(f.kind==='card-name-differs-from-product')return 'The card name differs from the catalogue product name. Review whether the shortened or alternative wording is intentional.';
    if(f.kind==='card-usps-differ-from-product')return 'The card bullets are not an exact ordered subset of the product USP block. Review wording/order/typography; a deliberate selection or alternative presentation may be valid.';
    return md(f.kind);
}
function derivedFindings(data){
    const generated=new Set(['card-name-differs-from-product','card-usps-differ-from-product']);
    data.findings=data.findings.filter(f=>!(generated.has(f.kind)&&f.generated_by==='current-reports'));
    const products=new Map(data.products.map(p=>[p.catalogue_id,p]));
    const placement=new Map();for(const p of data.cards.placements){if(!placement.has(p.content_id))placement.set(p.content_id,{url:p.source_url,count:0});placement.get(p.content_id).count++;}
    for(const [id,c] of Object.entries(data.cards.contents)){
        const p=products.get(c.catalogue_id);if(!p)continue;
        const evidence={catalogue_id:c.catalogue_id,content_id:id,url:placement.get(id)?.url||p.url,placement_count:placement.get(id)?.count||0,generated_by:'current-reports'};
        if(norm(c.display_name)&&norm(c.display_name)!==norm(p.display_name))data.findings.push({...evidence,kind:'card-name-differs-from-product',card_name:c.display_name,product_name:p.display_name});
        let pos=0;const canonical=p.bullets.map(norm);const ordered=c.bullets.every(b=>{const at=canonical.indexOf(norm(b),pos);if(at<0)return false;pos=at+1;return true;});
        if(!ordered)data.findings.push({...evidence,kind:'card-usps-differ-from-product',card_bullets:c.bullets,product_bullets:p.bullets});
    }
    data.manifest.content_findings_count=data.findings.length;
    return data;
}
function sizeData(data){for(let i=0;i<5;i++){const size=Buffer.byteLength(json(data));if(data.manifest.compact_data_bytes===size)return;data.manifest.compact_data_bytes=size;}}
function renderReport(data) {
    const m=data.manifest, products=new Map(data.products.map(p=>[p.catalogue_id,p]));
    const lines=[`# Catalogue report — ${m.locale}`,'',`Status: **${m.complete?'COMPLETE extraction':'INCOMPLETE extraction'}**. Content has not been certified as correct.`,
        `Observed/exported: ${m.exported_at}. Source reference: ${m.run_id}.`,'',
        '| Measure | Count |','|---|---:|',`| Expected / read pages | ${m.expected_pages ?? '?'} / ${m.read_pages ?? '?'} |`,
        `| Products / distinct IDs | ${data.products.length} / ${m.distinct_catalogue_ids ?? '?'} |`,
        `| Card placements | ${data.cards.placements.length} |`,`| Extraction exceptions | ${m.issues.length} |`,
        `| Content findings | ${data.findings.length} |`,`| Documented exclusions | ${(m.scope_exclusions||[]).length} |`,'',
        '## Coverage and limits','',m.coverage_limit || 'Coverage could not be established.',
        'Naming and technical claims require editorial/source review. This report does not automatically rewrite content. Prose differences between paired locales do not automatically require alignment.','',
        `Same-language comparison: ../../comparisons/${m.locale.startsWith('nl')?'nl':'en'}/REPORT.md`,'', '## Extraction exceptions',''];
    if(!m.issues.length)lines.push('None.','');
    for(const e of m.issues)lines.push(`### ${md(e.kind)}`,'',e.url||'',fenced(e),'');
    lines.push('## Scope exclusions','');if(!(m.scope_exclusions||[]).length)lines.push('None.','');
    for(const e of m.scope_exclusions||[])lines.push(e.url,'',e.reason||'',fenced(e),'');
    lines.push('## Content findings','');if(!data.findings.length)lines.push('None.','');
    for(const [i,f] of data.findings.entries()){
        const p=products.get(f.catalogue_id)||data.products.find(p=>p.url===f.url);
        lines.push(`### ${i+1}. ${md(p?.display_name||f.display_name||f.catalogue_id||'Page finding')}`,'',findingText(f),'',f.url||p?.url||f.target_url||'','');
        if(f.kind==='additional-introductory-list')lines.push(showValue(f.lists,'introductory_lists'),'');
        if(f.kind==='card-name-differs-from-product')lines.push('**Card name:** '+md(f.card_name),'','**Product name:** '+md(f.product_name),'');
        if(f.kind==='card-usps-differ-from-product')lines.push('**Card bullets:**','',showValue(f.card_bullets,'bullets'),'','**Product USP block:**','',showValue(f.product_bullets,'bullets'),'');
        if(p&&f.kind==='intro-content-review')lines.push('**Observed introductory copy:**','',showValue(p.short_description,'short_description'),'','**Observed USP bullets (ordered):**','',showValue(p.bullets,'bullets'),'');
        if(f.placement_count)lines.push(`Observed in ${f.placement_count} placement(s); all locations remain in catalogue.json.`,'');
    }
    lines.push('## Accepted-change verification','');
    if(!data.pending_changes.length)lines.push('No applicable pending-changes log entries.','');
    for(const c of data.pending_changes)lines.push(`### ${md(c.change_id)} — ${md(c.verification)}`,'',`Catalogue ID ${c.catalogue_id}; field: ${fieldLabels[c.field]||c.field}.`,'','**Accepted value:**','',showValue(c.accepted_value,c.field),'','**Observed value:**','',showValue(c.observed_value,c.field),'');
    lines.push('## Other extraction warnings','');if(!(m.warnings||[]).length)lines.push('None.','');
    for(const w of m.warnings||[])lines.push(fenced(w),'');
    lines.push('## Files','', '`catalogue.json` contains the full current observations, card placement evidence and findings. No historical scan series is retained. A `FAILURE.md`, when present, describes a newer failed attempt; the complete data may then be stale.','');
    return lines.join('\n');
}
function cleanLegacy(root,locale,allowFailureOnly=false) {
    const dir=path.join(root,'catalogue','exports',locale),current=path.join(dir,'catalogue.json');
    if(fs.existsSync(current)) {const d=read(current);if(!d.manifest?.complete || d.manifest.locale!==locale || !Array.isArray(d.products))return;}
    else if(!allowFailureOnly || !fs.existsSync(path.join(dir,'FAILURE.md')))return;
    for(const name of fs.readdirSync(dir)) {
        if(!/^\d{8}T\d{9}Z-[a-f0-9]{8}$/.test(name))continue;
        const p=path.join(dir,name);if(!fs.statSync(p).isDirectory())continue;
        const allowed=['manifest.json','products.json','cards.json','findings.json'];
        if(fs.readdirSync(p).some(f=>!allowed.includes(f)))continue;
        try{const m=read(path.join(p,'manifest.json'));if(m.locale!==locale||m.run_id!==name||!String(m.parser_version).startsWith('dekom-catalogue-'))continue;}
        catch{continue;}
        fs.rmSync(p,{recursive:true});
    }
    const pointer=path.join(dir,'latest.json');
    if(fs.existsSync(pointer)){const p=read(pointer);if(String(p.parser_version).startsWith('dekom-catalogue-')&&/^\d{8}T\d{9}Z-[a-f0-9]{8}$/.test(p.run_id))fs.unlinkSync(pointer);}
}
function refreshPendingReport(root,data) {data.pending_changes=pendingChecks(root,data);return data;}
function publishData(root,data) {
    const dir=path.join(root,'catalogue','exports',data.manifest.locale);data.schema_version=2;derivedFindings(data);refreshPendingReport(root,data);sizeData(data);
    if(data.manifest.complete){
        publishBundle(root,dir,{'catalogue.json':json(data),'REPORT.md':renderReport(data)});
        if(fs.existsSync(path.join(dir,'FAILURE.md')))fs.unlinkSync(path.join(dir,'FAILURE.md'));
        cleanLegacy(root,data.manifest.locale);
    } else {
        const prior=fs.existsSync(path.join(dir,'catalogue.json'))?read(path.join(dir,'catalogue.json')):null;
        const intro='# Latest catalogue export attempt failed\n\n'+(prior?`The previous complete data from ${prior.manifest.exported_at} is retained and may be stale.\n\n`:'No complete current baseline is available.\n\n');
        const files={'FAILURE.md':intro+renderReport(data)};
        if(prior)files['REPORT.md']='# Latest attempt INCOMPLETE — retained complete data below\n\nSee [FAILURE.md](FAILURE.md) for the latest attempt. The data below is the last successful export, not a successful result for the new attempt.\n\n'+renderReport(prior);
        publishBundle(root,dir,files);
    }
    refreshComparisons(root);
}
function recordFailure(root,locale,error) {
    const data={manifest:{locale,run_id:'failed-'+new Date().toISOString(),exported_at:new Date().toISOString(),complete:false,issues:[{kind:'operational-error',message:error.message}],warnings:[]},products:[],cards:{contents:{},placements:[]},findings:[],pending_changes:[]};
    const dir=path.join(root,'catalogue','exports',locale);
    const files={'FAILURE.md':'# Latest catalogue export attempt failed\n\nAny retained complete data may be stale.\n\n'+renderReport(data)};
    try{const prior=read(path.join(dir,'catalogue.json'));files['REPORT.md']='# Latest attempt FAILED — retained complete data below\n\nSee [FAILURE.md](FAILURE.md) for the latest attempt.\n\n'+renderReport(prior);}catch{}
    publishBundle(root,dir,files);
    try{refreshComparisons(root);}catch(reportError){console.error('Comparison refresh failed: '+reportError.message);}
    return data.manifest;
}
function migrateLegacy(root) {
    for(const locale of LOCALES){
        const dir=path.join(root,'catalogue','exports',locale);if(!fs.existsSync(dir))continue;
        if(fs.existsSync(path.join(dir,'catalogue.json'))){cleanLegacy(root,locale);continue;}
        const runs=[];
        for(const n of fs.readdirSync(dir)){if(!/^\d{8}T\d{9}Z-[a-f0-9]{8}$/.test(n))continue;
            try{const p=path.join(dir,n),m=read(path.join(p,'manifest.json'));if(m.locale!==locale||m.run_id!==n)continue;
                runs.push({manifest:m,products:read(path.join(p,'products.json')),cards:read(path.join(p,'cards.json')),findings:fs.existsSync(path.join(p,'findings.json'))?read(path.join(p,'findings.json')):[],pending_changes:[]});}catch{}}
        runs.sort((a,b)=>a.manifest.exported_at.localeCompare(b.manifest.exported_at));
        const complete=runs.filter(d=>d.manifest.complete).at(-1),last=runs.at(-1);
        if(complete){complete.schema_version=2;derivedFindings(complete);refreshPendingReport(root,complete);sizeData(complete);publishBundle(root,dir,{'catalogue.json':json(complete),'REPORT.md':renderReport(complete)});}
        if(last&&!last.manifest.complete){derivedFindings(last);refreshPendingReport(root,last);
            const files={'FAILURE.md':'# Latest catalogue export attempt failed\n\nMigrated diagnostic report; any retained complete data is older.\n\n'+renderReport(last)};
            if(complete)files['REPORT.md']='# Latest attempt INCOMPLETE — retained complete data below\n\nSee [FAILURE.md](FAILURE.md).\n\n'+renderReport(complete);
            publishBundle(root,dir,files);
        }
        if(complete || last)cleanLegacy(root,locale,!complete);
        // Without a complete baseline, keep the original diagnostics until a successful replacement exists.
    }
}
function summarizeValues(list){return list.map(v=>typeof v==='string'?norm(v):v);}
function comparePair(left,right) {
    const differences=[],lm=new Map(),rm=new Map();
    for(const p of left.products){if(!lm.has(p.catalogue_id))lm.set(p.catalogue_id,[]);lm.get(p.catalogue_id).push(p);}
    for(const p of right.products){if(!rm.has(p.catalogue_id))rm.set(p.catalogue_id,[]);rm.get(p.catalogue_id).push(p);}
    const add=(id,field,a,b,kind,urls)=>differences.push({catalogue_id:id,field,kind,left_value:a,right_value:b,...urls});
    for(const id of new Set([...lm.keys(),...rm.keys()])){
        const aa=lm.get(id)||[],bb=rm.get(id)||[];
        if(aa.length!==1||bb.length!==1){add(id,'locale_coverage',aa.map(p=>p.url),bb.map(p=>p.url),aa.length>1||bb.length>1?'ambiguous-identity':'not-observed-in-one-locale',{});continue;}
        const a=aa[0],b=bb[0],urls={left_url:a.url,right_url:b.url,left_name:a.display_name,right_name:b.display_name};
        if(!same(a.display_name,b.display_name))add(id,'display_name',a.display_name,b.display_name,norm(a.display_name)===norm(b.display_name)?'source-whitespace':'naming-review',urls);
        if(!same(a.bullets,b.bullets))add(id,'bullets',a.bullets,b.bullets,same(summarizeValues(a.bullets),summarizeValues(b.bullets))?'source-whitespace':'strict-usp-mismatch',urls);
        if(!same(a.short_description,b.short_description))add(id,'short_description',a.short_description,b.short_description,same(summarizeValues(a.short_description),summarizeValues(b.short_description))?'source-whitespace':'prose-difference-no-automatic-alignment',urls);
        if(!same(a.introductory_lists||[],b.introductory_lists||[]))add(id,'introductory_lists',a.introductory_lists||[],b.introductory_lists||[],'prose-difference-no-automatic-alignment',urls);
        const ae=a.descriptive_evidence||[],be=b.descriptive_evidence||[];
        if(!same(ae,be))add(id,'descriptive_evidence',ae,be,same(ae.map(x=>norm(x.text)),be.map(x=>norm(x.text)))?'source-whitespace':'prose-difference-no-automatic-alignment',urls);
        else if(a.descriptive_evidence_sha256!==b.descriptive_evidence_sha256)add(id,'descriptive_evidence',a.descriptive_evidence_sha256,b.descriptive_evidence_sha256,'difference-beyond-bounded-evidence',urls);
        for(const [p,other] of [[a,b],[b,a]])if(p.locale_links?.[other.locale]&&new URL(p.locale_links[other.locale]).href!==new URL(other.url).href)add(id,'locale_link',p.locale_links[other.locale],other.url,'locale-link-review',urls);
    }
    function cardVariants(data){const groups=new Map(),byContent=new Map();
        for(const p of data.cards.placements){if(!byContent.has(p.content_id))byContent.set(p.content_id,[]);byContent.get(p.content_id).push({source_url:p.source_url,occurrence:p.occurrence});}
        for(const [contentId,c] of Object.entries(data.cards.contents)){
        const identity=JSON.stringify([c.display_name,c.bullets,c.descriptions]);if(!groups.has(c.catalogue_id))groups.set(c.catalogue_id,new Map());
        const values=groups.get(c.catalogue_id);if(!values.has(identity))values.set(identity,{display_name:c.display_name,bullets:c.bullets,descriptions:c.descriptions,placements:[]});
        const v=values.get(identity);v.placements.push(...(byContent.get(contentId)||[]));
    }return groups;}
    const lc=cardVariants(left),rc=cardVariants(right);
    for(const id of new Set([...lc.keys(),...rc.keys()])){
        const a=lc.get(id)||new Map(),b=rc.get(id)||new Map();if(same([...a.keys()].sort(),[...b.keys()].sort()))continue;
        const short=values=>[...values.values()].map(v=>({...v,placement_count:v.placements.length,placements:v.placements.slice(0,8)}));
        const normalized=m=>[...new Set([...m.values()].map(v=>JSON.stringify([norm(v.display_name),v.bullets.map(norm),(v.descriptions||[]).map(norm)])))].sort();
        add(id,'card_variants',short(a),short(b),same(normalized(a),normalized(b))?'source-whitespace':'card-variant-set-difference',{});
    }
    return differences.sort((a,b)=>(a.kind==='source-whitespace')-(b.kind==='source-whitespace'));
}
function renderComparison(result) {
    const lines=[`# Same-language catalogue comparison — ${result.pair.join(' ↔ ')}`,'',`Status: **${result.status}**. Generated: ${result.generated_at}.`,'',
        'Inputs:',...result.inputs.map(i=>`- ${i.locale}: ${i.run_id||'no complete data'}; ${i.exported_at||'unknown date'}${i.latest_attempt_failed?'; newer failed attempt — retained data may be stale':''}`),'',
        'Shared catalogue IDs identify candidate equivalents; SKU, generation and kit scope are not independently verified by this comparison. Names are review candidates, not manufacturer-verified corrections. Prose differences do not automatically require alignment; grammar/facts still need review. USP mismatches require a consistency decision. Card variant sets are compared without assuming that page placements are equivalent.',''];
    if(result.status==='BLOCKED')lines.push('A complete baseline is missing. No differences or missing publications are inferred.','');
    else{const counts={};for(const d of result.differences)counts[d.kind]=(counts[d.kind]||0)+1;lines.push('## Summary','',...Object.entries(counts).map(([k,v])=>`- ${labels[k]||k}: ${v}`),'');}
    for(const [i,d] of result.differences.entries()){
        lines.push(`## ${i+1}. ${md(d.left_name||d.right_name||d.catalogue_id)} — ${md(fieldLabels[d.field]||d.field)}`,'',`Catalogue ID: ${d.catalogue_id}. ${labels[d.kind]||d.kind}.`,d.left_url||'',d.right_url||'','');
        for(const [label,v] of [[result.pair[0],d.left_value],[result.pair[1],d.right_value]]){
            lines.push(`### ${label}`,'',showValue(v,d.field,d.kind==='source-whitespace'),'');
        }
    }
    lines.push('## Pending accepted changes','');
    if(!result.pending_changes.length)lines.push('None logged.','');
    for(const p of result.pending_changes)lines.push(`### ${md(p.change_id)} — ${md(p.verification)}`,'',`Locale ${p.locale}; ID ${p.catalogue_id}; ${fieldLabels[p.field]||p.field}.`,'','**Accepted:**','',showValue(p.accepted_value,p.field),'','**Observed:**','',showValue(p.observed_value,p.field),'');
    return lines.join('\n');
}
function refreshComparisons(root) {
    for(const [lang,pair] of Object.entries(PAIRS)){
        const inputs=pair.map(locale=>{const dir=path.join(root,'catalogue','exports',locale),f=path.join(dir,'catalogue.json');return {locale,data:fs.existsSync(f)?read(f):null,latest_attempt_failed:fs.existsSync(path.join(dir,'FAILURE.md'))};});
        const result={schema_version:1,pair,generated_at:new Date().toISOString(),status:inputs.some(i=>!i.data)?'BLOCKED':inputs.some(i=>i.latest_attempt_failed)?'STALE INPUT':'CURRENT',
            inputs:inputs.map(i=>({locale:i.locale,run_id:i.data?.manifest.run_id||null,exported_at:i.data?.manifest.exported_at||null,latest_attempt_failed:i.latest_attempt_failed})),
            differences:inputs.every(i=>i.data)?comparePair(inputs[0].data,inputs[1].data):[],pending_changes:inputs.flatMap(i=>i.data?pendingChecks(root,i.data):[])};
        publishBundle(root,path.join(root,'catalogue','comparisons',lang),{'comparison.json':json(result),'REPORT.md':renderComparison(result)});
    }
}
module.exports={publishBundle,recover,publishData,recordFailure,migrateLegacy,refreshComparisons,comparePair,renderReport,pendingChecks,cleanLegacy};
