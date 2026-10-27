const DAY=86400000,MINUTE=60000;
export const DEMO=[
 ['campus','n. 校园','Our campus is quiet after class.','放学后，我们的校园很安静。'],
 ['sponsor','v. 资助；n. 资助者','They sponsor a school reading club.','他们资助了一个学校读书社团。'],
 ['scholarship','n. 奖学金','She earned a scholarship through hard work.','她通过努力获得了奖学金。'],
 ['generous','adj. 慷慨的','It was generous of you to share your notes.','你愿意分享笔记，真大方。'],
 ['schedule','n. 日程表；v. 安排','I checked my schedule before making a plan.','制定计划前，我查看了日程表。'],
 ['reliable','adj. 可靠的','A reliable friend keeps a promise.','可靠的朋友会信守承诺。'],
 ['hesitate','v. 犹豫','Do not hesitate to ask a question.','有问题就尽管问。'],
 ['awkward','adj. 尴尬的；笨拙的','There was an awkward silence at first.','起初出现了一阵尴尬的沉默。'],
 ['trust','n. 信任；v. 相信','Trust grows through small acts of kindness.','信任在点滴善意中增长。'],
 ['promise','n. 承诺；v. 答应','He made a promise to return the book.','他答应会把书还回来。'],
 ['subtle','adj. 微妙的；不易察觉的','I noticed a subtle change in her voice.','我注意到她的声音有一丝微妙的变化。'],
 ['accompany','v. 陪伴；陪同','May I accompany you to the library?','我可以陪你去图书馆吗？'],
 ['literature','n. 文学','We talked about literature after school.','放学后，我们聊了文学。'],
 ['genuine','adj. 真诚的；真实的','His smile showed genuine happiness.','他的微笑流露出真切的快乐。'],
 ['rehearsal','n. 排练','The final rehearsal starts this afternoon.','最后一次排练今天下午开始。'],
 ['curiosity','n. 好奇心','Curiosity led her to open the old notebook.','好奇心驱使她打开那本旧笔记。'],
 ['embrace','v. 拥抱；欣然接受','She decided to embrace the new opportunity.','她决定欣然接受这个新机会。'],
 ['rumor','n. 传闻；谣言','A rumor is not the same as a fact.','传闻不等于事实。'],
 ['opportunity','n. 机会','Every new day brings an opportunity to learn.','每个新的一天都带来学习的机会。'],
 ['cherish','v. 珍惜；珍爱','I cherish the time we spend together.','我珍惜我们共度的时光。']
];
export const normaliseTerm=value=>String(value||'').normalize('NFKC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim().toLocaleLowerCase();
export const wordId=term=>'w-'+encodeURIComponent(normaliseTerm(term));
export function dayKey(time=Date.now()){const d=new Date(time);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
const clean=(s,max)=>String(s??'').trim().slice(0,max);
export function normaliseWord(value){
 if(typeof value==='string')value={term:value};
 const term=clean(value.term??value.word??value.front??value.english??value['单词'],90).replace(/\s+/g,' ');
 if(!/^[\p{L}\p{N}][\p{L}\p{M}\p{N}'’ .\-]{0,89}$/u.test(term)||term.length>70)return null;
 const meaning=clean(value.meaning??value.definition??value.translation??value.back??value.chinese??value['释义'],3000);
 return {id:wordId(term),term,meaning,phonetic:clean(value.phonetic??value.ipa??value.pronunciation,120),pos:clean(value.pos??value.partOfSpeech,80),example:clean(value.example??value.sentence,1200),translation:clean(value.exampleTranslation??value.example_translation??value.translationExample??(value.meaning!==undefined?value.translation:undefined),1200),notes:clean(value.notes??value.note,2000),tags:(Array.isArray(value.tags)?value.tags:String(value.tags||'').split(/[,;，；]/)).map(s=>clean(s,40)).filter(Boolean).slice(0,20),frequency:Math.max(0,Math.min(10000000,Number(value.frequency)||0))};
}
export function emptyStats(){return {stage:'new',step:0,due:0,interval:0,ease:2.5,repetitions:0,lapses:0,introduced:null,lastAt:0}}
export function createState(){return {version:1,settings:{dailyNew:20,dailyReview:100,mode:'flash',accent:'en-US',autoAudio:false},books:[],words:{},logs:[],activeBookId:'',session:null,extras:{}}}
export function seedDemo(state,now=Date.now()){if(state.books.length)return;return importBook(state,'校园日常 · 体验词书',DEMO.map(([term,meaning,example,translationExample])=>({term,meaning,example,translationExample})),{sourceName:'内置体验词书 · 20词',now,demo:true})}
export function importBook(state,title,rawWords,{sourceName='',now=Date.now(),update=false,demo=false,language='en-US'}={}){
 if(!Array.isArray(rawWords)||rawWords.length>20000)throw Error('每次最多导入20,000个词条，请拆分词书。');
 const unique=new Map();for(const raw of rawWords){const w=normaliseWord(raw);if(!w)continue;if(!unique.has(w.id))unique.set(w.id,w);else{const prev=unique.get(w.id);for(const k of ['meaning','phonetic','pos','example','translation','notes'])if(!prev[k]&&w[k])prev[k]=w[k];prev.frequency+=w.frequency}}
 if(!unique.size)throw Error('没有找到可导入的词条，请检查单词列。');
 let added=0,merged=0;for(const [id,w]of unique){const old=state.words[id];if(old){merged++;for(const k of ['meaning','phonetic','pos','example','translation','notes'])if(update?w[k]:!old[k]&&w[k])old[k]=w[k];old.tags=[...new Set([...(old.tags||[]),...w.tags])].slice(0,20);old.frequency=Math.max(old.frequency||0,w.frequency)}else{state.words[id]={...w,stats:emptyStats(),favorite:false,suspended:false,createdAt:now};added++}}
 const id='book-'+now+'-'+Math.random().toString(36).slice(2,9),book={id,title:clean(title,80)||'我的词书',sourceName:clean(sourceName,160),createdAt:now,language,demo,wordIds:[...unique.keys()]};state.books.push(book);state.activeBookId=id;state.session=null;return {book,added,merged,duplicates:rawWords.length-unique.size};
}
export function selectedBook(state){return state.books.find(b=>b.id===state.activeBookId)||state.books[0]||null}
export function wordsInBook(state,book=selectedBook(state)){return book?(book.wordIds||[]).map(id=>state.words[id]).filter(Boolean):[]}
export function dailyStats(state,time=Date.now()){
 const key=dayKey(time),logs=state.logs.filter(l=>dayKey(l.at)===key),introduced=new Set(logs.filter(l=>l.first).map(l=>l.wordId)),reviewed=new Set(logs.filter(l=>!l.first&&!l.practice).map(l=>l.wordId));
 return {key,newCount:introduced.size,reviewCount:reviewed.size,answers:logs.length,correct:logs.filter(l=>l.grade!=='again').length,milliseconds:logs.reduce((n,l)=>n+(l.duration||0),0)};
}
export function counts(state,now=Date.now()){
 const words=wordsInBook(state),active=words.filter(w=>!w.suspended),due=active.filter(w=>w.stats.stage!=='new'&&w.stats.due<=now),stats=dailyStats(state,now),extra=state.extras[stats.key]||{};
 return {total:words.length,new:active.filter(w=>w.stats.stage==='new').length,due:due.length,learning:active.filter(w=>w.stats.stage==='learning').length,mastered:words.filter(w=>w.suspended||w.stats.stage==='review'&&w.stats.interval>=21).length,newLeft:Math.max(0,state.settings.dailyNew+(extra.new||0)-stats.newCount),reviewLeft:Math.max(0,state.settings.dailyReview+(extra.review||0)-stats.reviewCount),today:stats};
}
export function queueForToday(state,now=Date.now()){
 const words=wordsInBook(state).filter(w=>!w.suspended),c=counts(state,now),learning=words.filter(w=>w.stats.stage==='learning'&&w.stats.due<=now).sort((a,b)=>a.stats.due-b.stats.due),reviews=words.filter(w=>w.stats.stage==='review'&&w.stats.due<=now).sort((a,b)=>a.stats.due-b.stats.due).slice(0,c.reviewLeft),fresh=words.filter(w=>w.stats.stage==='new').slice(0,c.newLeft);
 return [...learning,...reviews,...fresh].map(w=>w.id);
}
export function startSession(state,{mode=state.settings.mode,practice=false,filter='',now=Date.now()}={}){
 const words=wordsInBook(state).filter(w=>!w.suspended),queue=practice?words.filter(w=>filter==='favorites'?w.favorite:filter==='mistakes'?w.stats.lapses>0:true).map(w=>w.id):queueForToday(state,now);
 if(!queue.length)return null;
 state.session={id:'session-'+now,bookId:state.activeBookId,mode,practice,filter,queue,index:0,seen:{},answered:0,correct:0,startedAt:now,cardAt:now,flipped:false,answer:null,undo:null};return state.session;
}
export function currentWord(state){return state.session?state.words[state.session.queue[state.session.index]]||null:null}
export function schedule(stats,grade,now=Date.now()){
 const s={...stats};s.lastAt=now;if(s.stage==='new'){s.stage='learning';s.step=0;s.introduced=dayKey(now)}
 if(grade==='again'){s.lapses++;s.stage='learning';s.step=0;s.due=now+MINUTE;s.interval=0;return s}
 if(s.stage==='learning'){
  if(grade==='hard'){s.due=now+6*MINUTE;return s}
  if(grade==='easy'){s.stage='review';s.interval=4;s.repetitions++;s.due=now+4*DAY;return s}
  if(s.step===0){s.step=1;s.due=now+10*MINUTE;return s}
  s.stage='review';s.interval=1;s.repetitions++;s.due=now+DAY;return s;
 }
 const old=Math.max(1,s.interval||1);
 if(grade==='hard'){s.interval=Math.max(old+1,Math.round(old*1.2));s.ease=Math.max(1.3,s.ease-.15)}
 else if(grade==='easy'){s.interval=Math.max(old+2,Math.round(old*s.ease*1.3));s.ease=Math.min(3.5,s.ease+.15)}
 else s.interval=Math.max(old+1,Math.round(old*s.ease));
 s.interval=Math.min(3650,s.interval);s.due=now+s.interval*DAY;s.repetitions++;return s;
}
export function gradeWord(state,grade,{now=Date.now(),mode=state.session?.mode,duration=now-(state.session?.cardAt||now)}={}){
 if(!['again','hard','good','easy'].includes(grade))throw Error('请选择记忆情况。');
 const session=state.session,w=currentWord(state);if(!session||!w)throw Error('当前没有待学习的单词。');
 session.undo={wordId:w.id,stats:{...w.stats},logsLength:state.logs.length,index:session.index,queue:session.queue.slice(),seen:{...session.seen},answered:session.answered,correct:session.correct};
 const first=w.stats.stage==='new'&&!session.practice;
 if(!session.practice)w.stats=schedule(w.stats,grade,now);else if(grade==='again')w.stats.lapses++;
 state.logs.push({at:now,wordId:w.id,grade,mode,practice:session.practice,first,duration:Math.max(0,Math.min(120000,duration||0))});
 session.answered++;if(grade!=='again')session.correct++;session.seen[w.id]=(session.seen[w.id]||0)+1;
 if(grade==='again'&&session.seen[w.id]<3)session.queue.splice(Math.min(session.queue.length,session.index+4),0,w.id);
 session.index++;session.cardAt=now;session.flipped=false;session.answer=null;
 return {word:w,finished:session.index>=session.queue.length,first};
}
export function undoLast(state){const s=state.session,u=s?.undo;if(!u)return false;state.words[u.wordId].stats=u.stats;state.logs.splice(u.logsLength);Object.assign(s,{index:u.index,queue:u.queue,seen:u.seen,answered:u.answered,correct:u.correct,flipped:false,answer:null,undo:null,cardAt:Date.now()});return true}
export function spellingMatches(answer,term){return normaliseTerm(answer).replace(/[.\- ]/g,'')===normaliseTerm(term).replace(/[.\- ]/g,'')}
export function meaningChoices(state,word,rng=Math.random){if(!word.meaning)return [];const other=[...new Set(wordsInBook(state).filter(w=>w.id!==word.id&&w.meaning&&w.meaning!==word.meaning).map(w=>w.meaning))];for(let i=other.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[other[i],other[j]]=[other[j],other[i]]}const choices=[word.meaning,...other.slice(0,3)];for(let i=choices.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]]}return choices.length>=2?choices:[]}
export function streak(state,time=Date.now()){const days=new Set(state.logs.map(l=>dayKey(l.at))),d=new Date(time);if(!days.has(dayKey(d)))d.setDate(d.getDate()-1);let n=0;while(days.has(dayKey(d))){n++;d.setDate(d.getDate()-1)}return n}
export function exportState(state){return {kind:'deobi-vocabulary-backup',version:1,exportedAt:new Date().toISOString(),state:structuredClone(state)}}
export function restoreBackup(raw){
 const source=raw?.kind==='deobi-vocabulary-backup'?raw.state:null;if(!source||source.version!==1||!Array.isArray(source.books)||!source.words||typeof source.words!=='object')throw Error('这不是有效的单词本备份。');
 if(Object.keys(source.words).length>50000||source.books.length>200)throw Error('备份内容过大，请拆分词书后导入。');
 const state=createState(),idMap=Object.create(null);
 for(const [oldId,rawWord]of Object.entries(source.words)){const w=normaliseWord(rawWord);if(!w)throw Error('备份里有不正确的词条。');idMap[oldId]=w.id;const stats=rawWord.stats||{},stage=['new','learning','review'].includes(stats.stage)?stats.stage:'new';state.words[w.id]={...w,stats:{stage,step:stats.step===1?1:0,due:Number.isFinite(stats.due)&&stats.due>=0?stats.due:0,interval:Math.min(3650,Math.max(0,Number(stats.interval)||0)),ease:Math.min(3.5,Math.max(1.3,Number(stats.ease)||2.5)),repetitions:Math.max(0,Math.floor(Number(stats.repetitions)||0)),lapses:Math.max(0,Math.floor(Number(stats.lapses)||0)),introduced:/^\d{4}-\d{2}-\d{2}$/.test(stats.introduced)?stats.introduced:null,lastAt:Number.isFinite(stats.lastAt)?stats.lastAt:0},favorite:!!rawWord.favorite,suspended:!!rawWord.suspended,createdAt:Number(rawWord.createdAt)||Date.now()}}
 state.books=source.books.map((b,i)=>({id:'restored-book-'+i,title:clean(b.title,80)||'恢复的词书',sourceName:clean(b.sourceName,160),createdAt:Number(b.createdAt)||Date.now(),language:['en-US','en-GB','ko-KR','ja-JP'].includes(b.language)?b.language:'en-US',demo:!!b.demo,wordIds:[...new Set((Array.isArray(b.wordIds)?b.wordIds:[]).map(id=>idMap[id]).filter(Boolean))]}));
 state.activeBookId=state.books[source.books.findIndex(b=>b.id===source.activeBookId)]?.id||state.books[0]?.id||'';
 const settings=source.settings||{};state.settings={dailyNew:Math.max(1,Math.min(1000,Math.floor(Number(settings.dailyNew)||20))),dailyReview:Math.max(1,Math.min(5000,Math.floor(Number(settings.dailyReview)||100))),mode:['flash','recognise','spell','listen'].includes(settings.mode)?settings.mode:'flash',accent:['en-US','en-GB','ko-KR','ja-JP'].includes(settings.accent)?settings.accent:'en-US',autoAudio:!!settings.autoAudio};
 state.logs=(Array.isArray(source.logs)?source.logs:[]).filter(l=>idMap[l.wordId]&&Number.isFinite(l.at)&&['again','hard','good','easy'].includes(l.grade)).slice(-20000).map(l=>({wordId:idMap[l.wordId],at:l.at,grade:l.grade,mode:clean(l.mode,20),practice:!!l.practice,first:!!l.first,duration:Math.max(0,Math.min(120000,Number(l.duration)||0))}));
 for(const [date,extra]of Object.entries(source.extras||{}).slice(-370))if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&extra&&typeof extra==='object')state.extras[date]={new:Math.max(0,Math.min(20000,Number(extra.new)||0)),review:Math.max(0,Math.min(20000,Number(extra.review)||0))};
 return state;
}
export default {DAY,MINUTE,DEMO,normaliseTerm,wordId,normaliseWord,emptyStats,dayKey,createState,seedDemo,importBook,selectedBook,wordsInBook,dailyStats,counts,queueForToday,startSession,currentWord,schedule,gradeWord,undoLast,spellingMatches,meaningChoices,streak,exportState,restoreBackup};
