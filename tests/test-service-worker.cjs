const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const scope='https://urbanrunnerx.github.io/neon-rift/';
const listeners={},stores=new Map();const web=path.resolve(__dirname,'../docs');let claimed=false;
const normalize=(request)=>{let u=new URL(typeof request==='string'?request:request.url,scope);u.search='';return u.href;};
const caches={
 async open(name){if(!stores.has(name)){const entries=new Map();stores.set(name,{entries,async addAll(urls){for(const u of urls){const rel=new URL(u,scope).pathname.replace('/neon-rift/','')||'index.html';assert.ok(fs.existsSync(path.join(web,rel)),rel);entries.set(normalize(u),{url:normalize(u),body:fs.readFileSync(path.join(web,rel))});}},async match(request){return entries.get(normalize(request));}});}return stores.get(name);},
 async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}
};
vm.runInNewContext(fs.readFileSync(path.join(web,'sw.js'),'utf8'),{URL,caches,self:{registration:{scope},location:{origin:'https://urbanrunnerx.github.io'},addEventListener:(event,handler)=>listeners[event]=handler,skipWaiting:async()=>{},clients:{claim:async()=>{claimed=true;}}},fetch:async()=>{throw new Error('Mock network is offline');}});
(async()=>{
 let pending;listeners.install({waitUntil:p=>pending=p});await pending;
 stores.set('another-app:cache',{});stores.set('neon-rift:/neon-rift/:old',{});
 listeners.activate({waitUntil:p=>pending=p});await pending;
 assert.ok(claimed);assert.ok(stores.has('another-app:cache'));assert.ok(!stores.has('neon-rift:/neon-rift/:old'));
 let response;listeners.fetch({request:{method:'GET',url:scope+'index.html?source=installed',mode:'navigate'},respondWith:p=>response=p});assert.ok((await response).body.toString().includes('NEON RIFT'));
 listeners.fetch({request:{method:'GET',url:scope+'shaders/rift.frag',mode:'same-origin'},respondWith:p=>response=p});assert.ok((await response).body.toString().includes('void main'));
 let intercepted=false;listeners.fetch({request:{method:'GET',url:'https://urbanrunnerx.github.io/other-app/data',mode:'cors'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
 console.log(JSON.stringify({suite:'Service-worker logic with mocked CacheStorage and offline fetch',passed:true,checks:['All precached files exist','Only this app old caches removed','Install-source query maps to cached entry','Shader available in mock offline cache','Other apps not intercepted'],real_browser_offline_test:false},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
