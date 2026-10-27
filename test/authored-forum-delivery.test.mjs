import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import Authored from '../game-src/authored-engine.mjs';
import Forum from '../game-src/forum-engine.mjs';
import Delivery from '../game-src/delivery.mjs';
import Sim from '../game-src/simulation.mjs';
import Stories from '../game-src/stories.mjs';
import {forumRequest,forumPrompt,forumResult} from '../public/forum-protocol.mjs';
import {directForumReply} from '../public/direct-protocol.mjs';
import {createPagesClient} from '../public/static-client.mjs';
import {createWorker} from '../src/worker.mjs';
const fresh=()=>({school:Sim.create(),player:{name:'夏宁'},nickname:'summer.note',chats:Object.fromEntries(Sim.IDS.map(id=>[id,[]])),memories:{},comments:{},posts:[],drafts:{},errors:{}});

test('the submitted scenes replace separate anime drafts and every actor has all three replacement festival activities',()=>{
 const scenes=Authored.DATA.scenes;
 assert.equal(scenes.length,59);assert.equal(scenes.filter(s=>s.kind==='festival').length,15);
 assert(!scenes.some(s=>/^CLUB-(YOUNG|SUN)-/.test(s.id)));
 assert.equal(scenes.filter(s=>s.clubId==='anime').length,3);
 for(const actor of Sim.IDS)assert.equal(scenes.filter(s=>s.kind==='festival'&&s.actor===actor).length,3);
 assert(scenes.find(s=>s.id==='FESTIVAL-Q-TTEOK').pages.some(p=>p.text.includes('很像平时两个人一起做饭的样子')));
 const shared=scenes.find(s=>s.id==='CLUB-ANIME-02');assert.equal(shared.choices[0].pages.filter(p=>p.speaker).length,3);
 assert(scenes.find(s=>s.id==='JOB-JAE-01').pages[0].text.includes('穿着衬衫，微微讶异'));
});

test('shared anime scene three requires strictly greater than 70 for either male and remains probabilistic',()=>{
 const game=fresh(),n=Authored.ensure(game);n.seen['CLUB-ANIME-01']=1;n.seen['CLUB-ANIME-02']=1;
 for(const score of [0,69,70]){game.school.relations.young.affection=score;game.school.relations.sun.affection=score;assert.notEqual(Authored.choose(game,{kind:'club',clubId:'anime',rng:()=>0}).id,'CLUB-ANIME-03')}
 game.school.relations.young.affection=71;assert.equal(Authored.choose(game,{kind:'club',clubId:'anime',rng:()=>0}).id,'CLUB-ANIME-03');assert.notEqual(Authored.choose(game,{kind:'club',clubId:'anime',rng:()=>.99}).id,'CLUB-ANIME-03');
 game.school.relations.young.affection=0;game.school.relations.sun.affection=71;assert.equal(Authored.choose(game,{kind:'club',clubId:'anime',rng:()=>0}).id,'CLUB-ANIME-03');
 n.seen['CLUB-ANIME-03']=1;assert.notEqual(Authored.choose(game,{kind:'club',clubId:'anime',rng:()=>0}).id,'CLUB-ANIME-03');
});

test('author edits reach gift choices, closing lines and proactive topics',()=>{
 Authored.apply(Stories);
 assert.equal(Stories.options('sun','gift',{itemId:'comic'})[0],'挑中了你喜欢的漫画？那看来我眼光还不错。');
 assert(Stories.followup('sun',{kind:'gift',meta:{itemId:'comic'}},0).text.includes('少女漫'));
 assert(Stories.JEALOUSY.young.open.includes('双人游戏卡带'));
 assert(Stories.ABSENCES.sun.open.includes('弃养'));
 assert.equal(Stories.ROMANCE.sun.find(t=>t.id==='sun-character').closing[0],'那我等你亲自检查。');
});

test('scene completion persists choices and public trigger state without granting duplicate social rewards',()=>{
 const game=fresh(),scene=Authored.DATA.scenes.find(s=>s.id==='CLUB-ANIME-03');const before=JSON.stringify(game.school.relations);
 Authored.begin(game,scene,{key:'club-day',gains:{sun:{affection:8,guard:7}}});game.novel.active.choice=0;Authored.complete(game);
 assert.equal(game.novel.choices[scene.id],'A');assert.equal(game.novel.aiNotes.sun.length,1);assert.equal(game.novel.aiNotes.young.length,1);assert.equal(JSON.stringify(game.school.relations),before);
 Authored.begin(game,scene,{key:'review',review:true});Authored.complete(game);assert.equal(game.novel.seen[scene.id],1);
});

test('a fixed closing received after the pending user message never becomes the API history tail',()=>{
 const rows=[{role:'assistant',content:'先前的消息。'},{id:'pending',role:'user',content:'你好呀'},{role:'assistant',content:'固定剧情的收尾。'}];
 const snapshot=Delivery.historySnapshot(rows,'pending',0,'');assert.equal(snapshot.messages.at(-1).role,'user');assert.equal(snapshot.messages.at(-1).content,'你好呀');assert(!snapshot.messages.some(m=>m.content.includes('固定剧情的收尾')));
});

test('exactly one retry is made, only the failed free message is removed and input text is recovered',async()=>{
 const game=fresh();game.chats.sun=[{role:'assistant',content:'固定剧情。'},{id:'pending',role:'user',content:'你好帅',pending:true},{role:'assistant',content:'刚收到的另一条消息。'}];game.pendingSends={sun:{rowId:'pending'}};
 let attempts=0;await assert.rejects(Delivery.withOneRetry(async()=>{attempts++;throw Error('offline')},{delay:async()=>{}}));assert.equal(attempts,2);
 Delivery.cancelPending(game,'sun','pending');assert.equal(game.chats.sun.length,2);assert(game.chats.sun.every(m=>m.role==='assistant'));assert.equal(game.drafts.sun,'你好帅');assert(!game.pendingSends.sun);assert(!game.errors.sun);
 let success=0;assert.equal(await Delivery.withOneRetry(async()=>{if(++success===1)throw Error('once');return 'ok'},{delay:async()=>{}}),'ok');assert.equal(success,2);
});

test('legacy errors and interrupted sends recover without deleting fixed replies or successful live exchanges',()=>{
 const game=fresh();game.chats.ju=[{role:'user',content:'旧的未送达消息。'},{role:'assistant',content:'后来收到的固定收尾。',fixedClosingTo:'fixed'}];game.errors.ju='消息格式不正确。';
 game.chats.q=[{role:'user',content:'已经收到回复的话。'},{role:'assistant',content:'有回复。',live:true}];game.errors.q='stale';
 Delivery.recoverPending(game);assert.equal(game.drafts.ju,'旧的未送达消息。');assert.equal(game.chats.ju.length,1);assert.equal(game.chats.q.length,2);assert.equal(Object.keys(game.errors).length,0);
});

test('forum handles are exact and old player comments keep their chosen nickname',()=>{
 assert.deepEqual(Forum.MALES,{jae:'leejaehyunow',ju:'tbzuyeon',q:'__qfeed__',young:'_0hoony',sun:'sunwoo'});
 const game=fresh();game.nickname='玩家的中文网名';game.comments.s1=[{author:game.nickname,text:'自己的评论。'}];const p={id:'s1',comments:[{author:'路过的同学',text:'同学的评论。'}]};
 const list=Forum.comments(game,p);assert.equal(list[1].author,game.nickname);assert.equal(list[1].player,true);assert(/^[A-Za-z0-9_.]+$/.test(list[0].author));
 for(const p of Authored.DATA.forum){assert(/^[A-Za-z0-9_.]+$/.test(Forum.handle(p.originalAuthor)));for(const c of p.comments)assert(/^[A-Za-z0-9_.]+$/.test(Forum.handle(c.originalAuthor)))}
});

test('forum gossip and festival posts are gated by matching progress and never posted twice',()=>{
 const saved=fresh();Forum.seed(saved,Authored.DATA.forum);Sim.validate(saved.school);Sim.validate(JSON.parse(JSON.stringify(saved.school)));
 const game=fresh();Forum.hydrate(game);assert.equal(Forum.matches('DOC-8',game),false);
 game.school.day=24;game.school.festivalPlan={status:'ready',selectedId:'ju',activity:'罗密欧与朱丽叶'};assert.equal(Forum.matches('DOC-8',game),false);assert.equal(Forum.matches('DOC-9',game),true);
 assert.equal(Forum.matches('DOC-13',game),false);Authored.ensure(game).choices['CLUB-ANIME-03']='A';game.school.relations.sun.affection=80;assert.equal(Forum.matches('DOC-13',game),true);
 const count=Forum.seed(game,Authored.DATA.forum);assert(count>0);assert.equal(Forum.seed(game,Authored.DATA.forum),0);
});

test('thread replies carry both the actual player text and the parent comment, with stable nesting',()=>{
 const game=fresh(),post={id:'s1',author:'luna.page',title:'音乐课',body:'今天音乐课学了一段新旋律。',comments:[{id:'root',author:Forum.MALES.young,text:'你最喜欢哪一段？',parentId:null}]};
 const row=Forum.addComment(game,post,'我最喜欢副歌的第二句。','root'),writers=Forum.writers(post,{...row,replyToAuthor:Forum.MALES.young},{rng:()=>0}),data=Forum.requestData(game,post,row,writers);
 assert.deepEqual(writers,['_0hoony']);assert.equal(data.replyTo.text,row.text);assert.equal(data.replyTo.parentId,'root');assert(data.comments.some(c=>c.id==='root'&&c.text.includes('哪一段')));
 const validated=forumRequest(data);assert(forumPrompt(validated).includes('不能只对整篇帖子泛泛评论'));assert(!JSON.stringify(validated).includes('balance'));
 assert.throws(()=>forumResult('{"replies":[{"author":"someone_else","text":"bad"}]}',validated));
});

test('all personal provider protocols support content-aware forum replies without a shared backend call',async()=>{
 const game=fresh(),post={id:'p1',author:game.nickname,title:'数学有点难',body:'第二道题不知道怎么开始。',comments:[]},raw=Forum.requestData(game,post,null,['luna.page']);
 for(const c of [{provider:'gemini',protocol:'gemini',model:'gemini-custom',baseUrl:'https://generativelanguage.googleapis.com/v1beta'},{provider:'deepseek',protocol:'chat-completions',model:'deepseek-flash',baseUrl:'https://api.deepseek.com'},{provider:'openai',protocol:'responses',model:'test-model',baseUrl:'https://api.openai.com/v1'},{provider:'custom',protocol:'chat-completions',model:'custom',baseUrl:'https://compatible.example/v1'}]){
  let requests=0;const result=await directForumReply(raw,'test-personal-key-abcdefghijklmnopqrstuvwxyz',{connection:c,fetchImpl:async(url,options)=>{requests++;assert(!url.includes('workers.dev'));assert(options.body.includes('第二道题'));const text=JSON.stringify({replies:[{author:'luna.page',text:'第二道题先看题目给了哪几个已知条件？'}]});return Response.json(c.protocol==='gemini'?{candidates:[{content:{parts:[{text}]}}]}:c.protocol==='responses'?{output:[{type:'message',content:[{type:'output_text',text}]}]}:{choices:[{message:{content:text}}]})}});assert.equal(result.replies[0].author,'luna.page');assert.equal(requests,1);
 }
});

test('sunwoo forum persona acknowledges his weak maths instead of pretending to be a tutor',()=>{
 const game=fresh(),post={id:'p-math',author:game.nickname,title:'金善旴，数学会不会？',body:'第二道题我还没弄懂，你能讲讲吗？',comments:[]};
 const data=forumRequest(Forum.requestData(game,post,null,['sunwoo']));
 assert(forumPrompt(data).includes('初二就放弃数学了'));assert(forumPrompt(data).includes('不假装擅长'));
});

test('direct forum errors never fall back and caller cancellation reaches personal API fetch',async()=>{
 const abort=new AbortController();let provider=0,backend=0,seenSignal;abort.abort();
 const client=createPagesClient({readConfig:()=>({apiBaseUrl:'https://shared.example'}),readPreferences:()=>({hasPersonalKey:()=>true,connection:()=>({provider:'gemini',protocol:'gemini',model:'m',baseUrl:'https://api.example'})}),location:{origin:'https://shared.example'},fetchImpl:async(url,init)=>{if(url.startsWith('https://shared.example'))backend++;else provider++;seenSignal=init.signal;throw Error('aborted')},loadProtocol:async()=>({directForumReply:async(data,key,options)=>{await options.fetchImpl('https://api.example',{signal:AbortSignal.timeout(1000)});return {replies:[]}}})});
 const response=await client('/api/forum',{headers:{'x-player-api-key':'personal-key-abcdefghijklmnop'},body:'{}',signal:abort.signal});assert.equal(response.status,503);assert.equal(provider,1);assert.equal(backend,0);assert.equal(seenSignal.aborted,true);
});

test('shared forum endpoint requires a signed session, uses the owner server key and returns only forum replies',async t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());const DB={prepare(sql){return {async run(){return db.prepare(sql).run()},bind(...args){return {async first(){return db.prepare(sql).get(...args)},async run(){return db.prepare(sql).run(...args)}}}}}};
 const owner='owner-key-for-test-abcdefghijklmnopqrstuvwxyz',base='https://forum-test.workers.dev',env={DB,SESSION_SECRET:'session-secret-test',GEMINI_API_KEY:owner,FREE_TIER_CONFIRMED:'true'},worker=createWorker(async(url,options)=>{assert.equal(options.headers['x-goog-api-key'],owner);assert(options.body.includes('我该先做哪一道'));return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({replies:[{author:'luna.page',text:'先从你看得懂题意的那一道开始，再标出卡住的步骤。'}]})}]}}]})});
 const game=fresh(),raw=Forum.requestData(game,{id:'p1',author:game.nickname,title:'复习安排',body:'我该先做哪一道题？',comments:[]},null,['luna.page']);
 const session=await worker.fetch(new Request(base+'/api/session'),env),token=(await session.json()).token,cookie=session.headers.get('set-cookie').split(';')[0];
 const req=()=>new Request(base+'/api/forum',{method:'POST',headers:{origin:base,'content-type':'application/json','x-phone-token':token,cookie},body:JSON.stringify(raw)});
 const response=await worker.fetch(req(),env);assert.equal(response.status,200);const data=await response.json();assert.equal(data.replies[0].author,'luna.page');assert(!JSON.stringify(data).includes(owner));
 const forged=new Request(base+'/api/forum',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify(raw)});assert.equal((await worker.fetch(forged,env)).status,403);
});
