# 刮刮乐 (Scratch Card)

基于 React + Vite 的小示例。

运行方法：

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

已把原始 `index.html` 备份为 `index.html.bak`，源代码在 `src/` 目录下。

新功能：

- 加权中奖（不同概率的奖项）
- 分享功能（使用 Web Share API 或复制分享链接）
- 下载奖品图片（生成并下载分享图）
- 本地历史记录（保存在 `localStorage` 中）
- 打开带 `?prize=...` 的链接会直接展示对应奖项

体验：在本地运行 `npm run dev` 后，用鼠标或触摸刮开覆盖层，达到 60% 会自动揭晓并弹出结果模态，可以分享或下载结果。

后端（兑奖 API）：

- 为了演示兑奖流程，项目内新增了一个最小的 Express 后端，监听在默认端口 3333，提供接口：
  - POST `/api/redeem`，请求体 `{ prize }`，返回 `{ ok: true, code, record }`
  - GET `/api/redeem/:code` 查询兑奖状态
  - POST `/api/redeem/:code/use` 标记已使用

运行后端：

```bash
# 在项目根目录运行
npm run server
```

## GitHub Actions 自动部署到 gh-pages（CI 构建，免本地 npm）

如果你希望在不在本地安装 npm 的情况下自动部署到 GitHub Pages，可以使用仓库内的 GitHub Actions 工作流 `.github/workflows/deploy.yml`。它会在 push 到 `main` 或手动触发时：

- 如果仓库有 `package.json`，它会运行 `npm ci` 并执行 `npm run build --if-present`（常见的 Vite 构建输出目录为 `dist`）。
- 自动检测并发布目录：`dist`（优先）或 `docs`；如果两者都不存在且仓库根目录有 `index.html`，则会发布根目录。

使用方法：
1. 确保构建产物位于 `dist/`（或把静态文件放到 `docs/`），或者仓库根目录包含可直接访问的 `index.html`。
2. Push 到 `main` 分支，或在仓库页面的 Actions → 选择 `Deploy to GitHub Pages` 手动触发。

部署目标分支为 `gh-pages`（由工作流自动推送），你可以在 GitHub 仓库设置 → Pages 中将 Source 设置为 `gh-pages` 分支，或者等待 Pages 自动生效。

备注：该工作流让你本地无需安装 npm，所有构建都在 GitHub Actions 上执行。

前端会在揭晓后提供「申请兑奖」按钮，创建兑换码并保存到本地历史，演示完整流程。
