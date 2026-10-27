const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {runtimeFiles}=require('./runtime.cjs');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8'};

function createPreviewServer({siteRoot=root, handler=require('../netlify/functions/horizons.js').handler}={}) {
  return http.createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,'http://localhost');
      if (['/.netlify/functions/horizons','/api/ephemeris/horizons'].includes(url.pathname)) {
        const result=await handler({httpMethod:req.method,queryStringParameters:Object.fromEntries(url.searchParams)});
        res.writeHead(result.statusCode,{'X-Robots-Tag':'noindex, nofollow',...result.headers});
        res.end(req.method==='HEAD'?undefined:result.body);return;
      }
      if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
      if (url.pathname==='/') {res.writeHead(302,{Location:'/ephemeris/'});res.end();return;}
      const pathname=decodeURIComponent(url.pathname);
      const file=pathname.startsWith('/ephemeris/')?pathname.slice('/ephemeris/'.length)||'index.html':'';
      const published=new Set(runtimeFiles(siteRoot));
      if (!published.has(file)) {res.writeHead(404);res.end('Not found');return;}
      const body=req.method==='HEAD'?undefined:fs.readFileSync(path.join(siteRoot,file));
      res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});
      res.end(body);
    } catch(error) {res.writeHead(500,{'Content-Type':'text/plain'});res.end('Local preview failed: '+error.message);}
  });
}
module.exports={createPreviewServer};
if (require.main===module) {
  const port=Number(process.env.PORT || 4174);
  if (!Number.isInteger(port) || port<1 || port>65535) throw new Error('PORT must be 1–65535.');
  const server=createPreviewServer();
  server.on('error',error=>{console.error(error.message);process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>console.log('Ephemeris preview: http://127.0.0.1:'+port+'/ephemeris/'));
}
