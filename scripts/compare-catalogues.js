'use strict';
const path=require('path');
const reports=require('../modules/catalogueReports');
const args=process.argv.slice(2);
if(args.some(a=>a!=='--sync')||args.length>1){console.error('Usage: node scripts/compare-catalogues.js [--sync]');process.exitCode=1;}
else try{
    const root=path.resolve(__dirname,'..');
    reports.migrateLegacy(root);reports.refreshComparisons(root);
    console.log('Comparison reports: catalogue/comparisons/nl/REPORT.md and catalogue/comparisons/en/REPORT.md');
    if(args.includes('--sync'))require('../modules/syncGdrive')();
}catch(error){console.error('Catalogue comparison failed: '+error.message);process.exitCode=1;}
