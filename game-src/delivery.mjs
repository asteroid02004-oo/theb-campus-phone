const valid=m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string'&&m.content.trim()&&m.content.length<=6000;
export function historySnapshot(rows,pendingId,start=0,memory=''){
 const at=rows.findIndex(m=>m.id===pendingId);if(at<0||rows[at].role!=='user')throw Error('待发送消息已取消。');
 const indices=[];for(let i=Math.max(0,Math.min(start,at),at-79);i<=at;i++)if(valid(rows[i]))indices.push(i);
 let size=indices.reduce((n,i)=>n+rows[i].content.length,0)+memory.length;
 while(indices.length>1&&size>58000)size-=rows[indices.shift()].content.length;
 const messages=indices.map(i=>({role:rows[i].role,content:rows[i].content.trim()}));
 if(!messages.length||messages.at(-1).role!=='user')throw Error('请重新输入这句话。');
 return {messages,indices,start:indices[0]};
}
export async function withOneRetry(operation,{onRetry=()=>{},delay=()=>new Promise(r=>setTimeout(r,900))}={}){
 let last;for(let attempt=0;attempt<2;attempt++)try{return await operation(attempt)}catch(e){last=e;if(attempt===0){await onRetry(e);await delay()}}
 throw last;
}
export function cancelPending(game,id,pendingId){
 const rows=game.chats[id],at=rows.findIndex(m=>m.id===pendingId);let text='';if(at>=0){text=rows[at].content;rows.splice(at,1)}
 if(text&&!game.drafts[id])game.drafts[id]=text;
 delete game.pendingSends?.[id];delete game.errors?.[id];return text;
}
export function recoverPending(game){
 game.pendingSends||={};game.drafts||={};game.errors||={};const recovered=[];
 for(const [id,ticket]of Object.entries(game.pendingSends))if(game.chats[id]){cancelPending(game,id,ticket.rowId);recovered.push(id)}
 for(const id of Object.keys(game.errors)){
  const rows=game.chats[id]||[],index=rows.findLastIndex(m=>m.role==='user'&&!m.fixedReplyTo&&!m.dateInvitation&&!m.festivalInvitation&&!m.festivalApology);
  if(index>=0&&!rows.slice(index+1).some(m=>m.live)){const row=rows[index];row.id||='legacy-pending-'+id;cancelPending(game,id,row.id);recovered.push(id)}
  delete game.errors[id];
 }
 return [...new Set(recovered)];
}
export function validReply(data){const messages=(Array.isArray(data?.messages)?data.messages:[data?.reply]).filter(x=>typeof x==='string'&&x.trim());if(!messages.length)throw Error('这次没有收到回复。');return messages}
export default {historySnapshot,withOneRetry,cancelPending,recoverPending,validReply};
