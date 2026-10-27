const json=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});

export function createPagesClient({readConfig=()=>({}),readPreferences=()=>null,location=globalThis.location,fetchImpl=fetch,loadProtocol=()=>import('./direct-protocol.mjs')}={}){
 const token='pages-'+crypto.randomUUID();
 function backendOrigin(config){
   const base=String(config.apiBaseUrl||'').trim().replace(/\/+$/,'');if(!base)return '';
   let url;try{url=new URL(base)}catch{throw Error('请填写完整的后端网址。')}
   if(url.origin==='null'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!(url.protocol==='https:'||url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw Error('后端网址需要使用 HTTPS，并且不带路径、账号或参数。');
   return url.origin;
 }
 return async function request(route,options={}){
   if(!['/api/status','/api/session','/api/chat','/api/forum','/api/vocabulary'].includes(route))return json(404,{error:'接口不存在。'});
   const config=readConfig(),preferences=readPreferences(),personal=!!preferences?.hasPersonalKey(),headers=new Headers(options.headers);
   const supplied=headers.get('x-player-api-key')??headers.get('x-player-gemini-key'),connection=preferences?.connection?.(),model=personal&&connection?connection.model:config.geminiModel||'gemini-3.5-flash-lite';
   // A personal key always talks to the selected provider directly. Backend availability does
   // not affect this path, and no key is sent to GitHub or the shared backend.
   if(['/api/chat','/api/forum','/api/vocabulary'].includes(route)&&supplied!==null){
     try{
       if(!/^[\x21-\x7E]{8,2048}$/.test(supplied.trim()))return json(400,{error:'个人密钥格式不正确，请在设置中重新填写。'});
       let data;try{data=JSON.parse(options.body)}catch{return json(400,{error:'消息格式不正确。'})}
       const protocol=await loadProtocol();
       const personalFetch=(url,init={})=>fetchImpl(url,{...init,signal:options.signal?AbortSignal.any([options.signal,...(init.signal?[init.signal]:[])]):init.signal});
       return json(200,await (route==='/api/vocabulary'?protocol.directVocabularyReply:route==='/api/forum'?protocol.directForumReply:protocol.directReply)(data,supplied,{fetchImpl:personalFetch,model,connection}));
     }catch(error){return json(error.status||503,{error:error.status?error.message:'个人聊天模块暂时无法连接，请刷新后重试，并检查能否访问所选服务商。'})}
   }
   let backend='';try{backend=backendOrigin(config)}catch(error){if(!personal)return json(503,{error:error.message})}
   if(personal||!backend){
     if(route==='/api/status')return json(200,{configured:personal,verified:false,provider:personal&&connection?connection.provider:'Gemini',model,personaVersion:'2026-10-27-author-edits',playerKeysAvailable:true,personalDirect:true,backendAvailable:!!backend});
     if(route==='/api/session')return json(200,{token,local:true});
     return json(503,{error:'站长共享连接正在迁移。请在“设置与存档 → 聊天连接”填写个人 API 密钥；暂不填写仍可游玩课程和固定剧情。'});
   }
   let response;
   try{
     response=await fetchImpl(backend+route,{...options,headers,credentials:backend===location.origin?'same-origin':'omit',signal:options.signal||AbortSignal.timeout(150000)});
   }catch{return json(503,{error:'站长共享连接暂时无法访问，可在设置中改用个人密钥。'})}
   if(!(response.headers.get('content-type')||'').includes('application/json'))return json(503,{error:'站长共享连接暂未准备好，可先使用个人密钥。'});
   if(route==='/api/status'){
     const data=await response.json();return json(response.status,{...data,backendAvailable:true,personalDirect:true});
   }
   return response;
 };
}
