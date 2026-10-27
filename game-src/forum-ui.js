const Forum=window.CampusForum;
Forum.hydrate(game);
for(const job of Object.values(game.forumState.jobs))if(job.status==='pending'){job.status='failed';job.error='这次回复连接已中断。你可以继续发帖和回复。'}
const forumInFlight=new Map();let activeForumPost='',forumReplyTarget=null,seedingForum=false;
function syncAuthoredForum(){if(seedingForum)return 0;seedingForum=true;try{return Forum.seed(game,Authored.DATA.forum)}finally{seedingForum=false}}
const saveBeforeForum=saveCampus;
saveCampus=function(){syncAuthoredForum();return saveBeforeForum()};
syncAuthoredForum();
const forumPostsBeforeAll=allPosts;
allPosts=function(){syncAuthoredForum();const list=forumPostsBeforeAll();for(const p of list)if(!game.posts.includes(p))p.author=Forum.handle(p.author);return list};
postCard=function(p,detail=false){
 const count=Forum.comments(game,p).length,liked=game.likes.includes(p.id),author=game.posts.includes(p)?p.author:Forum.handle(p.author),actor=Forum.actorFromHandle(author);
 return `<article class="forum-post ${detail?'forum-post-detail':''}"><div class="meta"><span>${escapeHTML(p.tag||'校园日常')}</span><span>· ${escapeHTML(author)}</span>${actor?'<span class="forum-male-tag">同学</span>':''}</div>${detail?`<h3>${escapeHTML(p.title)}</h3><p class="forum-body-copy">${escapeHTML(p.body)}</p>`:`<button class="forum-post-open" data-post="${p.id}"><h3>${escapeHTML(p.title)}</h3><p>${escapeHTML(p.body.slice(0,100))}${p.body.length>100?'…':''}</p></button>`}<footer><button data-like="${p.id}" aria-pressed="${liked}">${liked?'♥ 1':'♡ 0'}</button><span>${count} 条回复</span>${!detail?`<button data-post="${p.id}">查看讨论 ›</button>`:''}</footer></article>`;
};
function forumCommentsHtml(post){
 const all=Forum.comments(game,post),byId=new Map(all.map(c=>[c.id,c])),visited=new Set(),rows=[];
 function add(c,depth){if(visited.has(c.id))return;visited.add(c.id);const parent=byId.get(c.parentId);rows.push(`<article class="forum-comment ${depth?'nested':''}" style="--reply-depth:${Math.min(depth,3)}" id="forum-${escapeHTML(c.id)}"><header><strong>${escapeHTML(c.author)}</strong>${c.player?'<small>我</small>':''}${parent?`<span>回复 @${escapeHTML(parent.author)}</span>`:''}</header><p>${escapeHTML(c.text)}</p><button data-forum-reply="${escapeHTML(c.id)}">回复</button></article>`);for(const child of all)if(child.parentId===c.id)add(child,depth+1)}
 for(const c of all)if(!c.parentId||!byId.has(c.parentId))add(c,0);for(const c of all)if(!visited.has(c.id))add(c,0);
 return rows.join('')||'<p class="school-copy">还没有回复，来聊第一句吧。</p>';
}
function forumJobStatus(post){const jobs=Object.values(game.forumState.jobs).filter(j=>j.postId===post.id),pending=jobs.some(j=>j.status==='pending');return pending?'<p class="forum-response-status" role="status">同学正在看你的消息…</p>':jobs.at(-1)?.status==='failed'?'<p class="forum-response-status">同学暂时没有新的回复，你可以继续发帖和评论。</p>':''}
showPost=function(id){
 const p=allPosts().find(p=>p.id===id);if(!p)return;activeForumPost=id;
 if(forumReplyTarget&&!Forum.comments(game,p).some(c=>c.id===forumReplyTarget))forumReplyTarget=null;
 const parent=Forum.comments(game,p).find(c=>c.id===forumReplyTarget);
 app.innerHTML=`<header class="campus-top"><button data-forum-back>‹ 论坛</button><h2>校园帖子</h2><span></span></header><div class="campus-body forum-thread">${postCard(p,true)}<section class="forum-comments" aria-label="帖子回复">${forumCommentsHtml(p)}</section>${forumJobStatus(p)}<form class="campus-form forum-compose" id="commentForm"><label for="commentText">${parent?'回复 @'+escapeHTML(parent.author):'参与讨论'}</label>${parent?`<div class="forum-quoted">${escapeHTML(parent.text.slice(0,160))}<button type="button" id="cancelForumReply">取消回复</button></div>`:''}<textarea id="commentText" required maxlength="500" placeholder="自由写下你的回复…"></textarea><button class="campus-primary">发表回复</button></form></div>`;
 $('#cancelForumReply')?.addEventListener('click',()=>{const draft=$('#commentText').value;forumReplyTarget=null;showPost(id);$('#commentText').value=draft});
 $('#commentForm').onsubmit=e=>{e.preventDefault();const text=$('#commentText').value.trim();if(!text)return;requireNickname(()=>{try{const row=Forum.addComment(game,p,text,forumReplyTarget),parent=Forum.comments(game,p).find(c=>c.id===row.parentId);forumReplyTarget=null;saveCampus();showPost(id);queueForumReplies(p,row,parent?.author||p.author)}catch(error){toast(error.message)}})};
};
newForumPost=function(){requireNickname(()=>{
 activeForumPost='';forumReplyTarget=null;
 app.innerHTML=`<header class="campus-top"><button data-forum-back>‹ 返回</button><h2>写下校园日常</h2><span></span></header><div class="campus-body"><form class="campus-form" id="postForm"><label for="postTag">分区</label><select id="postTag"><option>校园日常</option><option>失物招领</option><option>兴趣小组</option><option>学习交流</option><option>校园树洞</option></select><label for="postTitle">标题</label><input id="postTitle" required maxlength="60" placeholder="想聊些什么？"><label for="postBody">正文</label><textarea id="postBody" required maxlength="2000" placeholder="自由写下今天的故事、问题或想法…"></textarea><small>以 ${escapeHTML(game.nickname)} 的身份发布。</small><button class="campus-primary">发布帖子</button></form></div>`;
 $('#postForm').onsubmit=e=>{e.preventDefault();const title=$('#postTitle').value.trim(),body=$('#postBody').value.trim();if(!title||!body)return;const p={id:'p'+crypto.randomUUID(),author:game.nickname,title,body,tag:$('#postTag').value,at:Date.now(),comments:[],own:true};game.posts.unshift(p);saveCampus();showPost(p.id);queueForumReplies(p,null)};
})};
function repaintForumThread(postId){if(current!=='school'||activeForumPost!==postId||!$('#commentForm'))return;const text=$('#commentText')?.value||'',parent=forumReplyTarget,body=$('.forum-thread'),scroll=body?.scrollTop||0;showPost(postId);forumReplyTarget=parent;$('#commentText').value=text;if($('.forum-thread'))$('.forum-thread').scrollTop=scroll}
async function queueForumReplies(post,row,replyToAuthor=''){
 const rootGame=game,state=Forum.hydrate(game),key=post.id+'-'+(row?.id||'post');if(state.jobs[key]||forumInFlight.has(key))return;
 const requested=Forum.writers(post,row?{...row,replyToAuthor}:null),data=Forum.requestData(game,post,row,requested),job={id:key,postId:post.id,parentId:row?.id||null,status:'pending',at:Date.now()};state.jobs[key]=job;forumInFlight.set(key,true);saveCampus();repaintForumThread(post.id);
 try{
  const result=await Delivery.withOneRetry(async()=>{
   if(!campusToken)await initializeApi();if(!campusToken)throw Error('暂时无法连接。');
   const response=await campusApiFetch('/api/forum',{method:'POST',headers:window.CampusApiPreferences.chatHeaders({'Content-Type':'application/json','x-phone-token':campusToken}),body:JSON.stringify(data),signal:AbortSignal.timeout(35000)});
   let body;try{body=await response.json()}catch{throw Error('这次没有收到同学回复。')}
   if(!response.ok){if(response.status===403)campusToken='';throw Error(body.error||'这次没有收到同学回复。')}
   if(!Array.isArray(body.replies)||!body.replies.length||body.replies.some(r=>!requested.includes(r.author)||typeof r.text!=='string'||!r.text.trim()||r.text.length>600))throw Error('这次同学的回复暂时没有整理好。');return body;
  });
  if(game!==rootGame||job.status!=='pending')return;
  for(let i=0;i<result.replies.length;i++){const reply=result.replies[i],id='ai-'+key+'-'+i;if(Forum.comments(game,post).some(c=>c.id===id))continue;(game.comments[post.id]||=[]).push({id,author:reply.author,text:reply.text,parentId:row?.id||null,at:Date.now()+i,generated:true})}job.status='done';
 }catch{if(game===rootGame)job.status='failed'}finally{forumInFlight.delete(key);if(game===rootGame){saveCampus();repaintForumThread(post.id)}}
}
app.addEventListener('click',e=>{const b=e.target.closest('[data-forum-reply]');if(b&&activeForumPost){const text=$('#commentText')?.value||'';forumReplyTarget=b.dataset.forumReply;showPost(activeForumPost);$('#commentText').value=text;$('#commentText').focus();$('#commentForm').scrollIntoView({block:'nearest'})}if(e.target.closest('[data-forum-back]')){activeForumPost='';forumReplyTarget=null}});
const validateBeforeForum=validateCampusSave;
validateCampusSave=function(data){validateBeforeForum(data);Forum.validate(data.forumState);for(const list of Object.values(data.comments||{}))if(list.some(c=>c.parentId!==undefined&&c.parentId!==null&&typeof c.parentId!=='string'||c.id!==undefined&&typeof c.id!=='string'))throw Error('论坛楼层格式不正确。')};
saveCampus();
