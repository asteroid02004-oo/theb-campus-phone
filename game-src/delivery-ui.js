const Delivery=window.CampusDelivery;
const recoveredSends=Delivery.recoverPending(game);
const deliveryPhase=new Map();
const paintBeforeDelivery=paintChat;
paintChat=function(id){paintBeforeDelivery(id);if(current==='kakao'&&activeContact===id&&$('#campusTyping')&&deliveryPhase.has(id))$('#campusTyping').textContent=deliveryPhase.get(id);};
sendCampus=async function(id){
 if(sending.has(id))return;if(ChatFlow.locked(game,id)){toast('先完成这段剧情回复，再自由聊天。');paintChat(id);return}
 const input=$('#campusInput'),content=input?.value.trim();if(!content)return;if(content.length>6000){toast('这句话有点长，请分成几段发送。');return}
 const ownerGame=game,row={id:'live-user-'+crypto.randomUUID(),role:'user',content,at:Date.now(),gameDay:game.school.day,pending:true};
 game.pendingSends||={};game.pendingSends[id]={rowId:row.id,attempt:0};game.chats[id].push(row);game.drafts[id]='';input.value='';delete chatErrors[id];sending.add(id);
 const memory=Authored.memory(game,id),snapshot=Delivery.historySnapshot(game.chats[id],row.id,game.contextStart[id]||0,memory),rewardDay=game.school.day;
 saveCampus();paintChat(id);
 try{
  const data=await Delivery.withOneRetry(async attempt=>{
   if(game!==ownerGame)throw Error('本轮已切换。');game.pendingSends[id].attempt=attempt;
   deliveryPhase.set(id,attempt?C[id].name+' 正在重新连接（1/1）…':C[id].name+' 正在输入…');paintChat(id);
   if(!campusToken)await initializeApi();if(!campusToken)throw Error(apiState.error||'暂时无法连接。');
   const response=await campusApiFetch('/api/chat',{method:'POST',headers:window.CampusApiPreferences.chatHeaders({'Content-Type':'application/json','x-phone-token':campusToken}),body:JSON.stringify({chatId:id,player:ownerGame.player,messages:snapshot.messages,memory,gameState:Sim.context(ownerGame.school,id,ownerGame.player.name)}),signal:AbortSignal.timeout(35000)});
   let result;try{result=await response.json()}catch{throw Error('回复没有送达。')}
   if(!response.ok){if(response.status===403)campusToken='';throw Error(result.error||'回复没有送达。')}
   Delivery.validReply(result);return result;
  },{onRetry:()=>{deliveryPhase.set(id,'连接暂时中断，自动重试一次…');paintChat(id)}});
  if(game!==ownerGame)return;
  delete row.pending;delete game.pendingSends[id];deliveryPhase.delete(id);
  if(game.school.day===rewardDay&&!game.school.completed){const gain=Sim.chatReward(game.school,id);if(gain)showRelationChange(id,gain)}
  if(typeof data.memory==='string')game.memories[id]=data.memory;
  if(Number.isInteger(data.consumed)&&data.consumed>0)game.contextStart[id]=snapshot.indices[Math.min(data.consumed,snapshot.indices.length-1)];
  for(const answer of Delivery.validReply(data)){if(game!==ownerGame)return;receiveLive(id,answer);saveCampus();paintChat(id)}apiState.configured=true;
 }catch(error){
  if(game===ownerGame){Delivery.cancelPending(game,id,row.id);if(current==='kakao'&&activeContact===id&&$('#campusInput'))$('#campusInput').value=game.drafts[id]||'';toast('重试后仍未送达，刚才这句话已撤回，文字保留在输入框。');saveCampus()}
 }finally{
  sending.delete(id);deliveryPhase.delete(id);if(game===ownerGame){delete chatErrors[id];paintChat(id);if(current==='kakao'&&!activeContact)renderKkt();refreshHome()}
 }
};
if(recoveredSends.length)saveCampus();
