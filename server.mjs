import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomBytes} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {handleApi} from './campus-api.mjs';

const root=import.meta.dirname;
const json=(status,error)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});

export function createApp({env:input=process.env,upstream=fetch,databasePath}={}) {
  const env={MAX_DAILY_REQUESTS:'10000',...input};
  if(!env.SESSION_SECRET){
    if(env.NODE_ENV==='production')throw Error('请在服务器环境变量中配置 SESSION_SECRET。');
    env.SESSION_SECRET=randomBytes(32).toString('hex');
  }
  const dbPath=databasePath||env.DATABASE_PATH||path.join(root,'.runtime/request-limits.sqlite');
  if(dbPath!==':memory:')fs.mkdirSync(path.dirname(dbPath),{recursive:true});
  const sqlite=new DatabaseSync(dbPath);
  sqlite.exec('CREATE TABLE IF NOT EXISTS request_limits (bucket_key TEXT PRIMARY KEY, count INTEGER NOT NULL, created_at INTEGER NOT NULL)');
  env.DB={prepare(sql){return {bind(...args){return {async first(){return sqlite.prepare(sql).get(...args)},async run(){return sqlite.prepare(sql).run(...args)}}}}}};
  const allowed=new Set(String(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean).map(s=>{
    const u=new URL(s);if(s!==u.origin||!['http:','https:'].includes(u.protocol))throw Error('ALLOWED_ORIGINS 只允许填写完整的来源域名，不含结尾斜杠或路径。');return u.origin;
  }));
  const publicUrl=env.PUBLIC_ORIGIN||env.RENDER_EXTERNAL_URL;
  if(publicUrl&&new URL(publicUrl).origin!==publicUrl.replace(/\/$/,''))throw Error('PUBLIC_ORIGIN 只允许填写站点来源，不含路径。');
  const trustProxy=env.TRUST_PROXY==='true'||env.RENDER==='true';
  const files=new Map([
    ['/', ['index.html','text/html; charset=utf-8']],
    ['/index.html',['index.html','text/html; charset=utf-8']],
    ['/config.js',['config.js','text/javascript; charset=utf-8']],
    ['/api-client.js',['api-client.js','text/javascript; charset=utf-8']]
  ]);
  async function send(res,response,head=false,corsOrigin=''){
    res.statusCode=response.status;
    for(const [key,value] of response.headers){if(!(corsOrigin&&key==='set-cookie'))res.setHeader(key,value)}
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
    if(corsOrigin){res.setHeader('Access-Control-Allow-Origin',corsOrigin);res.setHeader('Vary','Origin')}
    res.end(head?undefined:Buffer.from(await response.arrayBuffer()));
  }
  const server=createServer(async(req,res)=>{
    try{
      const proto=trustProxy&&String(req.headers['x-forwarded-proto']).split(',')[0].trim()==='https'?'https':'http';
      const ownOrigin=publicUrl?new URL(publicUrl).origin:new URL(proto+'://'+(req.headers.host||'localhost')).origin;
      const url=new URL(req.url||'/',ownOrigin),route=url.pathname;
      if(route==='/healthz')return await send(res,Response.json({ok:true}),req.method==='HEAD');
      if(route.startsWith('/api/')){
        const origin=String(req.headers.origin||'');
        const cross=!!origin&&origin!==ownOrigin;
        if(cross&&!allowed.has(origin))return await send(res,json(403,'这个网页尚未获准连接聊天后端。'));
        const corsOrigin=cross?origin:'';
        if(req.method==='OPTIONS'){
          if(!origin)return await send(res,json(403,'请从游戏页面发送请求。'));
          if(!['GET','POST'].includes(String(req.headers['access-control-request-method']||'')))return await send(res,json(405,'请求方式不正确。'),false,corsOrigin);
          const requested=String(req.headers['access-control-request-headers']||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
          if(requested.some(x=>!['content-type','x-phone-token'].includes(x)))return await send(res,json(403,'请求头不受支持。'),false,corsOrigin);
          return await send(res,new Response(null,{status:204,headers:{'Access-Control-Allow-Methods':'GET, POST','Access-Control-Allow-Headers':'Content-Type, X-Phone-Token','Access-Control-Max-Age':'600'}}),false,corsOrigin);
        }
        if(!['GET','POST'].includes(req.method))return await send(res,json(405,'请求方式不正确。'),false,corsOrigin);
        if(req.method==='POST'&&!origin)return await send(res,json(403,'请从游戏页面发送消息。'),false,corsOrigin);
        const chunks=[];let bytes=0;
        for await(const chunk of req){bytes+=chunk.length;if(bytes>160000)return await send(res,json(413,'消息内容过长。'),false,corsOrigin);chunks.push(chunk)}
        const headers=new Headers();
        for(const name of ['cookie','content-type','x-phone-token'])if(req.headers[name])headers.set(name,req.headers[name]);
        const forwarded=trustProxy?String(req.headers['x-forwarded-for']||'').split(',').map(x=>x.trim()).filter(Boolean).at(-1):'';
        headers.set('cf-connecting-ip',forwarded||req.socket.remoteAddress||'unknown');
        // Only approved origins reach this point. Verify the signed token in handleApi;
        // the adapter supports Safari without depending on third-party cookies.
        if(origin)headers.set('origin',ownOrigin);
        if(cross&&headers.get('x-phone-token'))headers.set('cookie','phone_session='+headers.get('x-phone-token'));
        const request=new Request(ownOrigin+route,{method:req.method,headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});
        return await send(res,await handleApi(request,env,upstream),false,corsOrigin);
      }
      if(!['GET','HEAD'].includes(req.method))return await send(res,json(405,'请求方式不正确。'));
      if(route==='/favicon.ico')return await send(res,new Response(null,{status:204}));
      const file=files.get(route);
      if(!file)return await send(res,new Response('Not found',{status:404}),req.method==='HEAD');
      return await send(res,new Response(fs.readFileSync(path.join(root,file[0])),{headers:{'Content-Type':file[1],'Cache-Control':'no-store'}}),req.method==='HEAD');
    }catch{
      if(!res.headersSent)await send(res,json(503,'服务暂时不可用，请稍后重试。'));else res.end();
    }
  });
  server.requestTimeout=180000;
  return {server,async close(){await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));sqlite.close()}};
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const envFile=path.join(root,'.env');if(fs.existsSync(envFile))process.loadEnvFile(envFile);
  const app=createApp();
  app.server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('校园手机已启动；端口 '+app.server.address().port+'。'));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>app.close().then(()=>process.exit(0)));
}
