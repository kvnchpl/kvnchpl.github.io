const fs = require('node:fs');
const path = require('node:path');
const {runtimeFiles, countsFromPrompts} = require('./runtime.cjs');
function build(root = path.resolve(__dirname, '..')) {
  const files = runtimeFiles(root);
  const counts = countsFromPrompts(root);
  // Validate all inputs before replacing any previous output.
  for (const file of files) if (file !== 'counts.json' && !fs.lstatSync(path.join(root, file)).isFile()) throw new Error('Runtime asset is not a regular file: ' + file);
  const stage = fs.mkdtempSync(path.join(root, '.dist-stage-'));
  const destination = path.join(root, 'dist');
  const previous = stage + '-previous';
  try {
    for (const file of files) {
      const output = path.join(stage, file);
      fs.mkdirSync(path.dirname(output), {recursive: true});
      if (file === 'counts.json') fs.writeFileSync(output, JSON.stringify(counts));
      else fs.copyFileSync(path.join(root, file), output);
    }
    if (fs.existsSync(destination)) fs.renameSync(destination, previous);
    try { fs.renameSync(stage, destination); }
    catch (error) { if (fs.existsSync(previous)) fs.renameSync(previous, destination); throw error; }
    fs.rmSync(previous, {recursive: true, force: true});
  } finally { fs.rmSync(stage, {recursive: true, force: true}); }
  return files;
}
module.exports = {build};
if (require.main === module) build();
