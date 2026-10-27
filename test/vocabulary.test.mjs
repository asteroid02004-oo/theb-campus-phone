import test from 'node:test';
import assert from 'node:assert/strict';
import E from '../game-src/vocabulary-engine.mjs';
import {vocabularyRequest,vocabularyResult} from '../game-src/vocabulary-protocol.mjs';
import {directVocabularyReply} from '../public/direct-protocol.mjs';
test('review dates, forgetting, daily limits and undo remain consistent across real days',()=>{
 const s=E.createState(),now=new Date(2026,9,28,12).getTime();E.seedDemo(s,now);s.settings.dailyNew=2;E.startSession(s,{now});assert.equal(s.session.queue.length,2);const id=E.currentWord(s).id;
 E.gradeWord(s,'easy',{now});assert.equal(s.words[id].stats.due,now+4*E.DAY);E.undoLast(s);assert.equal(s.words[id].stats.stage,'new');assert.equal(s.logs.length,0);
 E.gradeWord(s,'again',{now});assert.equal(s.words[id].stats.due,now+E.MINUTE);assert.equal(s.session.queue.filter(x=>x===id).length,2);E.gradeWord(s,'good',{now:now+1000});
 assert.equal(E.queueForToday(s,now+2000).length,0);assert.equal(E.dailyStats(s,now).newCount,2);assert.ok(E.queueForToday(s,now+E.MINUTE).includes(id));assert.equal(E.dailyStats(s,now+E.DAY).newCount,0);assert.ok(E.queueForToday(s,now+4*E.DAY).length>=2);
});
test('overlapping wordbooks merge content while preserving progress, favorites and translations',()=>{
 const s=E.createState();E.importBook(s,'A',[{term:'Trust',meaning:'信任',exampleTranslation:'信任朋友。'}]);const id=E.wordId('trust');s.words[id].favorite=true;s.words[id].stats=E.schedule(s.words[id].stats,'easy',1000);
 E.importBook(s,'B',[{term:'trust',meaning:'相信',exampleTranslation:'互相信任。'}],{update:true});assert.equal(s.books.length,2);assert.equal(Object.keys(s.words).length,1);assert.equal(s.words[id].stats.due,1000+4*E.DAY);assert.equal(s.words[id].favorite,true);assert.equal(s.words[id].translation,'互相信任。');
 const restored=E.restoreBackup(E.exportState(s));assert.equal(restored.words[id].stats.due,s.words[id].stats.due);assert.equal(restored.words[id].translation,'互相信任。');assert.equal(restored.words[id].favorite,true);assert.equal(restored.books.length,2);
});
test('practice does not move scheduled reviews, spelling ignores case but not wrong letters',()=>{
 const s=E.createState();E.seedDemo(s);const w=E.wordsInBook(s)[0];w.favorite=true;w.stats=E.schedule(w.stats,'easy',1000);const due=w.stats.due;E.startSession(s,{practice:true,filter:'favorites'});E.gradeWord(s,'again');assert.equal(w.stats.due,due);assert.equal(s.session.practice,true);assert.equal(E.spellingMatches('Campus','campus'),true);assert.equal(E.spellingMatches('campas','campus'),false);
});
test('AI dictionary accepts only bounded requested words and excludes invented or duplicate entries',async()=>{
 const request=vocabularyRequest({words:[{term:'campus',example:'At school.'}]});assert.throws(()=>vocabularyRequest({words:Array.from({length:9},()=>({term:'a'}))}));const result=vocabularyResult('```json\n'+JSON.stringify({words:[{term:'campus',meaning:'校园'},{term:'campus',meaning:'重复'},{term:'unrequested',meaning:'不属于本次'}]})+'\n```',request);assert.equal(result.words.length,1);
 const calls=[];const reply=await directVocabularyReply(request,'test-key-123456789',{connection:{provider:'custom',protocol:'chat-completions',baseUrl:'https://vocab.example/v1',model:'example'},fetchImpl:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return Response.json({choices:[{message:{content:JSON.stringify(result)}}]})}});assert.equal(reply.words[0].meaning,'校园');assert.equal(calls.length,1);assert.equal(calls[0].url,'https://vocab.example/v1/chat/completions');assert.ok(!JSON.stringify(calls[0].body).includes('李贤在'));assert.ok(!JSON.stringify(calls[0].body).includes('test-key-123456789'));
});
