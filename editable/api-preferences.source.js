(() => {
 const STORAGE='deobi-campus-gemini-v1';
 const PRESETS={gemini:{provider:'gemini',protocol:'gemini',model:'gemini-3.5-flash-lite',baseUrl:'https://generativelanguage.googleapis.com/v1beta',maxOutputTokens:2200},deepseek:{provider:'deepseek',protocol:'chat-completions',model:'deepseek-flash',baseUrl:'https://api.deepseek.com',maxOutputTokens:2200},openai:{provider:'openai',protocol:'responses',model:'',baseUrl:'https://api.openai.com/v1',maxOutputTokens:2200},custom:{provider:'custom',protocol:'chat-completions',model:'',baseUrl:'',maxOutputTokens:2200}};
 const validKey=key=>typeof key==='string'&&/^[\x21-\x7E]{8,2048}$/.test(key);
 function connection(value={}){
   const provider=Object.hasOwn(PRESETS,value.provider)?value.provider:'gemini',base=PRESETS[provider];
   const protocol=value.protocol||base.protocol,model=String(value.model??base.model).trim(),baseUrl=String(value.baseUrl??base.baseUrl).trim().replace(/\/+$/,'');
   if(!['gemini','chat-completions','responses'].includes(protocol))throw Error('请选择支持的 API 协议。');
   if(!model||model.length>160||/[\s\x00-\x1F]/.test(model))throw Error('请填写完整的模型名称，可从服务商控制台复制模型 ID。');
   let url;try{url=new URL(baseUrl)}catch{throw Error('请填写完整的 API 接口地址。')}
   if(url.username||url.password||url.search||url.hash||!(url.protocol==='https:'||url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw Error('接口地址需使用 HTTPS，不要在网址中填写密钥、账号或参数。');
   const maxOutputTokens=Number(value.maxOutputTokens??base.maxOutputTokens);if(!Number.isInteger(maxOutputTokens)||maxOutputTokens<128||maxOutputTokens>8192)throw Error('回复 token 上限请填写 128 到 8192 之间的整数。');
   return {provider,protocol,model,baseUrl,maxOutputTokens};
 }
 let choice={chosen:false,mode:'default'},persistent=true;
 try{const stored=JSON.parse(localStorage.getItem(STORAGE)||'null');if(stored?.chosen&&stored.mode==='default')choice={chosen:true,mode:'default'};if(stored?.chosen&&stored.mode==='personal'&&validKey(stored.key))choice={chosen:true,mode:'personal',key:stored.key,...connection(stored)}}catch{}
 function save(next){choice=next;persistent=true;try{localStorage.setItem(STORAGE,JSON.stringify(next))}catch{persistent=false;if(next.mode==='default')try{localStorage.removeItem(STORAGE)}catch{}}return {mode:choice.mode,persistent}}
 window.CampusApiPreferences=Object.freeze({
   chosen:()=>choice.chosen,mode:()=>choice.mode,hasPersonalKey:()=>choice.mode==='personal'&&validKey(choice.key),persistent:()=>persistent,
   preset:provider=>({...PRESETS[provider]||PRESETS.gemini}),
   connection:()=>choice.mode==='personal'?connection(choice):({...PRESETS.gemini}),
   useDefault:()=>save({chosen:true,mode:'default'}),
   usePersonal(value,options={}){
     const config=connection(options);let key=typeof value==='string'?value.trim():'';
     if(!key&&choice.mode==='personal'&&choice.provider===config.provider&&new URL(choice.baseUrl).origin===new URL(config.baseUrl).origin)key=choice.key;
     if(!validKey(key))throw Error('请填写对应服务商的完整密钥。更换服务商或接口域名时，需要重新填写密钥。');
     return save({chosen:true,mode:'personal',key,...config});
   },
   chatHeaders(base){const headers=new Headers(base);headers.delete('x-player-gemini-key');headers.delete('x-player-api-key');if(choice.mode==='personal'&&validKey(choice.key))headers.set('x-player-api-key',choice.key);return headers}
 });
})();
