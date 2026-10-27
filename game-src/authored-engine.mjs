import DATA from './authored-data.mjs';
const ids=['jae','ju','young','sun','q'];
function fixed(actor,kind,meta={}){return Object.values(DATA.fixed).find(r=>r.actor===actor&&r.kind===kind&&['itemId','place','kind','activity','aidTopic','clubId'].every(k=>r.meta[k]===undefined||r.meta[k]===meta[k]))||null}
function text(value,game,actor,meta={}){return String(value||'').replaceAll('【称呼】',window.CampusSim.address(game.school,actor,game.player?.name||'同学').preferred).replaceAll('【玩家姓名】',game.player?.name||'同学').replaceAll('【玩家网名】',game.nickname||game.player?.name||'同学').replaceAll('【活动名称】',meta.activity||game.school.festivalPlan?.activity||game.school.festival?.activity||'校园祭').replaceAll('【预约日期】',window.CampusSim.date(Number.isInteger(meta.serviceDay)?meta.serviceDay:game.school.day).label)}
function apply(stories){
 for(const item of Object.values(DATA.proactive)){
  const map={clubMilestone:stories.MILESTONES,clubJealousy:stories.JEALOUSY,sponsorAbsence:stories.ABSENCES,festivalSponsorRequest:stories.FESTIVAL_REQUESTS};
  const target=item.kind==='aidThanks'?stories.AID_TOPICS[item.actor][item.aidTopic]:map[item.kind]?.[item.actor];
  if(target)Object.assign(target,{open:item.open,options:item.options,closing:item.closing});
 }
 for(const item of Object.values(DATA.romances)){const topic=stories.ROMANCE[item.actor].find(t=>t.id===Object.keys(DATA.romances).find(k=>DATA.romances[k]===item));if(topic)Object.assign(topic,{rounds:item.rounds,closing:item.closing})}
 const beforeOptions=stories.options,beforeFollowup=stories.followup;
 stories.options=function(actor,kind,meta={}){const r=fixed(actor,kind,meta);return r&&r.options.every(Boolean)?r.options.slice():beforeOptions(actor,kind,meta)};
 stories.followup=function(actor,flow,index){const r=fixed(actor,flow.kind,flow.meta);if(r?.closing[index])return {text:r.closing[index]};return beforeFollowup(actor,flow,index)};
 stories.festivalScene=function(actor,activity){if(!actor)return '你独立完成了'+activity+'。从布置、营业或演出到收尾，这一天留下了属于你的回忆。';const s=DATA.scenes.find(s=>s.kind==='festival'&&s.actor===actor&&s.activity===activity);return s?s.pages.map(p=>p.speaker?'“'+p.text+'”':p.text).join('\n\n'):''};
}
function ensure(game){game.novel||={version:1,active:null,queue:[],seen:{},choices:{},history:[],aiNotes:{}};const n=game.novel;n.queue||=[];n.seen||={};n.choices||={};n.history||=[];n.aiNotes||={};return n}
function choose(game,{kind,actor,clubId,place,rng=Math.random}){
 const n=ensure(game),scenes=DATA.scenes.filter(s=>s.kind===kind&&(clubId==='anime'?s.clubId==='anime':s.actor===actor)&&(!place||s.place===place));
 if(clubId==='anime'){
  const ordinary=scenes.filter(s=>!s.highAffection),unseen=ordinary.find(s=>!n.seen[s.id]);if(unseen)return unseen;
  const special=scenes.find(s=>s.highAffection),eligible=['young','sun'].some(id=>game.school.relations[id].affection>70);
  if(special&&eligible&&!n.seen[special.id]&&rng()<.35)return special;
  const last=n.history.filter(h=>h.kind==='club'&&h.clubId==='anime').length;return ordinary[last%ordinary.length];
 }
 const unused=scenes.find(s=>!n.seen[s.id]);return unused||scenes[n.history.filter(h=>h.kind===kind&&h.actor===actor&&(!place||h.place===place)).length%scenes.length]||null;
}
function begin(game,scene,meta={}){const n=ensure(game);if(!scene)return null;const key=meta.key||scene.id+'-'+game.school.day;if(n.active?.key===key||n.queue.some(x=>x.key===key))return n.active;const ticket={key,id:scene.id,day:game.school.day,phase:'pages',index:0,choice:null,after:0,...meta};if(n.active)n.queue.push(ticket);else n.active=ticket;return ticket}
function complete(game){const n=ensure(game),a=n.active;if(!a)return null;const scene=DATA.scenes.find(s=>s.id===a.id);if(!a.review){n.seen[a.id]=(n.seen[a.id]||0)+1;if(a.choice!==null)n.choices[a.id]=scene.choices[a.choice]?.id;n.history.push({id:a.id,kind:scene.kind,actor:scene.actor||null,clubId:scene.clubId||null,place:scene.place||null,day:a.day,choice:a.choice});for(const actor of scene.members){const choice=a.choice!==null?scene.choices[a.choice]?.text:'';const note='第'+(a.day+1)+'天，与玩家经历了“'+scene.title+'”。'+(choice?'玩家选择：“'+choice+'”。':'');(n.aiNotes[actor]||=[]).push(note);n.aiNotes[actor]=n.aiNotes[actor].slice(-6)}}n.active=n.queue.shift()||null;return a}
function memory(game,id){const notes=ensure(game).aiNotes[id]||[];return ((game.memories[id]||'').slice(-12500)+'\n'+notes.join('\n')).slice(-16000)}
function validate(n){if(n===undefined)return;if(!n||n.version!==1||!n.seen||!n.choices||!Array.isArray(n.history)||!Array.isArray(n.queue)||n.queue.length>30)throw Error('线下剧情记录格式不正确。');if(n.active&&(!DATA.scenes.some(s=>s.id===n.active.id)||!['pages','choice','after'].includes(n.active.phase)||!Number.isInteger(n.active.index)||n.active.index<0))throw Error('线下剧情进度格式不正确。')}
export default {DATA,ids,fixed,text,apply,ensure,choose,begin,complete,memory,validate};
