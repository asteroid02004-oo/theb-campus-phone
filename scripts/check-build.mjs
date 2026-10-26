import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),publicDir=new URL('public/',root);
const read=file=>fs.readFileSync(new URL(file,publicDir),'utf8');
const html=read('index.html');
if(!html.includes('DeepSeek')||!html.includes('OpenAI')||!html.includes('自定义兼容接口'))throw Error('Missing provider UI');
if(html.includes('data:image/'))throw Error('Images must be separate cached assets');
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1].trim())new vm.Script(match[1]);
new vm.Script(read('api-client.js'));
const config=read('config.js');
if(!config.includes('apiBaseUrl:window.location.origin'))throw Error('Shared API must use the Worker origin');
const manifest=JSON.parse(read('asset-manifest.json'));
for(const [name,expected]of Object.entries(manifest.assets)){
 const actual=crypto.createHash('sha256').update(fs.readFileSync(new URL(name,publicDir))).digest('hex');
 if(actual!==expected.sha256)throw Error('Image changed: '+name);
}
for(const folder of ['public','src','editable'])for(const file of fs.readdirSync(new URL(folder+'/',root),{recursive:true,withFileTypes:true})){
 if(!file.isFile()||!/\.(js|mjs|html|json)$/.test(file.name))continue;
 const contents=fs.readFileSync(new URL(file.name,'file:///'+file.parentPath.replaceAll('\\','/')+'/'),'utf8');
 if(contents.includes('AQ.Ab8RN6')||/AIza[\w-]{20,}/.test(contents))throw Error('Possible credential in published sources');
}
console.log('Build verified: multi-provider UI, same-origin API, original images, valid scripts, no embedded credentials.');
