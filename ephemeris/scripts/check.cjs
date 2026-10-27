// Offline runtime checks by default; opt into local research/browser tooling.
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'), repo=path.dirname(root);
const options=new Set(process.argv.slice(2));
function run(command,args,settings={}) {
  const result=spawnSync(command,args,{cwd:repo,stdio:'inherit',...settings});
  if (result.error) throw result.error;
  if (result.status!==0) throw new Error(command+' failed ('+result.status+').');
}
(async()=>{
  for (const option of options) if (!['--browser','--research'].includes(option)) throw new Error('Unknown option: '+option);
  const {validateSite}=await import(pathToFileURL(path.join(__dirname,'validate.mjs')));
  const {files,record}=await validateSite(root);
  for (const file of files.filter(file=>/\.(mjs|js)$/.test(file))) {
    const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:fs.readFileSync(path.join(root,file)),encoding:'utf8'});
    if (result.status!==0) throw new Error(file+': '+result.stderr);
  }
  for (const file of fs.readdirSync(__dirname).filter(file=>/\.(mjs|cjs)$/.test(file))) run(process.execPath,['--check',path.join(__dirname,file)]);
  console.log('Runtime preflight: '+files.length+' assets, '+record.samples.length+' epochs, '+record.events.length+' transits.');
  const tests=path.join(root,'tests');
  if (fs.existsSync(tests)) {
    const files=fs.readdirSync(tests).filter(file=>file.endsWith('.test.mjs')).map(file=>path.join(tests,file));
    if (files.length) run(process.execPath,['--test',...files]);
  } else console.log('Local behavior tests are absent in this checkout (ignored authoring resources).');
  if (options.has('--research')) {
    const python=process.env.EPHEMERIS_PYTHON || path.join(root,'research/.venv/bin/python3');
    if (!fs.existsSync(python)) throw new Error('Set EPHEMERIS_PYTHON or create research/.venv using research/requirements.txt.');
    for (const prototype of ['phase-prototype','field-prototype']) run(python,['-m','unittest','discover','-s',path.join(root,'research',prototype),'-p','test_*.py']);
  }
  if (options.has('--browser')) {
    const file=path.join(tests,'browser.cjs');
    if (!fs.existsSync(file)) throw new Error('Local browser suite is missing; restore the authoring backup.');
    run(process.execPath,[file]);
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
