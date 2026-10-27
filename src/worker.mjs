import {createWorker as createSharedApi} from './shared-api.mjs';

// Only rate-limit counters are persisted in D1. Stories and personal keys stay
// in the player's browser; owner credentials are Cloudflare Secret bindings.
const prepared=new WeakMap();
async function ensureDatabase(db){
 if(!db)return;
 let ready=prepared.get(db);
 if(!ready){
  ready=db.prepare('CREATE TABLE IF NOT EXISTS request_limits (bucket_key TEXT PRIMARY KEY, count INTEGER NOT NULL, created_at INTEGER NOT NULL)').run().catch(error=>{prepared.delete(db);throw error});
  prepared.set(db,ready);
 }
 await ready;
}
const unavailable=()=>Response.json({error:'共享聊天暂时不可用，可在设置中使用个人连接。'},{status:503,headers:{'Cache-Control':'no-store'}});

export function createWorker(upstream=fetch){
 const api=createSharedApi(upstream);
 return {async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==='/healthz')return Response.json({ok:true,app:'deobi-campus-phone',deployment:'github-workers',version:'2026-10-27-authored-forum'},{headers:{'Cache-Control':'no-store'}});
  if(url.pathname.startsWith('/api/')){
   // A generic personal-key header belongs to browser direct mode. Never
   // silently charge the shared account if a stale client sends it here.
   if(request.headers.has('x-player-api-key'))return Response.json({error:'请刷新页面，个人连接会直接访问你选择的服务商。'},{status:400,headers:{'Cache-Control':'no-store'}});
   const origin=request.headers.get('origin');
   if(origin&&origin!==url.origin&&!String(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).includes(origin))return Response.json({error:'请从游戏页面连接。'},{status:403,headers:{'Cache-Control':'no-store'}});
   if(['/api/status','/api/session','/api/chat','/api/forum','/api/vocabulary'].includes(url.pathname)&&request.method!=='OPTIONS'){
    try{await ensureDatabase(env.DB)}catch{return unavailable()}
   }
   return api.fetch(request,env,ctx);
  }
  if(!env.ASSETS)return new Response('Static assets are not configured.',{status:503});
  return env.ASSETS.fetch(request);
 }};
}
export default createWorker();
