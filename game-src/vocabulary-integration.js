const vocabularyHomeBefore=installCampusHome;
installCampusHome=function(){vocabularyHomeBefore();const grid=$('.app-grid');if(grid&&!grid.querySelector('[data-open="vocabulary"]'))grid.insertAdjacentHTML('beforeend','<button class="app-shortcut" data-open="vocabulary" aria-label="背单词"><span class="app-icon vocab-home-icon">Aa</span><span class="app-label">背单词</span></button>')};
const vocabularyOpenBefore=openApp;
openApp=function(name){if(current==='vocabulary')window.CampusVocabulary.leave();if(name==='vocabulary'){activeContact='';setCampus(name,'vocab-app');window.CampusVocabulary.open();return}vocabularyOpenBefore(name)};
const vocabularyGoHomeBefore=goHome;
goHome=function(){if(current==='vocabulary')window.CampusVocabulary.leave();vocabularyGoHomeBefore()};
function deliverVocabularyReward(task){
 const id=game.school.funding?.target;if(!id||!C[id]||!game.player||!window.__campusMessagingReady)return false;
 const token='vocabulary-daily:'+task.date;if(ChatFlow.ensure(game).seen[token])return true;
 const scene=window.CampusVocabularyRewards.scene(id,task.scenario,{...game.player,grade:game.school.grade});if(!scene)return false;
 const row=receiveScripted(id,scene.open,'vocabulary',{date:task.date,scenario:task.scenario,streak:task.streak,options:scene.options,answers:scene.answers},token);
 if(row){saveCampus();refreshHome();return true}return false;
}
window.CampusVocabulary.install({app,top:campusTop,home:()=>goHome(),settings:()=>openApp('settings'),toast,isActive:()=>current==='vocabulary',reward:deliverVocabularyReward,api:campusApiFetch,apiHeaders:base=>playerApiPreferences.chatHeaders(base),token:async()=>{if(!campusToken){const r=await campusApiFetch('/api/session');if(r.ok)campusToken=(await r.json()).token||''}return campusToken}});
const saveBeforeVocabularyRewards=saveCampus;
saveCampus=function(){const saved=saveBeforeVocabularyRewards();queueMicrotask(()=>window.CampusVocabulary.syncRewards());return saved};
