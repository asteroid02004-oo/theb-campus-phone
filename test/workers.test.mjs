import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createWorker} from '../src/worker.mjs';
import {createPagesClient} from '../public/static-client.mjs';
import {directReply} from '../public/direct-protocol.mjs';
const base='https://campus-test.workers.dev';
const owner='owner-test-key-abcdefghijklmnopqrstuvwxyz';
const payload=()=>({chatId:'ju',player:{name:'夏宁',identity:'普通学生'},messages:[{role:'user',content:'明天读书会见。'}],memory:'约好把上次的书带来。'});
const reply=text=>Response.json({candidates:[{content:{parts:[{text}]}}]});
function fixture(t){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());let creates=0;
 const DB={prepare(sql){if(sql.startsWith('CREATE'))creates++;return {async run(){return db.prepare(sql).run()},bind(...args){return {async first(){return db.prepare(sql).get(...args)},async run(){return db.prepare(sql).run(...args)}}}}}};
 const requests=[],assets=[];
 const worker=createWorker(async(url,options)=>{requests.push({url,options});return reply('啊，记得。明天读书会见。')});
 const env={DB,SESSION_SECRET:'test-only-secret-with-at-least-32-bytes',GEMINI_API_KEY:owner,FREE_TIER_CONFIRMED:'true',GEMINI_MODEL:'gemini-3.5-flash-lite',MAX_DAILY_REQUESTS:'10000',ASSETS:{async fetch(request){assets.push(request.url);return new Response('asset:'+new URL(request.url).pathname)}}};
 const request=(path,options={})=>new Request(base+path,{...options,headers:{'cf-connecting-ip':'192.0.2.1',...options.headers}});
 const signed=async()=>{const session=await worker.fetch(request('/api/session'),env);return {token:(await session.json()).token,cookie:session.headers.get('set-cookie')?.split(';')[0]}};
 const chat=(token,cookie,extra={})=>request('/api/chat',{method:'POST',headers:{origin:base,'content-type':'application/json','x-phone-token':token,cookie,...extra},body:JSON.stringify(payload())});
 return {db,env,worker,request,signed,chat,requests,assets,creates:()=>creates};
}

test('one Worker serves original assets and routes APIs without exposing the app shell on API errors',async t=>{
 const f=fixture(t);
 assert.equal(await(await f.worker.fetch(f.request('/'),f.env)).text(),'asset:/');
 assert.equal(await(await f.worker.fetch(f.request('/media-example.jpg'),f.env)).text(),'asset:/media-example.jpg');
 const health=await(await f.worker.fetch(f.request('/healthz'),f.env)).json();assert.equal(health.deployment,'github-workers');
 assert.equal((await f.worker.fetch(f.request('/api/missing'),f.env)).status,404);assert.equal(f.assets.length,2);
});

test('shared chat initializes D1 once and keeps owner secrets in the server request',async t=>{
 const f=fixture(t),status=await(await f.worker.fetch(f.request('/api/status'),f.env)).json();
 assert.equal(status.configured,true);assert.equal(status.backendReady,true);assert(!JSON.stringify(status).includes(owner));
 const {token,cookie}=await f.signed();assert(cookie.startsWith('phone_session='));
 const response=await f.worker.fetch(f.chat(token,cookie),f.env);assert.equal(response.status,200);
 assert.equal(f.requests.length,1);assert.equal(f.requests[0].options.headers['x-goog-api-key'],owner);
 assert(!f.requests[0].options.body.includes(owner));assert(!JSON.stringify(await response.json()).includes(owner));assert.equal(f.creates(),1);
 assert.equal(f.db.prepare('SELECT count(*) AS n FROM request_limits').get().n,2);
});

test('incomplete shared configuration is reported without preventing the static game',async t=>{
 const f=fixture(t);
 for(const env of [{...f.env,GEMINI_API_KEY:undefined},{...f.env,SESSION_SECRET:undefined},{...f.env,DB:undefined}]){
  const status=await(await f.worker.fetch(f.request('/api/status'),env)).json();assert.equal(status.configured,false);
  assert.equal((await f.worker.fetch(f.request('/'),env)).status,200);
 }
 assert.equal(f.requests.length,0);
});

test('forged sessions, foreign origins, oversized messages and stale personal headers never charge the owner',async t=>{
 const f=fixture(t),{token,cookie}=await f.signed();
 assert.equal((await f.worker.fetch(f.chat('forged',cookie),f.env)).status,403);
 assert.equal((await f.worker.fetch(f.chat(token,cookie,{origin:'https://other.example'}),f.env)).status,403);
 assert.equal((await f.worker.fetch(f.chat(token,cookie,{'x-player-api-key':'private-test-key'}),f.env)).status,400);
 assert.equal((await f.worker.fetch(f.request('/api/chat',{method:'POST',headers:{origin:base},body:'x'.repeat(160001)}),f.env)).status,413);
 assert.equal(f.requests.length,0);
});

test('existing per-minute shared chat limits remain enforced',async t=>{
 const f=fixture(t),{token,cookie}=await f.signed();
 for(let i=0;i<12;i++)assert.equal((await f.worker.fetch(f.chat(token,cookie),f.env)).status,200);
 const response=await f.worker.fetch(f.chat(token,cookie),f.env);assert.equal(response.status,429);assert((await response.json()).error.includes('一分钟'));assert.equal(f.requests.length,12);
});

test('database initialization retries after a transient failure',async t=>{
 const f=fixture(t);let attempts=0;
 const DB={prepare(){return {async run(){if(++attempts===1)throw Error('transient');return {success:true}}}}};
 const env={...f.env,DB};assert.equal((await f.worker.fetch(f.request('/api/status'),env)).status,503);
 assert.equal((await f.worker.fetch(f.request('/api/status'),env)).status,200);assert.equal(attempts,2);
});

test('multi-provider personal direct chat bypasses the shared Worker and retains memory and latest persona',async()=>{
 for(const connection of [
  {provider:'gemini',protocol:'gemini',model:'gemini-user-model',baseUrl:'https://generativelanguage.googleapis.com/v1beta'},
  {provider:'deepseek',protocol:'chat-completions',model:'deepseek-flash',baseUrl:'https://api.deepseek.com'},
  {provider:'openai',protocol:'responses',model:'user-model',baseUrl:'https://api.openai.com/v1'},
  {provider:'custom',protocol:'chat-completions',model:'custom-model',baseUrl:'https://compatible.example/v1'}
 ]){
  let calls=0;
  const client=createPagesClient({readConfig:()=>({apiBaseUrl:base}),readPreferences:()=>({hasPersonalKey:()=>true,connection:()=>connection}),location:{origin:base},fetchImpl:async(url,options)=>{
   calls++;assert(!url.startsWith(base));assert(options.body.includes(payload().memory));assert(options.body.includes('181'));
   return connection.protocol==='gemini'?reply('啊，明天见。'):Response.json(connection.protocol==='responses'?{output:[{type:'message',content:[{type:'output_text',text:'明天见。'}]}]}:{choices:[{message:{content:'明天见。'}}]});
  },loadProtocol:async()=>({directReply})});
  assert.equal((await(await client('/api/status')).json()).provider,connection.provider);
  assert.equal((await client('/api/session')).status,200);
  assert.equal((await client('/api/chat',{method:'POST',headers:{'x-player-api-key':'personal-test-key-abcdefghijklmnopqrstuvwxyz'},body:JSON.stringify(payload())})).status,200);
  assert.equal(calls,1);
 }
});

test('shared client keeps signed same-origin sessions and personal failures never fall back',async()=>{
 const calls=[];const client=createPagesClient({readConfig:()=>({apiBaseUrl:base}),readPreferences:()=>({hasPersonalKey:()=>false}),location:{origin:base},fetchImpl:async(url,options)=>{calls.push(options);return Response.json({token:'signed'})}});
 assert.equal((await client('/api/session')).status,200);assert.equal(calls[0].credentials,'same-origin');
 let shared=0;const personal=createPagesClient({readConfig:()=>({apiBaseUrl:base}),readPreferences:()=>({hasPersonalKey:()=>true}),location:{origin:base},fetchImpl:async()=>{shared++},loadProtocol:async()=>({directReply:async()=>{throw Object.assign(Error('quota'),{status:429})}})});
 assert.equal((await personal('/api/chat',{headers:{'x-player-api-key':'personal-test-key-abcdefghijklmnopqrstuvwxyz'},body:'{}'})).status,429);assert.equal(shared,0);
});

test('deployment configuration auto-provisions D1 and separates static resource paths from API paths',()=>{
 const config=JSON.parse(fs.readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
 assert.equal(config.name,'theb-campus-phone');assert.equal(config.d1_databases[0].binding,'DB');assert(!config.d1_databases[0].database_id);
 assert.deepEqual(config.assets.run_worker_first,['/api/*','/healthz']);assert.equal(config.vars.MAX_DAILY_REQUESTS,'10000');
 assert(!JSON.stringify(config).includes(owner));
});
