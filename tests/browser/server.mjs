import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('../../docs');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json','.frag':'text/plain','.vert':'text/plain'};
http.createServer(async(req,res)=>{
  try{let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!path.startsWith('/neon-rift/'))throw 404;path=path.slice('/neon-rift/'.length)||'index.html';const file=resolve(root,path);if(!file.startsWith(root+'/'))throw 404;const body=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}
}).listen(4173,'127.0.0.1');
