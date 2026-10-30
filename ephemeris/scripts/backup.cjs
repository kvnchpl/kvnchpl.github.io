// Research and local tests are intentionally ignored; keep a separate archive.
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'../..');
const directory=path.join(repo,'.repo-backups/ephemeris');
const files=['ephemeris/.private/research','ephemeris/tests','ephemeris/README.md','.private/PROJECTS.md','.private/tests/netlify-hosting.test.mjs'];
for (const file of files) if (!fs.existsSync(path.join(repo,file))) throw new Error('Missing authoring source: '+file);
fs.mkdirSync(directory,{recursive:true});
const archive=path.join(directory,'ephemeris-authoring-'+new Date().toISOString().replace(/[:.]/g,'-')+'.tar.gz');
if (fs.existsSync(archive)) throw new Error('Backup already exists.');
try {
  execFileSync('tar',['-czf',archive,'--exclude=__pycache__','--exclude=.venv','--exclude=.DS_Store','-C',repo,...files],{stdio:'inherit',env:{...process.env,COPYFILE_DISABLE:'1'}});
  execFileSync('tar',['-tzf',archive],{stdio:'ignore'});
  console.log('Verified authoring backup: '+archive);
} catch(error) {fs.rmSync(archive,{force:true});throw error;}
