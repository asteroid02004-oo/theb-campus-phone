function cleanChatText(value){
 const pairs={'（':'）','(':')','[':']','【':'】'},closers=new Set(Object.values(pairs));let stack=[],out='';
 for(const ch of String(value||'')){
  if(pairs[ch]){stack.push(pairs[ch]);continue}
  if(closers.has(ch)){if(stack.length&&stack.at(-1)===ch)stack.pop();continue}
  if(!stack.length)out+=ch;
 }
 return out.replace(/```[\s\S]*?```/g,'').replace(/\*{1,2}[^*\n]+\*{1,2}/g,'').replace(/^\s*(?:ㅇㅇ|女友|回复|消息\s*\d+)\s*[:：]\s*/gm,'').replace(/^\s*(?:[-•]|\d+[.)、])\s+/gm,'').replace(/[ \t]+/g,' ').trim();
}
function chatMessages(value){
 const clean=cleanChatText(value);if(!clean)return [];
 const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('zh',{granularity:'sentence'}):null;
 return clean.split(/\n+/).flatMap(line=>segmenter?Array.from(segmenter.segment(line),x=>x.segment):(line.match(/[^。！？!?]+[。！？!?]*|[。！？!?]+/g)||[])).map(x=>x.trim()).filter(Boolean);
}
function chatBubbleDelay(text,index){return index===0?450:Math.max(900,Math.min(2300,650+Array.from(text).length*38))}
async function deliverChatBubbles(row,{wait=ms=>new Promise(r=>setTimeout(r,ms)),persist=()=>{},onProgress=()=>{}}={}){
 const parts=chatMessages(row.content);row.bubbleTimes=Array.isArray(row.bubbleTimes)?row.bubbleTimes:[];
 let count=Number.isInteger(row.visibleBubbles)?row.visibleBubbles:0;count=Math.max(0,Math.min(parts.length,count));
 for(let i=count;i<parts.length;i++){
  await wait(chatBubbleDelay(parts[i],i));
  row.visibleBubbles=i+1;row.bubbleTimes[i]=Date.now();persist();onProgress();
 }
}

export { cleanChatText, chatMessages, chatBubbleDelay, deliverChatBubbles };
