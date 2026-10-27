// Shared publication boundary for the standalone and portfolio builds.
const fs = require('node:fs');
const path = require('node:path');
const files = ['index.html', 'style.css', 'script.js', 'prompts.json', 'counts.json', 'favicon.ico', 'og-image.jpg'];
function isRuntimeFile(file) {
  if (file.split('/').some(part => part.startsWith('.') || part === '..')) return false;
  return files.includes(file) || /^prompts\/[^/]+\.json$/.test(file)
    || /^images\/.+\.(?:jpe?g|png|webp|gif|svg)$/i.test(file);
}
function runtimeFiles(root = path.resolve(__dirname, '..')) {
  const result = [...files];
  function walk(directory) {
    for (const entry of fs.readdirSync(path.join(root, directory), {withFileTypes: true})) {
      if (entry.name.startsWith('.')) continue;
      const file = directory + '/' + entry.name;
      if (entry.isDirectory()) walk(file);
      else if (isRuntimeFile(file)) {
        if (!entry.isFile()) throw new Error('Runtime asset is not a regular file: ' + file);
        result.push(file);
      }
    }
  }
  for (const directory of ['prompts', 'images']) walk(directory);
  return result.sort();
}
function countsFromPrompts(root = path.resolve(__dirname, '..')) {
  return Object.fromEntries(JSON.parse(fs.readFileSync(path.join(root, 'prompts.json'))).map(({id}) => {
    const file = path.join(root, 'prompts', id + '.json');
    return [id, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)).length : 0];
  }));
}
module.exports = {runtimeFiles, isRuntimeFile, countsFromPrompts};
