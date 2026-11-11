'use strict';
const axios = require('axios');
const cheerio = require('cheerio');
const localName = node => String(node?.tagName || node?.name || '').split(':').pop().toLowerCase();
function parseSitemap(input) {
    const text=String(input).replace(/^\uFEFF/,'').trim();
    if(!text)return {kind:'plain',locations:[]};
    if(text.startsWith('<')) {
        const $=cheerio.load(text,{xmlMode:true});
        const root=$.root().children().filter((i,e)=>['urlset','sitemapindex'].includes(localName(e))).first();
        if(!root.length)throw new Error('Expected a sitemap urlset/index, not an HTML or unknown XML response.');
        const index=localName(root[0])==='sitemapindex',entry=index?'sitemap':'url';
        const locations=[];
        root.children().filter((i,e)=>localName(e)===entry).each((i,e)=>{
            const loc=$(e).children().filter((j,c)=>localName(c)==='loc');
            if(loc.length!==1)throw new Error('Missing or ambiguous sitemap loc element.');
            locations.push(loc.text().trim());
        });
        return {kind:index?'index':'urlset',locations};
    }
    // Dutch sitemaps can be plain newline-delimited URL lists.
    const locations=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    if(locations.some(s=>!/^https?:\/\/[^\s<>"]+$/.test(s)))throw new Error('Expected a newline-delimited URL list or sitemap XML.');
    return {kind:'plain',locations};
}
async function loadUrls(sitemapUrl) {
    const origin=new URL(sitemapUrl),visited=new Set(),urls=new Set();
    function accepted(value){const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&u.hostname===origin.hostname;}
    async function visit(url,depth){
        if(depth>8)throw new Error('Sitemap index nesting exceeds the supported limit.');
        if(visited.has(url))return;visited.add(url);
        const response=await axios.get(url),parsed=parseSitemap(response.data);
        for(const value of parsed.locations){
            if(!accepted(value)){console.warn('Ignored off-site sitemap entry: '+value);continue;}
            if(parsed.kind==='index')await visit(value,depth+1);else urls.add(value);
        }
    }
    await visit(sitemapUrl,0);
    if(!urls.size)throw new Error('Sitemap contains no same-host content URLs; cache has not been cleared.');
    return [...urls];
}
module.exports=loadUrls;
module.exports.parseSitemap=parseSitemap;
