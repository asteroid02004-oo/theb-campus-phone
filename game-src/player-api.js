const playerApiPreferences=window.CampusApiPreferences;
const initializeApiBeforePlayerChoice=initializeApi;
let playerApiInitialization=null;
initializeApi=function(){if(!playerApiInitialization)playerApiInitialization=initializeApiBeforePlayerChoice().finally(()=>{playerApiInitialization=null});return playerApiInitialization};
const apiProviderNames={gemini:'Gemini',deepseek:'DeepSeek',openai:'OpenAI',custom:'自定义兼容接口'};
function apiConnectionFields(prefix){
 const c=playerApiPreferences.connection(),own=playerApiPreferences.hasPersonalKey();
 return `<label for="${prefix}Provider">服务商</label><select id="${prefix}Provider">${Object.entries(apiProviderNames).map(([id,name])=>`<option value="${id}" ${c.provider===id?'selected':''}>${name}</option>`).join('')}</select><label for="${prefix}Protocol">API 协议</label><select id="${prefix}Protocol">${[['gemini','Gemini 原生'],['chat-completions','OpenAI Chat Completions 兼容'],['responses','OpenAI Responses']].map(([id,name])=>`<option value="${id}" ${c.protocol===id?'selected':''}>${name}</option>`).join('')}</select><label for="${prefix}Model">模型名称</label><input id="${prefix}Model" required maxlength="160" value="${escapeHTML(c.model)}" placeholder="填写服务商提供的模型 ID" autocomplete="off" autocapitalize="none" spellcheck="false"><label for="${prefix}Base">API 接口地址</label><input id="${prefix}Base" type="url" required value="${escapeHTML(c.baseUrl)}" placeholder="https://服务商域名/v1" autocomplete="off" autocapitalize="none" spellcheck="false"><label for="${prefix}Key">${own?'替换个人密钥':'个人 API 密钥'}</label><input id="${prefix}Key" type="password" maxlength="2048" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${own?'已保存密钥；同服务商同域名下可留空复用':'粘贴所选服务商的密钥'}"><small>消息和密钥由浏览器直接发送到上面填写的接口。密钥只保存在当前浏览器，不进入导出存档。费用与额度以服务商账户为准。</small><details><summary>高级设置</summary><label for="${prefix}Tokens">单次回复 token 上限</label><input id="${prefix}Tokens" type="number" min="128" max="8192" step="1" value="${c.maxOutputTokens||2200}"><small>部分推理模型需要更高上限。提高上限可能增加实际用量。更换服务商或接口域名时，请重新填写对应密钥。</small></details>`;
}
function bindApiConnectionFields(prefix){
 $('#'+prefix+'Provider').onchange=e=>{const c=playerApiPreferences.preset(e.target.value);$('#'+prefix+'Protocol').value=c.protocol;$('#'+prefix+'Model').value=c.model;$('#'+prefix+'Base').value=c.baseUrl;$('#'+prefix+'Tokens').value=c.maxOutputTokens;$('#'+prefix+'Key').value=''};
}
function saveApiConnection(prefix){return playerApiPreferences.usePersonal($('#'+prefix+'Key').value,{provider:$('#'+prefix+'Provider').value,protocol:$('#'+prefix+'Protocol').value,model:$('#'+prefix+'Model').value,baseUrl:$('#'+prefix+'Base').value,maxOutputTokens:Number($('#'+prefix+'Tokens').value)})}
function resumeCampusEntry(){if(!game.player)onboarding();else if(!game.school.configured)onboarding(2);else if(game.needsFirstUnlock)lockPhone();else unlockCampus()}
function startCampusWithApiSetup(){if(!game.player&&!playerApiPreferences.chosen()){showInitialApiSetup();return}if(game.player&&!playerApiPreferences.chosen())playerApiPreferences.useDefault();resumeCampusEntry()}
function showInitialApiSetup(){
 document.querySelector('.onboard')?.remove();locked=false;$('#lock').hidden=true;$('#lock').inert=true;$('#homeButton').inert=true;$('#lockToggle').disabled=true;$('#home').inert=true;app.inert=true;
 const el=document.createElement('section');el.className='onboard admission api-admission';el.setAttribute('role','dialog');el.setAttribute('aria-label','聊天连接设置');screen.append(el);
 el.innerHTML=`<img class="admission-crest" src="${window.CAMPUS_CREST}" alt="得比高中校徽"><div class="eyebrow">CHAT / CONNECTION</div><h1>先选择<br>聊天连接。</h1><p class="lead">支持 Gemini、DeepSeek、OpenAI 和自定义兼容接口。填写个人连接，或跳过使用站长提供的默认连接。</p><button class="campus-secondary" type="button" id="skipPersonalApi">跳过，使用默认连接</button><p class="campus-muted" id="initialSharedStatus">正在检查默认连接…</p><form class="campus-form" id="initialApiForm">${apiConnectionFields('initialApi')}<button class="campus-primary">保存个人连接并继续</button></form><p class="api-form-error" id="initialApiError" role="alert"></p><p class="campus-muted">之后可在“设置与存档”中修改服务商、模型、接口与密钥。</p>`;
 bindApiConnectionFields('initialApi');
 initializeApi().then(()=>{const hint=$('#initialSharedStatus');if(hint&&el.isConnected)hint.textContent=apiState.configured?'站长默认连接可用。':'默认连接暂未就绪；可先进入游戏体验固定剧情，或填写个人连接。'});
 const next=async()=>{await initializeApi();el.remove();app.inert=false;$('#homeButton').inert=false;$('#lockToggle').disabled=false;resumeCampusEntry()};
 $('#initialApiForm').onsubmit=async e=>{e.preventDefault();try{saveApiConnection('initialApi');$('#initialApiKey').value='';await next()}catch(error){$('#initialApiError').textContent=error.message}};
 $('#skipPersonalApi').onclick=async()=>{playerApiPreferences.useDefault();await next()};
}
const settingsBeforePersonalApi=renderCampusSettings;
renderCampusSettings=function(){
 settingsBeforePersonalApi();const card=$('#apiStatusText')?.closest('.campus-card');if(!card)return;
 const own=playerApiPreferences.hasPersonalKey(),c=playerApiPreferences.connection(),defaultReady=!!apiState.configured&&!own;
 const status=apiState.error|| (own?'个人连接：'+apiProviderNames[c.provider]+' · '+c.model:defaultReady?'当前使用：站长默认连接':'共享连接暂未配置；可先使用个人连接');
 card.innerHTML=`<span class="eyebrow">CHAT CONNECTION</span><h3>聊天连接</h3><p id="apiStatusText">${escapeHTML(status)}</p><p class="campus-muted">个人连接直接访问你填写的服务商，不消耗站长共享额度。暂不使用 AI 也能继续课程和固定剧情。</p><form class="campus-form" id="personalApiForm">${apiConnectionFields('personalApi')}<button class="campus-primary">保存并使用个人连接</button><button type="button" class="campus-secondary" id="useDefaultCampusApi">${apiState.backendAvailable?'使用站长默认连接':'清除个人密钥，暂不使用 AI'}</button></form><p class="api-form-error" id="personalApiError" role="alert"></p><button class="campus-secondary" id="checkCampusApi">检查连接配置</button><small class="campus-muted">配置检查不消耗模型额度，实际能否回复请在聊天中验证。${!playerApiPreferences.persistent()?' 浏览器未允许保存，目前只在本次页面临时生效。':''}</small>`;
 bindApiConnectionFields('personalApi');
 const available=()=>{if(sending.size){toast('请等当前回复完成再更改连接。');return false}return true};
 $('#personalApiForm').onsubmit=async e=>{e.preventDefault();if(!available())return;try{const result=saveApiConnection('personalApi');$('#personalApiKey').value='';await initializeApi();renderCampusSettings();toast(result.persistent?'个人连接已保存。':'本次页面已使用个人连接，浏览器暂未允许保存。')}catch(error){$('#personalApiError').textContent=error.message}};
 $('#useDefaultCampusApi').onclick=async()=>{if(!available())return;playerApiPreferences.useDefault();await initializeApi();renderCampusSettings();toast('已清除个人密钥。共享连接可用时会使用共享连接。')};
 $('#checkCampusApi').onclick=async e=>{e.target.disabled=true;await initializeApi();renderCampusSettings()};
};
