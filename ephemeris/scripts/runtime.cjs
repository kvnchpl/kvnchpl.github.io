// Publication boundary for the standalone site, not the research tree.
const fs = require('node:fs');
const path = require('node:path');
function runtimeFiles(root) {
  return ['index.html','styles.css','script.js','field.js','field-year.json','favicon.svg',
    'vendor/chart.umd-4.6.1.js','vendor/chartjs-LICENSE.txt',
    ...fs.readdirSync(path.join(root,'lib')).filter(name => name.endsWith('.mjs')).sort().map(name => 'lib/'+name)];
}
module.exports = {runtimeFiles};
