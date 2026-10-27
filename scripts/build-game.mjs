import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {CHARACTERS} from '../game-src/characters.mjs';
import AuthoredData from '../game-src/authored-data.mjs';
const require=createRequire(import.meta.url),{build}=require('esbuild');
const root=path.resolve(import.meta.dirname,'..'),src=root+'/game-src',pub=root+'/public';
const read=f=>fs.readFileSync(src+'/'+f,'utf8'),write=(file,value)=>fs.writeFileSync(pub+'/'+file,value);
const images=JSON.parse(read('image-paths.json')),safeJson=data=>JSON.stringify(data).replaceAll('<','\u003c');
const C=structuredClone(CHARACTERS);for(const c of Object.values(C))if(c.avatar)c.avatar=images[c.avatar];
function moduleScript(file,imports={}){let s=read(file);for(const [from,to]of Object.entries(imports))s=s.replace(from,to);s=s.replace(/\bexport default\b/g,'return').replace(/\bexport (?=(?:async )?function|const|let|class)/g,'');return '(()=>{'+s+'})()'}
const simulation=moduleScript('simulation.mjs'),stories=moduleScript('stories.mjs'),dialogue=moduleScript('dialogue.mjs',{"import Stories from './stories.mjs';":'const Stories=window.CampusStories;'}),authored=moduleScript('authored-engine.mjs',{"import DATA from './authored-data.mjs';":'const DATA=window.CampusAuthoredData;'});
let html=read('phone-shell.html').replace(/<title>.*?<\/title>/,'<title>得比高中</title>').replace("const PASSCODE='980115'","const PASSCODE='230108'").replaceAll('found-phone-notes','deobi-campus-notes-v1').replace(/const CALENDAR_EVENTS=\[[\s\S]*?\];/,'const CALENDAR_EVENTS=[];');
const css=['campus.css','kkt.css','gameplay.css','semester.css','funding.css','messaging.css','responsive.css','player-api.css','novel.css','forum.css','vocabulary.css'].map(read).join('\n');
html=html.replace('</head>','<meta name="description" content="得比高中校园手机"><style>'+css+'\n:root{--campus-wallpaper:url("'+images['assets/wallpaper.jpg']+'");--lock-wallpaper:var(--campus-wallpaper)}</style><script src="./config.js"></script><script src="./api-client.js"></script><script>'+read('api-preferences.js')+'</script></head>');
const additions=['kkt.js','gameplay.js','semester.js','enrollment.js','funding.js','messaging.js','proactive-ui.js','late-semester-ui.js','novel-ui.js','delivery-ui.js','forum-ui.js','player-api.js','vocabulary-integration.js'].map(read).join('\n');
let main=read('campus.js').replace('installCampusHome();initializeApi();',additions+'\ninstallCampusHome();initializeApi();startCampusWithApiSetup();');
main=main.replace(/\bfetch\((['"])\/api\//g,'campusApiFetch($1/api/');
html=html.replace('</body>','<script>window.CampusSim='+simulation+';window.CampusStories='+stories+';window.CampusDialogue='+dialogue+';window.CampusAuthoredData='+safeJson(AuthoredData)+';window.CampusAuthored='+authored+';window.CampusDelivery='+moduleScript('delivery.mjs')+';window.CampusForum='+moduleScript('forum-engine.mjs')+';</script><script>window.CAMPUS_CREST='+safeJson(images['assets/school-crest.png'])+';window.CAMPUS_CHARACTERS='+safeJson(C)+';</script><script src="./vocabulary-app.js"></script><script>'+main+'</script><script>'+read('responsive.js')+'</script></body>');
html=html.replace(/(-?(?:\d*\.)?\d+)cqw\b/g,(_,n)=>'calc(var(--phone-u, 1vw) * '+n+')');
write('index.html',html);
for(const folder of [pub,root+'/src/lib']){
 fs.writeFileSync(folder+'/campus-personas.mjs',read('characters.mjs'));
 fs.writeFileSync(folder+'/persona-expansion.mjs',read('persona-expansion.mjs'));
 fs.writeFileSync(folder+'/forum-protocol.mjs',read('forum-protocol.mjs').replace("from './characters.mjs'","from './campus-personas.mjs'"));
 fs.writeFileSync(folder+'/vocabulary-protocol.mjs',read('vocabulary-protocol.mjs'));
}
await build({entryPoints:[src+'/vocabulary-ui.mjs'],outfile:pub+'/vocabulary-app.js',bundle:true,format:'iife',platform:'browser',target:['es2022'],minify:true,legalComments:'eof',nodePaths:(process.env.NODE_PATH||'').split(path.delimiter).filter(Boolean)});
const pdfRoot=path.dirname(require.resolve('pdfjs-dist/package.json'));
fs.copyFileSync(pdfRoot+'/build/pdf.mjs',pub+'/vocabulary-pdf.mjs');
fs.copyFileSync(pdfRoot+'/build/pdf.worker.mjs',pub+'/vocabulary-pdf.worker.mjs');
fs.writeFileSync(pub+'/vocabulary-third-party-licenses.txt','PDF.js / Apache-2.0\n'+fs.readFileSync(pdfRoot+'/LICENSE','utf8')+'\n\nfflate / MIT\n'+fs.readFileSync(path.join(path.dirname(require.resolve('fflate/package.json')),'LICENSE'),'utf8'));
await build({entryPoints:[pub+'/api-client.source.js'],outfile:pub+'/api-client.js',bundle:true,format:'iife',platform:'browser',target:['es2022'],minify:true,legalComments:'none'});
const manifest=JSON.parse(fs.readFileSync(pub+'/asset-manifest.json','utf8'));manifest.staticHtmlBytes=Buffer.byteLength(html);fs.writeFileSync(pub+'/asset-manifest.json',JSON.stringify(manifest,null,2));
await import('./check-build.mjs');
console.log(JSON.stringify({htmlBytes:Buffer.byteLength(html),scenes:AuthoredData.scenes.length,forumPosts:AuthoredData.forum.length,build:'2026-10-27-authored-forum'}));
