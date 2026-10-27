import {unzipSync,strFromU8} from 'fflate';
import {normaliseWord,normaliseTerm} from './vocabulary-engine.mjs';
export const MAX_BYTES=12*1024*1024;
const STOP=new Set('a an the and or but if then than of to in on at for with from by as is am are was were be been being have has had do does did can could may might will would shall should must i me my mine we us our you your he him his she her it its they them their this that these those not no so very just also there here what when where who which how why all any some each every both either neither other such more most much many few little own same into over under out up down about after before again once only too really get got getting said say says like know think one two three'.split(' '));
const ALIASES={term:['term','word','front','english','单词','词语','词汇'],meaning:['meaning','definition','back','chinese','释义','中文','解释','translation'],phonetic:['phonetic','ipa','音标','pronunciation'],pos:['pos','partofspeech','词性'],example:['example','sentence','例句'],exampleTranslation:['exampletranslation','translationexample','例句翻译'],notes:['notes','note','备注'],tags:['tags','标签']};
const fieldOf=s=>Object.keys(ALIASES).find(k=>ALIASES[k].includes(String(s||'').toLowerCase().replace(/[\s_-]/g,'')));
export function parseDelimited(text,delimiter){
 const rows=[];let row=[],value='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++}else if(quoted||!value)quoted=!quoted;else value+=c}else if(!quoted&&c===delimiter){row.push(value);value=''}else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(x=>x.trim()))rows.push(row);row=[];value=''}else value+=c}
 if(quoted)throw Error('表格里有未闭合的引号，请检查 CSV。');row.push(value);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
export function tableWords(rows,{header,mapping}={}){
 if(!rows.length)return {words:[],columns:[],header:false,mapping:{},rows:[]};
 const detected=rows[0].some(s=>fieldOf(s)==='term');header=header??detected;
 const columns=Array.from({length:Math.max(...rows.slice(0,100).map(r=>r.length))},(_,i)=>header?String(rows[0][i]||'列 '+(i+1)):'列 '+(i+1));
 mapping=mapping||Object.fromEntries(columns.map((s,i)=>[fieldOf(s),i]).filter(([k])=>k));if(mapping.term===undefined)mapping={term:0,meaning:1,...mapping};
 const body=header?rows.slice(1):rows;
 const words=body.map(row=>Object.fromEntries(Object.entries(mapping).filter(([,i])=>i>=0).map(([key,i])=>[key,row[i]||'']))).map(normaliseWord).filter(Boolean);
 return {words,columns,header,mapping,rows};
}
export function parseText(text,extension='txt'){
 text=text.replace(/^\uFEFF/,'');const lines=text.split(/\r?\n/).filter(l=>!l.trim().startsWith('#'));
 const first=lines.find(l=>l.trim())||'',delimiter=extension==='tsv'?'\t':extension==='csv'?',':first.includes('\t')?'\t':first.includes(',')?',':first.includes(';')?';':first.includes('|')?'|':null;
 if(delimiter)return {...tableWords(parseDelimited(lines.join('\n'),delimiter)),kind:'table'};
 const rows=lines.filter(s=>s.trim()).map(s=>{const match=s.trim().match(/^([A-Za-z][A-Za-z'’ .-]{0,65}?)\s+(?=(?:[a-z]+\.\s*)?[\u3400-\u9fff])(.*)$/);return match?[match[1],match[2]]:[s.trim()]});
 return {...tableWords(rows,{header:false}),kind:'table'};
}
function parseXML(text){if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('文档含有不支持的外部实体。');const xml=new DOMParser().parseFromString(text,'application/xml');if(xml.getElementsByTagName('parsererror').length)throw Error('文档 XML 损坏，请重新保存后导入。');return xml}
const all=(node,tag)=>[...node.getElementsByTagNameNS('*',tag)];
function unzip(bytes){let total=0;const archive=unzipSync(bytes,{filter:file=>{if(file.originalSize>20*1024*1024)throw Error('文档解压后过大，请拆分。');total+=file.originalSize;if(total>60*1024*1024)throw Error('文档解压后过大，请拆分。');return /^(word\/document\.xml|xl\/(sharedStrings\.xml|workbook\.xml|_rels\/workbook\.xml.rels|worksheets\/sheet\d+\.xml))$/.test(file.name)}});return Object.fromEntries(Object.entries(archive).map(([k,v])=>[k,strFromU8(v)]))}
export function parseDocx(bytes){const files=unzip(bytes);if(!files['word/document.xml'])throw Error('没有找到 Word 正文。');const xml=parseXML(files['word/document.xml']);return all(xml,'p').map(p=>[...p.getElementsByTagNameNS('*','r')].map(r=>[...r.childNodes].map(n=>n.localName==='t'?n.textContent:n.localName==='tab'?'\t':n.localName==='br'?'\n':'').join('')).join('')).join('\n')}
function colIndex(ref){const letters=(ref.match(/^[A-Z]+/)||['A'])[0];let n=0;for(const c of letters)n=n*26+c.charCodeAt(0)-64;return n-1}
export function parseXlsx(bytes){const files=unzip(bytes),strings=files['xl/sharedStrings.xml']?all(parseXML(files['xl/sharedStrings.xml']),'si').map(si=>all(si,'t').map(n=>n.textContent).join('')):[];
 let sheet='xl/worksheets/sheet1.xml';
 if(files['xl/workbook.xml']&&files['xl/_rels/workbook.xml.rels']){const first=all(parseXML(files['xl/workbook.xml']),'sheet')[0],rid=first?.getAttribute('r:id'),relation=all(parseXML(files['xl/_rels/workbook.xml.rels']),'Relationship').find(r=>r.getAttribute('Id')===rid),target=relation?.getAttribute('Target');if(target)sheet=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'')}
 if(!files[sheet])sheet=Object.keys(files).find(s=>s.startsWith('xl/worksheets/'));if(!sheet)throw Error('没有找到工作表。');
 const rows=all(parseXML(files[sheet]),'row');if(rows.length>22000)throw Error('工作表超过22,000行，请拆分后导入。');return rows.map(r=>{const row=[];for(const c of all(r,'c')){const i=colIndex(c.getAttribute('r')||'A');if(i>100)continue;const type=c.getAttribute('t'),v=all(c,'v')[0]?.textContent||'';row[i]=type==='s'?strings[Number(v)]||'':type==='inlineStr'?all(c,'t').map(n=>n.textContent).join(''):v}return row});
}
export function corpusWords(text,{removeStopWords=true,minFrequency=1}={}){
 if(text.length>3000000)throw Error('语料超过300万字符，请拆分导入。');const map=new Map(),regex=/\b[A-Za-z]+(?:['’][A-Za-z]+)?(?:-[A-Za-z]+)*\b/g;let match;
 while((match=regex.exec(text))){const term=normaliseTerm(match[0]);if(term.length<2||term.length>40||removeStopWords&&STOP.has(term))continue;let item=map.get(term);if(item){item.frequency++;continue}if(map.size>=20000)continue;const start=Math.max(0,text.lastIndexOf('.',match.index-1)+1,text.lastIndexOf('\n',match.index-1)+1),end=text.indexOf('.',match.index+term.length);let example=text.slice(start,end<0?Math.min(text.length,start+260):Math.min(end+1,start+260)).trim().replace(/\s+/g,' ');if(!example.includes(match[0]))example=text.slice(Math.max(0,match.index-70),match.index+150).replace(/\s+/g,' ');map.set(term,{term,frequency:1,example})}
 return [...map.values()].filter(w=>w.frequency>=minFrequency).sort((a,b)=>b.frequency-a.frequency||a.term.localeCompare(b.term));
}
export async function readImport(file,{mode='words',removeStopWords=true,minFrequency=1}={}){
 if(file.size>MAX_BYTES)throw Error('文件超过12MB，请拆分后导入。');const extension=file.name.split('.').pop().toLowerCase();let text='',result;
 if(['doc','xls'].includes(extension))throw Error('请先将旧版文件另存为 DOCX / XLSX，或导出 TXT / CSV。');
 if(extension==='docx')text=parseDocx(new Uint8Array(await file.arrayBuffer()));
 else if(extension==='xlsx'){if(mode==='corpus')throw Error('语料提取请使用 TXT、DOCX 或 PDF；XLSX 请按词书导入。');result={...tableWords(parseXlsx(new Uint8Array(await file.arrayBuffer()))),kind:'table'}}
 else if(extension==='pdf'){
  const modulePath='./vocabulary-pdf.mjs',pdfjs=await import(/* @vite-ignore */modulePath);pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vocabulary-pdf.worker.mjs',location.href).href;
  const doc=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useWorkerFetch:false}).promise;
  try{if(doc.numPages>350)throw Error('PDF 超过350页，请拆分。');for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i),content=await page.getTextContent();text+=content.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join('')+'\n';page.cleanup();if(text.length>3000000)throw Error('PDF 文字过多，请拆分。')}}finally{await doc.destroy()}
  if(!text.trim())throw Error('这份 PDF 没有可提取的文字，可能是扫描件；请先 OCR 或转为文字文档。');
 }else if(!result)text=await file.text();
 if(mode==='corpus'){if(result)throw Error('请选择文字语料。');return {kind:'corpus',words:corpusWords(text,{removeStopWords,minFrequency}),text}}
 if(result)return result;
 if(['json','jsonl'].includes(extension)){
  let raw;try{raw=extension==='jsonl'?text.split(/\r?\n/).filter(s=>s.trim()).map(s=>JSON.parse(s)):JSON.parse(text)}catch{throw Error('JSON 文件格式不正确。')}
  if(raw?.kind==='deobi-vocabulary-backup')return {kind:'backup',backup:raw};
  const list=Array.isArray(raw)?raw:Array.isArray(raw.words)?raw.words:Object.entries(raw).map(([term,meaning])=>({term,meaning}));return {kind:'words',words:list.map(normaliseWord).filter(Boolean)};
 }
 return parseText(text,extension);
}
export default {readImport,tableWords,corpusWords};
