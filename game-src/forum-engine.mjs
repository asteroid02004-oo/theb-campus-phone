const MALES={jae:'leejaehyunow',ju:'tbzuyeon',q:'__qfeed__',young:'_0hoony',sun:'sunwoo'};
const NAMES={jae:'李贤在',ju:'李柱延',q:'池昌民',young:'金泳勋',sun:'金善旴'};
const STUDENTS=['luna.page','milo.07','yuna.zip','noah.film','ella.mint','june.note','leo.after','mia.soda','evan.room','nina.04','oliver.ink','aria.wave','ian.paper','rose.sept','alex.sketch','ivy.hour','zoe.cloud','sean.23','lia.sunday','kai.slow','theo.shelf','emma.bloom','liam.oct','sora.daily','ruby.loop','lucas.pm','amy.frame','eden.09','jessie.cafe','ryan.breeze','chloe.etc','finn.reel'];
const hash=t=>{let n=2166136261;for(const c of String(t)){n^=c.codePointAt(0);n=Math.imul(n,16777619)}return n>>>0};
function actorFromHandle(handle){return Object.keys(MALES).find(id=>MALES[id]===handle||NAMES[id]===handle)||null}
function handle(raw){if(actorFromHandle(raw))return MALES[actorFromHandle(raw)];if(raw==='学生会')return 'deobi.council';if(/管理员/.test(raw))return 'deobi.mod';if(/^[A-Za-z0-9_.]{2,32}$/.test(raw)&&!raw.startsWith('floor-'))return raw;return STUDENTS[hash(raw)%STUDENTS.length]}
function hydrate(game){
 game.forumState||={version:1,seen:{},jobs:{},serial:0};const f=game.forumState;f.seen||={};f.jobs||={};f.serial||=0;
 game.comments||={};
 for(const list of Object.values(game.comments))for(const c of list)if(c.player===undefined&&!c.generated)c.player=true;
 for(const p of [...(game.posts||[]),...(game.school?.generatedPosts||[])]){
  if(!game.posts?.includes(p))p.author=handle(p.author);
  p.comments||=[];
 }
 return f;
}
function personalise(text,game){return String(text).replaceAll('【玩家网名】',game.nickname||game.player?.name||'这位同学').replaceAll('【玩家姓名】',game.player?.name||'这位同学').replaceAll('【玩家】',game.nickname||game.player?.name||'这位同学').replaceAll('德比高中','得比高中')}
function visits(s,club){return Object.values(s.clubVisits||{}).filter(v=>v.id===club).length}
function matches(trigger,game){
 const s=game.school;if(!s?.configured)return false;const day=s.day,aff=id=>s.relations[id]?.affection||0,v=id=>visits(s,id),festival=s.festival,plan=s.festivalPlan,seen=id=>!!game.novel?.seen?.[id],choice=id=>game.novel?.choices?.[id],date=id=>s.history?.some(h=>h.type==='date'&&h.id===id&&h.accepted);
 if(/^FORUM-/.test(trigger)){
  const n=Number(trigger.slice(6));
  const rules={1:true,2:Object.keys(s.settlements||{}).length>0,3:s.attendance?.['语文']>0,4:s.attributes.specialtyCount>=3,5:day<=2,6:v('anime')>=1,7:v('anime')>=2,8:day<=2,9:seen('CLUB-Q-01'),10:day<=2,11:seen('CLUB-JU-01'),12:day<=2,13:seen('CLUB-JAE-02'),14:day>=7&&day<11,15:day===11&&!!s.sports,16:day>=18&&day<22,17:day===22,18:day>=21&&day<=24,19:festival?.activity==='性转咖啡厅',20:festival?.activity==='罗密欧与朱丽叶',21:festival?.activity==='炒年糕店铺',22:s.history?.some(h=>h.type==='work'),23:s.attributes.fame>=10&&(v('dance')>0||s.attendance?.['美术']>3||s.attendance?.['音乐']>3),24:day>=41};return !!rules[n];
 }
 const n=Number(trigger.replace('DOC-','')),gossip=Object.keys(game.forumState?.seen||{}).filter(x=>/^sdoc-/.test(x)).length;
 const rules={1:day>=20,2:aff('jae')>=55&&seen('CLUB-JAE-01'),3:day>=8,4:s.funding?.target==='ju'&&v('reading')>=1,5:day>=14&&aff('young')>=55&&(v('anime')>=2||date('young')),6:aff('sun')>=60&&(v('anime')>=2||date('sun')),7:day===24&&plan?.activity==='性转咖啡厅'&&['ready','sponsor-choice'].includes(plan.status),8:day===24&&plan?.activity==='炒年糕店铺'&&plan?.selectedId==='jae'&&plan.status==='ready',9:day===24&&plan?.activity==='罗密欧与朱丽叶'&&plan.status==='ready',10:aff('q')>=60&&(v('dance')>=2||date('q')),11:v('reading')>=2,12:festival?.id==='q',13:aff('sun')>70&&choice('CLUB-ANIME-03')==='A',14:day>=24&&festival?.id==='jae',15:festival?.id==='ju',16:day>=12,17:day>=24&&!!festival&&Object.values(s.relations).every(r=>r.affection>=50)&&Object.keys(s.clubVisits||{}).length>=3,18:day>=24&&gossip>=3,19:day>=5&&aff('jae')>=35,20:v('reading')>=1,21:v('anime')>=1&&day>=5,22:seen('CLUB-ANIME-01')||v('anime')>=2};return !!rules[n];
}
function seed(game,catalog){const f=hydrate(game);let added=0;for(const template of catalog){if(f.seen[template.id]||!matches(template.trigger,game))continue;f.seen[template.id]=true;const p={id:template.id,author:handle(template.originalAuthor),title:personalise(template.title,game),body:personalise(template.body,game),tag:template.tag,day:game.school.day,at:Date.now()+added,authored:true,comments:template.comments.map((c,i)=>({id:template.id+'-seed-'+i,author:handle(c.originalAuthor),text:personalise(c.text,game),parentId:null,at:Date.now()+i}))};game.school.generatedPosts.unshift(p);added++}return added}
function comments(game,post){hydrate(game);const list=[...(post.comments||[]),...(game.comments[post.id]||[])];for(let i=0;i<list.length;i++){const c=list[i];c.id||=post.id+'-legacy-'+i;c.parentId??=null;if(!c.player)c.author=handle(c.author)}return list}
function addComment(game,post,text,parentId=null){const f=hydrate(game);text=String(text||'').trim();if(!text||text.length>500)throw Error('回复请填写1到500字。');if(parentId&&!comments(game,post).some(c=>c.id===parentId))throw Error('这层回复暂时找不到了，请重新打开帖子。');const row={id:'comment-'+(++f.serial)+'-'+Date.now(),author:game.nickname,text,parentId,at:Date.now(),player:true};(game.comments[post.id]||=[]).push(row);return row}
function writers(post,target,{rng=Math.random}={}){
 const mentioned=Object.keys(MALES).filter(id=>[NAMES[id],MALES[id]].some(t=>(post.title+' '+post.body+' '+(target?.text||'')).includes(t)));
 const direct=actorFromHandle(target?.replyToAuthor||target?.author||'');
 const student=()=>STUDENTS[Math.min(STUDENTS.length-1,Math.floor(rng()*STUDENTS.length))];
 if(target){const first=direct?MALES[direct]:target.replyToAuthor&&STUDENTS.includes(target.replyToAuthor)?target.replyToAuthor:student();return [first]}
 const male=mentioned.length?MALES[mentioned[0]]:rng()<.6?Object.values(MALES)[Math.floor(rng()*5)]:null;
 const result=[student(),student()];if(male)result.push(male);return [...new Set(result)].map(id=>id);
}
function requestData(game,post,row,wanted){const all=comments(game,post),parent=row?.parentId?all.find(c=>c.id===row.parentId):null;const context=all.slice(-12);if(parent&&!context.some(c=>c.id===parent.id))context.unshift(parent);return {post:{id:post.id,author:post.author,title:post.title,body:post.body,tag:post.tag},comments:context.map(c=>({id:c.id,author:c.author,text:c.text,parentId:c.parentId})),replyTo:row?{id:row.id,author:row.author,text:row.text,parentId:row.parentId}:null,writers:wanted,player:{nickname:game.nickname||'同学',grade:game.school.grade},date:{day:game.school.day+1,label:(game.school.day<30?'9月'+(game.school.day+1):'10月'+(game.school.day-29))+'日'}}}
function validate(state){if(state===undefined)return;if(!state||state.version!==1||!state.seen||!state.jobs||!Number.isInteger(state.serial)||state.serial<0)throw Error('论坛记录格式不正确。');if(Object.keys(state.jobs).length>10000)throw Error('论坛回复记录过多。')}
export default {MALES,NAMES,STUDENTS,actorFromHandle,handle,hydrate,personalise,matches,seed,comments,addComment,writers,requestData,validate};
