# 得比高中 · GitHub → Cloudflare Workers

完整网页、原图片与共享聊天接口部署到同一个 Cloudflare Worker。连接 GitHub 后，推送到生产分支即可自动构建并更新。

## 保留的功能

手机界面、密码230108、角色人设、课程与排名、社团、约会、打工、定向资助与商城、固定回复、主动消息、校园活动、考试、结局、重开及导入导出存档均保留。

玩家初始可填写个人连接，也可跳过。设置中可更改服务商、模型 ID、API 地址、协议和个人密钥。支持 Gemini 原生、OpenAI Chat Completions 兼容及 OpenAI Responses；预设 Gemini、DeepSeek、OpenAI 与自定义兼容接口。服务商必须允许浏览器跨域直连。个人连接直接访问玩家选定的服务商，失败时不会自动使用站长密钥。

玩家密钥只保存在当前浏览器，不进入导出存档或 GitHub。站长默认 Gemini 密钥只保存在 Cloudflare Secret；共享连接未配置时仍可使用个人连接和固定剧情。模型服务的额度与费用由对应账户决定，托管免费不代表 AI 无限免费。

## 在 Cloudflare 连接 GitHub

1. 登录 Cloudflare，进入 Workers & Pages → Create application → GitHub，选择仓库 `asteroid02004-oo/theb-campus-phone`。
2. 生产分支使用 `main`，根目录留空或 `/`；Worker 名称为 `thebhighschool`，与 wrangler.jsonc 一致。
3. Build command 填 `npm run build`，Deploy command 填 `npx wrangler deploy`。选择 Workers Free，无需为了此项目升级付费方案。
4. 保存并部署。Wrangler 会自动创建并绑定 D1，代码会以幂等方式初始化限流表，后续部署复用绑定。
5. 当前公开网址：https://thebhighschool.asteroid02004.workers.dev/ 。网页已验证可访问；默认共享聊天是否就绪以 `/api/status` 和实际回复为准。

仅需个人连接时，完成上面步骤即可。要启用站长默认共享连接，在 Worker → Settings → Variables and Secrets 添加以下 Secret，然后重新部署：

| 名称 | 类型 | 值 |
| --- | --- | --- |
| GEMINI_API_KEY | Secret | 站长实际可用的 Gemini API 密钥 |
| SESSION_SECRET | Secret | 至少32字节随机值，用于签名会话 |

不要把 Secret 填入 Build variables、public/config.js、wrangler.jsonc 或公开仓库。默认共享模型由 `GEMINI_MODEL` 配置，当前为 `gemini-3.5-flash-lite`；保留免费项目确认、每日10000次应用上限和每IP每分钟12次限制。实际上限还受模型服务商和 Cloudflare 额度约束。

## 验证

- 首页能展示初始连接设置、校徽与手机游戏，原图按哈希缓存。
- `/healthz` 返回 deployment 为 `github-workers`。
- 共享 Secret 与 D1 就绪后，`/api/status` 的 configured 与 backendReady 均应为 true；status 不会返回任何密钥。
- 分别用个人连接和默认共享连接发送一条真实消息验证。缺少有效个人密钥或共享配额时，不能仅凭配置检查声称聊天已验证。
- `npm run build` 检查页面脚本、图片、同源API配置；`npm test` 检查路由、签名会话、D1初始化、直连与失败隔离；`npm run deploy:check` 检查实际 Worker 打包。

## 原进度与更新

存档格式未改。但不同域名的浏览器存储相互独立，旧 Render 或 GitHub Pages 进度需导出后在新站“设置与存档”中导入。个人连接在新域名单独填写。

`game-src` 是当前手机与校园前端源代码，`game-src/authored-data.mjs` 保存作者修改后的剧情、共用动漫社剧情、校园祭及论坛文案。运行 `npm run build` 会重新生成 `public/index.html` 并打包聊天客户端。`public` 是可发布资源；`src` 是服务端接口；`editable` 保留迁移前的连接设置源码备份，当前修改请使用 `game-src`。GitHub 不应提交 node_modules、.dev.vars、.env 或 .wrangler。

论坛支持自由发帖、评论和楼中楼。同学及男主根据当前帖子和玩家实际回复接话，复用已选择的个人服务商或站长默认连接。固定帖按照校历、社团经历、关系和对应校园祭活动出现。男主论坛账号固定为 leejaehyunow、tbzuyeon、__qfeed__、_0hoony、sunwoo。同学使用英文风格账号。

动漫社共用三段剧情；第三段要求金泳勋或金善旴至少一人的好感严格高于70，进入随机池后以35%概率出现。前两段优先体验，每轮第三段只作为新剧情触发一次，回看不重复结算奖励。金善旴的数学设定已补充为数学差、自称初二就放弃数学。

自由聊天失败后只自动重试一次，再失败就撤回该条消息并把文字留在输入框，恢复正常输入。发送上下文固定截到本条玩家消息，避免后来收到的固定收尾导致消息格式错误。旧存档中未送达的消息也会恢复为草稿。论坛生成失败不阻塞玩家继续发帖或评论。

Cloudflare 的 Git 集成与静态资源规则见[官方构建说明](https://developers.cloudflare.com/workers/ci-cd/builds/)及[静态资源配置](https://developers.cloudflare.com/workers/static-assets/binding/)。Workers 与 D1 仍有[免费额度限制](https://developers.cloudflare.com/workers/platform/limits/)，不是无限请求。共享聊天与存档互相独立，服务端不保存玩家剧情。
