const fs = require('node:fs');
process.chdir(require('node:path').resolve(__dirname, '..'));
fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist');
for (const name of ['index.html', 'styles.css', 'script.js', 'favicon.svg']) {
  fs.copyFileSync(name, `dist/${name}`);
}
