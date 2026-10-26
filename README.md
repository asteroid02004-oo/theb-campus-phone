# 得比高中 · 校园手机

这是可直接从 GitHub 部署到 Render 的前后端一体版，包含 Gemini 自动聊天。游戏页面与图片已预先构建，全部部署文件都在根目录，没有 npm 第三方依赖。

## 部署

Render Web Service 选择本仓库，Language 为 Node，Build Command 为 `npm run build`，Start Command 为 `npm start`，Root Directory 留空，Compute 选择 Free。

服务器环境变量：

| 名称 | 值 |
| --- | --- |
| NODE_VERSION | 24 |
| NODE_ENV | production |
| GEMINI_API_KEY | 自己的 Gemini 密钥，仅填在 Render 环境变量 |
| FREE_TIER_CONFIRMED | 确认免费项目后填 true |
| SESSION_SECRET | 至少 32 字节随机字符串 |
| GEMINI_MODEL | gemini-3.5-flash-lite |
| MAX_DAILY_REQUESTS | 10000 |

也可以使用 render.yaml 创建 Blueprint，会自动生成 SESSION_SECRET，并提示填写模型密钥。

config.js 的 apiBaseUrl 保持空字符串。部署成功后直接打开 Render 提供的网址，进入游戏发送一条真实消息验收。

## 数据与额度

五位男主人设、独立记忆、固定选项剧情及玩法均保留。进度保存在玩家浏览器中，换网址前需先导出存档，再在新网址导入。服务器 SQLite 只存限流计数。Render 免费服务休眠、重启后计数可能重置，浏览器存档不受影响。Google 项目额度独立于本站每日上限。

真实密钥不包含在代码中，只能配置在服务器环境变量。程序直接请求 Google Gemini，不依赖原站聊天接口。免费项目确认开关无法替 Google 关闭项目计费。

Render 免费服务闲置后会休眠，再次访问可能需要约一分钟启动。GitHub Pages 单独托管本页面无法运行聊天后端。

本地完整可编辑源码保留在原交付的“得比高中-GitHub部署包”中；这个仓库是便于网页上传的运行版。后续修改玩法后，需从完整源码重新构建并更新 index.html。

官方文档：[Render Web Services](https://render.com/docs/web-services)、[免费服务限制](https://render.com/docs/free)、[Gemini 模型](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)。

## 玩家密钥和角色更新

首次进入可先填写自己的 Gemini 密钥，或跳过使用站长默认连接；已有玩家可在“设置与存档 → 聊天连接”中更换密钥或切回默认。个人密钥仅保存在当前浏览器，不写入游戏存档或导出文件。聊天时本站服务器转发给 Google，消耗自己的配额；费用取决于自己的项目。个人连接失败时不会自动使用站长密钥；可在设置中手动切换。

五位男主已加入最新版外貌、衣着、性格层次、说话方式和情绪反应，保留原有年级、宠物、社团与共同经历。后端角色数据包含 campus-personas.mjs 与 persona-expansion.mjs 两个文件，部署时都需要上传。
