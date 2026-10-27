import test from 'node:test';
import assert from 'node:assert/strict';
import R from '../game-src/vocabulary-rewards.mjs';
import E from '../game-src/vocabulary-engine.mjs';
import Dialogue from '../game-src/dialogue.mjs';
const names={jae:'贤在',ju:'柱延',young:'泳勋',sun:'善旴',q:'昌民'},grades={jae:3,ju:2,young:3,sun:1,q:2};
test('all fifteen authored scenes have two matching branches, three-day text and grade-aware forms of address',()=>{
 for(const actor of Object.keys(names))for(let kind=1;kind<=3;kind++)for(const grade of ['高一','高二','高三']){
  const scene=R.scene(actor,kind,{name:'夏宁',grade});assert.equal(scene.options.length,2);assert.equal(scene.answers.length,2);const all=[scene.open,...scene.options,...scene.answers].join('\n');assert.ok(!/【玩家】|\{玩家\}|七天|一个星期|一整周/.test(all));
  const playerLevel=['高一','高二','高三'].indexOf(grade)+1;
  if(playerLevel===grades[actor])assert.ok(!/学长|学弟|学姐|学妹/.test(scene.options.join('')),'Same grade must use name');
  else if(playerLevel>grades[actor])assert.ok(!scene.options.join('').includes('学长'),'Younger boys must not be called senior');
  if(kind===3)assert.match(scene.open,/三天/);
 }
 assert.equal(R.scene('ju',1,{name:'夏宁',grade:'高二'}).options[0],'那柱延可以抱抱我吗？');
 assert.equal(R.scene('ju',1,{name:'夏宁',grade:'高三'}).options[0],'那柱延学弟可以抱抱我吗？');
 assert.match(R.scene('jae',1,{name:'夏宁',grade:'高一'}).open,/夏宁/);
 assert.equal(R.adapt('学妹，今天很棒。',{actor:'sun',grade:'高三',name:'夏宁'},'male'),'学姐，今天很棒。');
});
test('only completed daily new-word tasks count: third consecutive day is special, day four returns to one or two',()=>{
 const state=E.createState(),base=new Date(2026,9,28,12).getTime();
 for(let day=0;day<5;day++){
  const now=base+day*E.DAY,wordId='new-word-'+day;R.beginTask(state,{goal:1,now});
  state.logs.push({at:now,wordId,first:true,practice:false,grade:'again'});assert.equal(R.completeTask(state,{now}).completedAt,0,'Failed recall is not completion');
  state.logs.push({at:now+1,wordId,first:false,practice:false,grade:'good'});const task=R.completeTask(state,{now:now+1,rng:()=>day%2?.9:.1});assert.equal(task.streak,day+1);assert.equal(task.scenario,day===2?3:day%2?2:1);
  task.deliveredAt=now+2;assert.equal(R.pendingReward(state,now),null);const again=R.completeTask(state,{now:now+3,rng:()=>.99});assert.equal(again.scenario,task.scenario);
 }
 const afterGap=base+6*E.DAY;R.beginTask(state,{goal:1,now:afterGap});state.logs.push({at:afterGap,wordId:'after-gap',first:true,practice:false,grade:'easy'});assert.equal(R.completeTask(state,{now:afterGap}).streak,1);
 const restored=E.restoreBackup(E.exportState(state));assert.deepEqual(restored.dailyTasks,state.dailyTasks);
 const practice=E.createState();R.beginTask(practice,{goal:1,now:base});practice.logs.push({at:base,wordId:'practice',first:true,practice:true,grade:'easy'});assert.equal(R.completeTask(practice,{now:base}).completedAt,0);
});
test('every authored vocabulary branch locks free input until one matching male closing, with daily deduplication',()=>{
 for(const actor of Object.keys(names))for(let scenario=1;scenario<=3;scenario++)for(const index of [0,1]){
  const game={school:{day:0},chats:Object.fromEntries(Object.keys(names).map(id=>[id,[]]))},scene=R.scene(actor,scenario,{name:'夏宁',grade:'高二'}),meta={...scene,date:'2026-10-28',scenario};
  const row=Dialogue.appendFixed(game,actor,scene.open,'vocabulary',meta,'vocabulary-daily:2026-10-28');assert.ok(Dialogue.locked(game,actor));assert.equal(Dialogue.appendFixed(game,actor,scene.open,'vocabulary',meta,'vocabulary-daily:2026-10-28'),null);
  const reply=Dialogue.reply(game,actor,row.choiceId,index);assert.equal(reply.content,scene.options[index]);assert.ok(Dialogue.locked(game,actor));
  const restored=JSON.parse(JSON.stringify(game));Dialogue.validate(restored.dialogue);const end=Dialogue.completeReply(restored,actor,row.choiceId);assert.equal(end.content,scene.answers[index]);assert.ok(!Dialogue.locked(restored,actor));assert.equal(end.terminal,true);assert.equal(restored.chats[actor].length,3);
 }
});
