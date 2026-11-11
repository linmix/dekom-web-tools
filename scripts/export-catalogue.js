'use strict';
const {exportCatalogue} = require('../modules/exportCatalogue');
const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
    console.log('Usage: node scripts/export-catalogue.js <nl-nl|nl-be|en-nl|en-gb> [--sync]');
    console.log('Offline export of retained full cache; no download. --sync invokes the existing Drive synchronization after export, including incomplete diagnostics.');
    process.exitCode = args.length ? 0 : 1;
} else if (args.length > 2 || args.slice(1).some(a => a !== '--sync')) {
    console.error('Unknown arguments. Use --help.'); process.exitCode = 1;
} else {
    try {
        const manifest = exportCatalogue(args[0]);
        if (args.includes('--sync')) require('../modules/syncGdrive')();
        if (!manifest.complete) process.exitCode = 2;
    } catch (error) { console.error('Catalogue export failed: ' + error.message); process.exitCode = 1; }
}
