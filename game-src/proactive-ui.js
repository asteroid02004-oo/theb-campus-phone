const ProactiveStories=window.CampusStories;
ProactiveStories.ensure(game);
let evaluatingProactive=false;
function evaluateProactive(){if(evaluatingProactive||!window.__campusMessagingReady)return false;evaluatingProactive=true;try{const events=ProactiveStories.collect(game,{busyIds:Array.from(sending)});for(const e of events)receiveScripted(e.id,e.text,e.kind,e.meta,e.token);return events.length>0}finally{evaluatingProactive=false}}
const saveBeforeProactive=saveCampus;
saveCampus=function(){const saved=saveBeforeProactive();if(evaluateProactive())return saveBeforeProactive();return saved};
const proactiveClock=setInterval(()=>{if(!document.hidden&&evaluateProactive())saveBeforeProactive()},45000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&evaluateProactive())saveBeforeProactive()});
if(evaluateProactive())saveBeforeProactive();
