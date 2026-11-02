# 今天也没什么特别的

一段普通的聊天。移动端优先的纯前端互动网页，使用 React + Vite，所有剧情和资源随网站静态发布，无后端、数据库或在线 AI 服务。

这是虚构的非官方互动作品；台词不代表任何真实人物的真实发言。头像为用户提供的图片，不使用官方品牌素材。内容以已确认文档为准，不添加恋爱、排他关系、说教、好感度、章节或结局界面。

## 本地运行

使用 Node.js 22.12 或更新版本（推荐 Node.js 22，见 `.nvmrc`）。

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

开发地址由终端显示。生产构建输出到 `dist/`。浏览器无需访问任何外部接口即可完成聊天。不要直接双击 HTML；请使用开发或预览服务器。

## GitHub 与 Cloudflare Pages

- 仓库：<https://github.com/SiyuanLiu29/my-first-site>
- Pages 项目：`my-first-site-pages`
- 网站：<https://my-first-site-pages.pages.dev>
- 生产分支：`main`
- 框架预设：React (Vite)
- 构建命令：`npm run build`
- 输出目录：`dist`
- 根目录：仓库根目录（留空）
- 构建环境 Node.js：22（至少 22.12）

2026-11-02 已在现有 Pages 项目中确认 GitHub 仓库连接、`main` 自动部署，并将旧模板的 `exit 0` / `public` 配置更新为 `npm run build` / `dist`。

在 Cloudflare 的 Workers & Pages 中打开此 Pages 项目，确认 Git 仓库连接和上述构建设置。推送到生产分支后，Pages 自动构建并发布；其他分支可生成预览部署。确认部署状态为成功后打开网站验证。构建成功与线上发布成功是两个独立步骤。

项目只有一个页面，不使用客户端路径路由，不需要重写规则。资源使用 Vite 的根路径配置，适用于 Pages 根域名，不要设置为 `/my-first-site/`（那是另一种托管路径）。部署后请测试手机、刷新续聊和 `?reset=true`。

原仓库是 Workers 静态模板，其配置备份位于 `docs/original-wrangler.jsonc`。本项目采用用户指定的 Pages Git 自动部署，不需要 Wrangler 或任何 Workers 绑定。旧 `public/index.html` 已由根目录 Vite 入口替代。

建议日常修改先推送功能分支，在 Pages 预览地址确认后合并到 `main`。提交源代码、配置与锁文件；不要提交 `node_modules/`、`dist/`、令牌或本地环境文件。

## 目录

```text
src/
  App.jsx                    聊天布局、候选回复、手动发送、滚动
  engine.js                  纯函数状态机与存档校验
  data/conversation.json     完整剧情图及稳定事件 ID
  hooks/useConversation.js   定时、后台暂停、存档
  styles/chat.css            手机优先与无障碍样式
docs/dialogue-source.txt     已确认原始台词（剧情文本基准）
scripts/import-story.py      从基准文本生成剧情图
tests/engine.test.js         分支、存档、文本一致性测试
```

## 新版剧情与头像

新版包含 Q01–Q09 共 9 组选择、27 个分支。所有用户回复仍须选择后点击发送。Q06A“也有点累”设置唯一条件记忆，结尾前触发“你不是也说累吗”。故事时间为 22:41 和 23:16，最后张函瑞和用户互道晚安。

剧情版本为 2，旧版存档会安全重新开始；新版支持草稿和逐事件恢复。访问 `?reset=true` 可重开。

头像使用用户提供的图片：用户为 IMG_7186.heic（转换为浏览器兼容 PNG），张函瑞为 IMG_7187.JPG。图片通过 CSS 居中显示。

新版剧情源为 `scripts/story-v2.py`，执行 `python3 scripts/story-v2.py` 生成 `src/data/conversation.json`。`docs/dialogue-source.txt` 和旧导入脚本仅为历史版本资料，请勿用于新版生成。

验证：`npm test` 覆盖全部分支、两条条件路径、每个事件的存档恢复、重复发送和明确停顿；`npm run build` 生成静态产物。
