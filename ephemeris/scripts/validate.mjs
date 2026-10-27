import {readFile, lstat} from 'node:fs/promises';
import {resolve, dirname, posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateFieldRecord} from '../lib/field-record.mjs';
import runtime from './runtime.cjs';
import {createHash} from 'node:crypto';
import {validateFieldTimings} from '../lib/field-timings.mjs';

export async function validateSite(root=resolve(dirname(fileURLToPath(import.meta.url)),'..')) {
  const files=runtime.runtimeFiles(root), published=new Set(files);
  for (const file of files) {
    if (!(await lstat(resolve(root,file))).isFile()) throw new Error('Runtime asset is not a regular file: '+file);
  }
  const html=await readFile(resolve(root,'index.html'),'utf8');
  if (!/<meta\s+name="robots"\s+content="noindex, nofollow"/.test(html)) throw new Error('Ephemeris must retain its unlisted metadata.');
  const checkLink=(file,link) => {
    if (/^(?:https?:|mailto:|#)/.test(link)) return;
    const target=posix.normalize(posix.join(posix.dirname(file),link.split(/[?#]/)[0]));
    if (!published.has(target)) throw new Error('Unpackaged runtime reference: '+file+' → '+link);
  };
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) checkLink('index.html',match[1]);
  for (const file of files.filter(file=>file.endsWith('.mjs') || ['script.js','field.js'].includes(file))) {
    const source=await readFile(resolve(root,file),'utf8');
    for (const match of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) checkLink(file,match[1]);
  }
  const raw=await readFile(resolve(root,'field-year.json'),'utf8');
  const record=validateFieldRecord(JSON.parse(raw));
  const timings=validateFieldTimings(JSON.parse(await readFile(resolve(root,'field-transits.json'),'utf8')),record,createHash('sha256').update(raw).digest('hex'));
  return {files,record,timings};
}
