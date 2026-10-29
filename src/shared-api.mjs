import {handleApi} from './lib/campus-api.mjs';

const DEFAULT_ORIGIN='';
const json=(status,error)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});

export function createWorker(upstream=fetch){
 return {async fetch(request,env){
  const url=new URL(request.url),route=url.pathname;
  const origin=request.headers.get('origin')||'',cross=!!origin&&origin!==url.origin;
  const allowed=new Set(String(env.ALLOWED_ORIGINS||DEFAULT_ORIGIN).split(',').map(x=>x.trim()).filter(x=>{try{return new URL(x).origin===x}catch{return false}}));
  function finish(response){
    const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');headers.set('X-Content-Type-Options','nosniff');
    if(cross){headers.set('Access-Control-Allow-Origin',origin);headers.set('Vary','Origin');headers.delete('Set-Cookie')}
    return new Response(response.body,{status:response.status,headers});
  }
  try{
    if(cross&&!allowed.has(origin))return json(403,'这个网页尚未获准连接共享聊天后端。');
    if(route==='/healthz')return finish(Response.json({ok:true}));
    if(!['/api/status','/api/session','/api/chat','/api/forum','/api/vocabulary','/api/group'].includes(route))return finish(json(404,'接口不存在。'));
    if(request.method==='OPTIONS'){
      const method=request.headers.get('access-control-request-method'),requested=(request.headers.get('access-control-request-headers')||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
      if(!origin||!['GET','POST'].includes(method)||requested.some(x=>!['content-type','x-phone-token','x-player-gemini-key'].includes(x)))return finish(json(403,'跨域请求配置不正确。'));
      return finish(new Response(null,{status:204,headers:{'Access-Control-Allow-Methods':'GET, POST','Access-Control-Allow-Headers':'Content-Type, X-Phone-Token, X-Player-Gemini-Key','Access-Control-Max-Age':'600'}}));
    }
    if(!['GET','POST'].includes(request.method))return finish(json(405,'请求方式不正确。'));
    if(request.method==='POST'&&!origin)return finish(json(403,'请从游戏页面发送消息。'));
    const headers=new Headers(request.headers);
    if(origin)headers.set('origin',url.origin);
    if(cross&&headers.get('x-phone-token'))headers.set('cookie','phone_session='+headers.get('x-phone-token'));
    let body;
    if(request.method==='POST'){
      if(Number(headers.get('content-length')||0)>160000)return finish(json(413,'消息内容过长。'));
      const chunks=[];let bytes=0;const reader=request.body?.getReader();
      if(reader)for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>160000){await reader.cancel();return finish(json(413,'消息内容过长。'))}chunks.push(part.value)}
      body=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength}
    }
    const translated=new Request(url.origin+route,{method:request.method,headers,...(body?{body}:{})});
    const response=await handleApi(translated,env,upstream);
    if(route==='/api/status'&&response.ok){const data=await response.json(),ready=!!env.DB&&!!env.SESSION_SECRET;return finish(Response.json({...data,configured:data.configured&&ready,backendReady:ready}))}
    return finish(response);
  }catch{return finish(json(503,'共享聊天后端暂时不可用，可先在设置中使用个人密钥。'))}
 }};
}

export default createWorker();
