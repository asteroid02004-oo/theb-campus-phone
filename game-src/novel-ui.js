const Authored=window.CampusAuthored;
Authored.apply(ProactiveStories);Authored.ensure(game);
let novelElement=null,novelPrevious=null;
function resolveAuthored(id,kind,meta={},fallback=''){const r=Authored.fixed(id,kind,meta);return r?.open?Authored.text(r.open,game,id,meta)+(kind==='gift'||kind==='support'?fallback.includes('这次花得有点多')?'这次花得有点多，下次不用这么贵。':'':''):fallback}
const receiveBeforeAuthored=receiveScripted;
receiveScripted=function(id,text,kind='event',meta={},token=null){return receiveBeforeAuthored(id,resolveAuthored(id,kind,meta,text),kind,meta,token)};
const seedBeforeAuthored=seedAdmissionGreetings;
seedAdmissionGreetings=function(){seedBeforeAuthored();for(const id of Sim.IDS){const row=game.chats[id][0],r=Authored.fixed(id,'greeting');if(row?.seed&&game.chats[id].length===1&&r)row.content=Authored.text(r.open,game,id)}};
for(const id of Sim.IDS)for(const f of game.dialogue.pending[id]||[])if(f.phase==='player')f.options=ChatFlow.options(id,f.kind,f.meta);
function novelTitle(scene){return scene.title.replace(/^(咖啡店|电影院|公园|炸鸡部|读书会|舞蹈社)\s*/, '')}
function closeNovel(){novelElement?.remove();novelElement=null;if(novelPrevious){app.inert=novelPrevious.app;$('#home').inert=novelPrevious.home;$('#homeButton').inert=novelPrevious.button;$('#lockToggle').disabled=novelPrevious.lock;novelPrevious=null}paintNovelResume()}
function paintNovelResume(){screen.querySelector('.novel-resume')?.remove();if(game.novel.active&&!novelElement&&!locked){const b=document.createElement('button');b.className='novel-resume';b.textContent='继续剧情';b.onclick=()=>renderNovel();screen.append(b)}}
function renderNovel(){
 const a=game.novel.active;if(!a)return closeNovel();const scene=Authored.DATA.scenes.find(s=>s.id===a.id);if(!scene){game.novel.active=null;saveCampus();return closeNovel()}
 if(!novelPrevious)novelPrevious={app:app.inert,home:$('#home').inert,button:$('#homeButton').inert,lock:$('#lockToggle').disabled};
 app.inert=true;$('#home').inert=true;$('#homeButton').inert=true;$('#lockToggle').disabled=true;screen.querySelector('.novel-resume')?.remove();novelElement?.remove();
 const el=document.createElement('section');el.className='campus-novel';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label',scene.title);novelElement=el;
 let page,position;if(a.phase==='pages'){page=scene.pages[a.index];position=(a.index+1)+' / '+scene.pages.length}else if(a.phase==='after'){page=scene.choices[a.choice]?.pages[a.after];position='你的选择'}
 el.innerHTML=`<header><button data-novel-close>‹ 手机</button><span>${escapeHTML(scene.kind==='festival'?'校园祭':scene.kind==='date'?scene.place:scene.kind==='job'?'周末打工':'周三社团')}</span><small>${position||'选择回应'}</small></header><div class="novel-heading"><span>${escapeHTML(scene.members.map(id=>C[id].name).join(' · '))}</span><h2>${escapeHTML(novelTitle(scene))}</h2></div><div class="novel-stage">${a.phase==='choice'?`<p class="novel-prompt">${escapeHTML(scene.prompt||'你会怎样回应？')}</p><div class="novel-options">${scene.choices.map((c,i)=>`<button data-novel-choice="${i}">${escapeHTML(c.text)}</button>`).join('')}</div>`:`${page?.speaker?`<div class="novel-speaker">${av(page.speaker)}<span>${C[page.speaker].name}</span></div>`:''}<p class="novel-text ${page?.speaker?'spoken':''}">${escapeHTML(window.CampusSpeechAddresses.peerReferences(page?.text||'',page?.speaker,scene.members))}</p><button class="novel-next" data-novel-next>${a.phase==='after'&&a.after===scene.choices[a.choice].pages.length-1||a.phase==='pages'&&a.index===scene.pages.length-1&&!scene.choices.length?'结束剧情':'继续　›'}</button>`}</div>`;
 screen.append(el);el.querySelector('[data-novel-close]').onclick=closeNovel;
 for(const b of el.querySelectorAll('[data-novel-choice]'))b.onclick=()=>{a.choice=Number(b.dataset.novelChoice);a.phase='after';a.after=0;saveCampus();renderNovel()};
 el.querySelector('[data-novel-next]')?.addEventListener('click',()=>{if(a.phase==='pages'&&a.index<scene.pages.length-1)a.index++;else if(a.phase==='pages'&&scene.choices.length)a.phase='choice';else if(a.phase==='after'&&a.after<scene.choices[a.choice].pages.length-1)a.after++;else{const finished=Authored.complete(game);saveCampus();closeNovel();if(!finished.review)for(const [id,g]of Object.entries(finished.gains||{}))showRelationChange(id,g);if(current==='school')renderSchool(schoolTab);if(game.novel.active)renderNovel();return}saveCampus();renderNovel()});
 el.querySelector('.novel-next,.novel-options button')?.focus({preventScroll:true});
}
function startNovel(scene,meta={}){Authored.begin(game,scene,meta);saveCampus();renderNovel()}
const openNotificationBeforeNovel=openNotificationChat;
openNotificationChat=function(id){closeNovel();openNotificationBeforeNovel(id)};
const activityBeforeNovel=activityMessage;
activityMessage=function(result,type){activityBeforeNovel(result,type);if(type==='club'){const c=Sim.CLUBS[result.id];const scene=Authored.choose(game,{kind:'club',actor:c.members[0],clubId:result.id});startNovel(scene,{key:'club-'+result.day,gains:result.gains})}};
const semesterBeforeNovel=semesterMessage;
semesterMessage=function(type,result){semesterBeforeNovel(type,result);if(type==='work'&&result.id)startNovel(Authored.choose(game,{kind:'job',actor:result.id}),{key:'work-'+game.school.day,gains:{[result.id]:result.gains}})};
const receiveDateBeforeNovel=receiveDate;
receiveDate=function(result){const row=receiveDateBeforeNovel(result);if(row){row.content=resolveAuthored(result.id,result.accepted?'dateAccepted':'dateDeclined',{place:result.place},row.content);const invite=Authored.fixed(result.id,result.accepted?'dateAccepted':'dateDeclined',{place:result.place});const previous=game.chats[result.id].at(-2);if(invite?.invite&&previous?.dateInvitation)previous.content=Authored.text(invite.invite,game,result.id);if(result.accepted)game.pendingDateNovel={id:result.id,place:result.place,day:game.school.day,gains:result.gains}}return row};
const closingBeforeNovel=ChatFlow.completeReply;
ChatFlow.completeReply=function(g,id,key,now){const flow=ChatFlow.head(g,id),row=closingBeforeNovel(g,id,key,now);if(flow?.kind==='dateAccepted'&&g.pendingDateNovel?.id===id){const plan=g.pendingDateNovel;delete g.pendingDateNovel;if(plan.day===g.school.day)queueMicrotask(()=>startNovel(Authored.choose(g,{kind:'date',actor:id,place:plan.place}),{key:'date-'+plan.day,gains:{[id]:plan.gains}}))}return row};
const festivalBeforeNovel=festivalPage;
festivalPage=function(){const s=game.school;if(!s.festival)return festivalBeforeNovel();const r=s.festival,scene=Authored.DATA.scenes.find(x=>x.kind==='festival'&&x.actor===r.id&&x.activity===r.activity);return `<div class="semester-event-heading"><span>9.25 / SCHOOL FESTIVAL</span><h3>${r.id?C[r.id].name+'和你的校园祭':'你独立完成的校园祭'}</h3></div><div class="campus-card"><p>${escapeHTML(scene?.pages[0]?.text||ProactiveStories.festivalScene(r.id,r.activity||'性转咖啡厅'))}</p>${scene?`<button class="campus-secondary" data-review-festival>回看这段剧情</button>`:''}</div><div class="school-settlement">${r.id?C[r.id].name+'：'+relationText(r.gains):'你独立完成了活动策划。'}</div>`};
app.addEventListener('click',e=>{if(e.target.closest('[data-complete-festival]')){const r=game.school.festival;if(r?.id){const scene=Authored.DATA.scenes.find(x=>x.kind==='festival'&&x.actor===r.id&&x.activity===r.activity);if(scene&&!game.novel.seen[scene.id])startNovel(scene,{key:'festival-'+game.school.day,gains:{[r.id]:r.gains}})}}if(e.target.closest('[data-review-festival]')){const r=game.school.festival,scene=Authored.DATA.scenes.find(x=>x.kind==='festival'&&x.actor===r.id&&x.activity===r.activity);startNovel(scene,{key:'review-'+Date.now(),review:true})}});
const nextBeforeNovel=nextDayButton;
nextDayButton=function(){let html=nextBeforeNovel();if(game.novel.active?.day===game.school.day&&!game.novel.active.review)html=html.replace('id="nextSchoolDay"','id="nextSchoolDay" disabled')+'<button class="campus-secondary" data-resume-novel>继续今日剧情</button>';if(game.pendingDateNovel?.day===game.school.day)html=html.replace('id="nextSchoolDay"','id="nextSchoolDay" disabled')+'<button class="campus-secondary" data-resume-date>先完成约会的KKT确认</button>';return html};
app.addEventListener('click',e=>{if(e.target.closest('[data-resume-novel]'))renderNovel();if(e.target.closest('[data-resume-date]')&&game.pendingDateNovel)openNotificationChat(game.pendingDateNovel.id)});
const unlockBeforeNovel=unlockCampus;
unlockCampus=function(){unlockBeforeNovel();paintNovelResume()};
const homeBeforeNovel=goHome;
goHome=function(){homeBeforeNovel();paintNovelResume()};
const validateBeforeNovel=validateCampusSave;
validateCampusSave=function(data){validateBeforeNovel(data);Authored.validate(data.novel)};
paintNovelResume();
