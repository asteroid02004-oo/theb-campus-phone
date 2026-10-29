const NAMES={jae:'李贤在',ju:'李柱延',young:'金泳勋',sun:'金善旴',q:'池昌民'},GRADES={jae:3,ju:2,young:3,sun:1,q:2};
const ids=Object.keys(NAMES),aliases=Object.fromEntries(ids.flatMap(id=>[[NAMES[id],id],[NAMES[id].slice(-2),id]]));
const named=new RegExp('('+Object.keys(aliases).sort((a,b)=>b.length-a.length).join('|')+')(?:学长|学弟|同学)?','g');
export function peerReferences(value,speaker,members=ids){if(!ids.includes(speaker))return String(value||'');let last=null;let text=String(value||'').replace(named,(_,name)=>{const id=aliases[name];if(id!==speaker)last=id;return NAMES[id].slice(-2)+(id!==speaker&&GRADES[speaker]<GRADES[id]?'学长':'')});
 const others=members.filter(id=>id!==speaker&&ids.includes(id)),older=others.filter(id=>GRADES[id]>GRADES[speaker]);
 const target=last||(others.length===1?others[0]:older.length===1?older[0]:null);
 if(target){const address=NAMES[target].slice(-2)+(GRADES[speaker]<GRADES[target]?'学长':'');text=text.replace(/(^|[，。！？“”\n])学(?:长|弟)(?=[，。！？、\s]|$)/g,(_,prefix)=>prefix+address)}
 return text;
}
export default {peerReferences};
