# 得比高中 · GitHub → Cloudflare Workers

完整网页、原图片与共享聊天接口部署到同一个 Cloudflare Worker。连接 GitHub 后，推送到生产分支即可自动构建并更新。

## 保留的功能

手机界面、密码230108、角色人设、课程与排名、社团、约会、打工、定向资助与商城、固定回复、主动消息、校园活动、考试、结局、重开及导入导出存档均保留。

玩家初始可填写个人连接，也可跳过。设置中可更改服务商、模型 ID、API 地址、协议和个人密钥。支持 Gemini 原生、OpenAI Chat Completions 兼容及 OpenAI Responses；预设 Gemini、DeepSeek、OpenAI 与自定义兼容接口。服务商必须允许浏览器跨域直连。个人连接直接访问玩家选定的服务商，失败时不会自动使用站长密钥。

玩家密钥只保存在当前浏览器，不进入导出存档或 GitHub。站长默认 Gemini 密钥只保存在 Cloudflare Secret；共享连接未配置时仍可使用个人连接和固定剧情。模型服务的额度与费用由对应账户决定，托管免费不代表 AI 无限免费。

## 在 Cloudflare 连接 GitHub

1. 登录 Cloudflare，进入 Workers & Pages → Create application → GitHub，选择仓库 `asteroid02004-oo/theb-campus-phone`。
2. 生产分支选择 `cloudflare-workers`，根目录留空；Worker 名称必须为 `theb-campus-phone`，与 wrangler.jsonc 一致。
3. Build command 填 `npm run build`，Deploy command 填 `npx wrangler deploy`。选择 Workers Free，无需为了此项目升级付费方案。
4. 保存并部署。Wrangler 会自动创建并绑定 D1，代码会以幂等方式初始化限流表，后续部署复用绑定。
5. 部署成功后，使用 Cloudflare 实际显示的 `https://theb-campus-phone.<你的子域>.workers.dev/` 网址。不要自行猜测子域。

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

`public` 是可发布的游戏资源；`src` 是服务端接口；`editable` 保存已内联入网页的连接设置源码。修改 editable 后需同步到 public/index.html；修改客户端模块后需重新打包 public/api-client.js。GitHub 不应提交 node_modules、.dev.vars、.env 或 .wrangler。

Cloudflare 的 Git 集成与静态资源规则见[官方构建说明](https://developers.cloudflare.com/workers/ci-cd/builds/)及[静态资源配置](https://developers.cloudflare.com/workers/static-assets/binding/)。Workers 与 D1 仍有[免费额度限制](https://developers.cloudflare.com/workers/platform/limits/)，不是无限请求。共享聊天与存档互相独立，服务端不保存玩家剧情。
