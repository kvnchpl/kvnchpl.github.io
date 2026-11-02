const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

async function build(root=path.resolve(__dirname,'..')) {
  const {validateSite}=await import(pathToFileURL(path.join(__dirname,'validate.mjs')));
  const {files}=await validateSite(root);
  const stage=fs.mkdtempSync(path.join(root,'.dist-stage-'));
  const destination=path.join(root,'dist'), previous=stage+'-previous';
  try {
    for (const file of files) {
      const output=path.join(stage,file);fs.mkdirSync(path.dirname(output),{recursive:true});
      fs.copyFileSync(path.join(root,file),output);
    }
    if (fs.existsSync(destination)) fs.renameSync(destination,previous);
    try {fs.renameSync(stage,destination);}
    catch (error) {
      if (fs.existsSync(previous)) fs.renameSync(previous,destination);
      throw error;
    }
    fs.rmSync(previous,{recursive:true,force:true});
  } finally {fs.rmSync(stage,{recursive:true,force:true});}
  return files;
}
module.exports = {build};
if (require.main === module) build().then(files=>console.log('Validated and packaged '+files.length+' runtime assets.')).catch(error=>{console.error(error.message);process.exitCode=1;});
