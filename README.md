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

前端会在揭晓后提供「申请兑奖」按钮，创建兑换码并保存到本地历史，演示完整流程。
