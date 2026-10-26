export function normalizeConnection(value={}){
 const protocol=value.protocol||'gemini',provider=value.provider||'gemini',model=String(value.model??(protocol==='gemini'?'gemini-3.5-flash-lite':'')).trim();
 const fallback=protocol==='gemini'?'https://generativelanguage.googleapis.com/v1beta':provider==='deepseek'?'https://api.deepseek.com':'https://api.openai.com/v1';
 let url;try{url=new URL(String(value.baseUrl||fallback).trim())}catch{throw Object.assign(Error('API 接口地址不正确。'),{status:400})}
 if(url.username||url.password||url.search||url.hash||!(url.protocol==='https:'||url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw Object.assign(Error('接口地址需要 HTTPS，且不能在网址中包含密钥或账号。'),{status:400});
 if(!['gemini','chat-completions','responses'].includes(protocol)||!model||model.length>160||/[\s\x00-\x1F]/.test(model))throw Object.assign(Error('API 协议或模型名称不正确。'),{status:400});
 return {provider,protocol,model,baseUrl:url.href.replace(/\/+$/,''),maxOutputTokens:Math.max(128,Math.min(8192,Number(value.maxOutputTokens)||2200))};
}

function endpoint(connection){
 let base=connection.baseUrl;
 if(connection.protocol==='gemini'){
   base=base.replace(/\/models\/[^/]+:generateContent$/,'');
   return base+'/models/'+encodeURIComponent(connection.model.replace(/^models\//,''))+':generateContent';
 }
 const suffix=connection.protocol==='responses'?'/responses':'/chat/completions';
 return base.endsWith(suffix)?base:base+suffix;
}

export async function askProvider(connection,key,input,instructions,max,{fetchImpl=fetch}={}){
 connection=normalizeConnection(connection);
 if(typeof key!=='string'||!/^[\x21-\x7E]{8,2048}$/.test(key.trim()))throw Object.assign(Error('个人密钥格式不正确，请在设置中重新填写。'),{status:400});
 const headers={'Content-Type':'application/json'},limit=Math.min(max,connection.maxOutputTokens);let body;
 if(connection.protocol==='gemini'){
   headers['x-goog-api-key']=key.trim();
   body={systemInstruction:{parts:[{text:instructions}]},contents:input.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]})),generationConfig:{maxOutputTokens:limit,temperature:.9}};
 }else{
   headers.Authorization='Bearer '+key.trim();
   if(connection.protocol==='responses')body={model:connection.model,instructions,input:input.map(m=>({role:m.role,content:m.content})),max_output_tokens:limit,stream:false,store:false};
   else{
     body={model:connection.model,messages:[{role:'system',content:instructions},...input.map(m=>({role:m.role,content:m.content}))],stream:false};
     if(connection.provider==='openai'){body.max_completion_tokens=limit;body.store=false}else body.max_tokens=limit;
     if(connection.provider==='deepseek'){body.thinking={type:'disabled'};body.temperature=.9}
   }
 }
 let response;try{response=await fetchImpl(endpoint(connection),{method:'POST',headers,body:JSON.stringify(body),credentials:'omit',signal:AbortSignal.timeout(65000)})}catch{throw Object.assign(Error('无法连接所选服务商。请检查网络、接口地址，以及服务商是否允许浏览器跨域直连。'),{status:504})}
 if(!response.ok){const message=response.status===429?'当前服务商返回额度或频率限制，请稍后重试或检查该项目的配额。':response.status===401||response.status===403?'密钥或访问权限不正确，请检查服务商、接口地址和密钥是否匹配。':response.status===404?'模型或接口不存在，请检查模型名称和 API 协议。':response.status===400?'接口未接受当前参数，请核对所选 API 协议与模型。':'所选模型暂时无法回复，请稍后重试。';throw Object.assign(Error(message),{status:response.status===429?429:response.status===404?404:503})}
 let data;try{data=await response.json()}catch{throw Object.assign(Error('服务商返回的内容不是有效 JSON，请检查接口地址。'),{status:502})}
 let text='';
 if(connection.protocol==='gemini')text=(data.candidates?.[0]?.content?.parts||[]).filter(p=>typeof p.text==='string'&&!p.thought).map(p=>p.text).join('\n');
 else if(connection.protocol==='responses')text=typeof data.output_text==='string'?data.output_text:(data.output||[]).filter(item=>item.type==='message').flatMap(item=>item.content||[]).filter(p=>p.type==='output_text'&&typeof p.text==='string').map(p=>p.text).join('\n');
 else{const content=data.choices?.[0]?.message?.content;text=typeof content==='string'?content:Array.isArray(content)?content.filter(p=>typeof p.text==='string').map(p=>p.text).join('\n'):''}
 if(!text.trim())throw Object.assign(Error('这次没有收到可显示的回复。可以检查模型类型，或在高级设置中适当提高回复 token 上限。'),{status:502});
 return text.trim().split(key.trim()).join('[密钥已隐藏]');
}
