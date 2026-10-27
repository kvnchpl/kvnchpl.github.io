// Shared publication boundary for the standalone and portfolio builds.
const fs = require('node:fs');
const path = require('node:path');
function runtimeFiles(root) {
  return ['index.html','styles.css','script.js','field.js','field-year.json','field-transits.json','favicon.svg',
    'vendor/chart.umd-4.6.1.js','vendor/chartjs-LICENSE.txt',
    ...fs.readdirSync(path.join(root,'lib')).filter(name => name.endsWith('.mjs')).sort().map(name => 'lib/'+name)];
}
function isRuntimeFile(file, root=path.resolve(__dirname,'..')) {
  return runtimeFiles(root).includes(file);
}
module.exports = {runtimeFiles, isRuntimeFile};
