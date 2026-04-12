# Fileyard

基于 React + Vite + Hono + Cloudflare Workers 的文件分享应用。前端和 API 同域部署在 Cloudflare Workers，文件存储使用 R2，用户与会话状态使用 Durable Objects。

## 当前发布定位

当前版本可以作为生产预发布或私有 beta 使用，但**不建议直接面向公开互联网大规模开放**。

原因：

- 文件列表、目录统计、整目录删除仍依赖 R2 全量扫描。
- 目录规模变大后，Worker 时延、内存占用和请求成本都会明显上升。
- 如果要做公开生产发布，应补充独立的文件元数据索引层，并把列表、统计、排序、删除改为分页和增量处理。

如果你的目标是小范围团队内测或受控用户群，这个版本已经具备更完整的安全收尾能力，包括安全 cookie、认证限流、统一安全头、邮件失败闭环和更合理的下载路径。

## 本地开发

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

默认前端地址：

```text
http://localhost:5173
```

默认测试账号：

```text
test1@tingyuan.in
test1@tingyuan.inA
```

## 常用命令

```bash
npm run dev        # 本地开发
npm run build      # TypeScript + Vite 构建
npm run preview    # 本地预览生产构建
npm run test       # 运行 Vitest
npm run lint       # oxlint + oxfmt
npm run cf-typegen # 依据 wrangler 配置生成 Cloudflare 类型
npm run check      # 类型、构建、dry-run 部署全检查
npm run deploy     # 发布到 Cloudflare
```

## Cloudflare 资源准备

生产环境至少需要以下资源：

- 1 个 Worker
- 1 个 R2 Bucket，用于存储上传文件
- 2 个 Durable Object class
- 1 个自定义域名
- 1 个 Resend 发信账号

当前 `wrangler.jsonc` 中已经声明了以下绑定：

- `FILES_BUCKET`
- `USER_DO`
- `RATE_LIMITER`
- `ASSETS`

如果你的 R2 bucket 名称不是 `fileyard`，需要先修改 [wrangler.jsonc](/D:/lovetingyuan/files-share/wrangler.jsonc) 和 [wrangler.json](/D:/lovetingyuan/files-share/wrangler.json) 中的 bucket 配置。

## 环境变量与 Secrets

`.dev.vars.example` 给出了本地开发示例。生产环境需要区分两类配置：

### 1. Wrangler vars

这些配置已在 [wrangler.jsonc](/D:/lovetingyuan/files-share/wrangler.jsonc) 中声明，部署前必须改成真实值：

- `APP_URL`
  - 生产站点的完整外部访问地址，例如 `https://files.example.com`
- `MAX_UPLOAD_BYTES`
  - 单文件上传大小上限，默认 `104857600`，即 100 MB
- `SENDER_EMAIL`
  - Resend 已验证的发件人，例如 `Fileyard <noreply@example.com>`

### 2. Wrangler secrets

部署前必须设置：

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put SHARE_LINK_SECRET
```

含义：

- `RESEND_API_KEY`
  - 用于发送注册验证邮件
- `SHARE_LINK_SECRET`
  - 用于签发分享链接相关令牌，必须使用高强度随机值

## 首次部署步骤

### 1. 修改 Wrangler 配置

检查并更新：

- [wrangler.jsonc](/D:/lovetingyuan/files-share/wrangler.jsonc)
- [wrangler.json](/D:/lovetingyuan/files-share/wrangler.json)

重点确认：

- Worker 名称
- `APP_URL`
- `SENDER_EMAIL`
- `MAX_UPLOAD_BYTES`
- `FILES_BUCKET.bucket_name`
- 自定义域名策略

### 2. 创建 R2 bucket

如果目标 bucket 尚未创建：

```bash
npx wrangler r2 bucket create fileyard
```

如果你要使用别的 bucket 名称，先改配置再创建。

### 3. 配置 secrets

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put SHARE_LINK_SECRET
```

### 4. 生成 Cloudflare 类型

```bash
npm run cf-typegen
```

### 5. 执行发布前检查

```bash
npm run test
npm run check
```

`npm run check` 会执行：

- `wrangler types`
- TypeScript 检查
- Vite 生产构建
- `wrangler deploy --dry-run`

### 6. 正式部署

```bash
npm run deploy
```

## 自定义域名

这个项目默认按“单域名部署”设计，前端静态资源和 API 走同一个 Worker 域名。这样可以避免额外的跨域复杂度，也能确保认证 cookie、CSRF 和下载链接行为更稳定。

生产部署时请确保：

- `APP_URL` 与实际对外域名完全一致
- Cloudflare 路由和自定义域名已绑定到当前 Worker
- 登录、注册、分享下载都通过 HTTPS 访问

认证 cookie 会依据实际请求协议设置 `Secure`，因此如果自定义域名没有正确启用 HTTPS，登录会话将无法按预期工作。

## 发布后检查

完成部署后，至少手动验证以下流程：

- 注册新账号并确认能收到验证邮件
- 验证邮件链接能正确完成激活
- 登录后 cookie 为 `HttpOnly`、`SameSite=Lax`、HTTPS 下带 `Secure`
- 上传文件、创建分享链接、打开分享页、直接下载文件
- 分享下载为浏览器原生下载，不再先整文件拉入内存
- 登录、注册、重发验证、分享创建都存在限流保护
- 首页、登录页、注册页、分享页响应头包含安全头

## 运行与排障

查看线上日志：

```bash
npx wrangler tail
```

如果你有多个环境，建议显式指定环境或 Worker 名称后再 tail。

常见排查点：

- 收不到邮件：检查 `RESEND_API_KEY`、`SENDER_EMAIL` 和域名验证状态
- 登录失败：检查 `APP_URL`、HTTPS、自定义域名以及浏览器 cookie 策略
- 上传失败：检查 `MAX_UPLOAD_BYTES`、R2 bucket 绑定和对象权限
- 限流误杀：检查 `CF-Connecting-IP`、反向代理链路和请求重试行为

## 回滚建议

本项目建议通过 Cloudflare 的 Worker 版本能力回滚到上一个已知稳定版本。发布前至少保留最近一个可回退版本，并记录对应变更说明。

回滚前建议先做两件事：

- 用 `npx wrangler tail` 确认线上错误是否由当前版本引入
- 确认没有未兼容的数据结构变更需要同步处理

如果本次上线涉及：

- Durable Object 行为变更
- 分享令牌规则变更
- 邮件模板或域名变更

回滚时要一并检查这些依赖项是否仍然兼容。

## 安全与发布收尾

这一版已经补上的生产基础项包括：

- 认证链路限流
- 验证邮件发送失败闭环
- HTTPS 下强制安全 cookie
- 统一安全响应头
- 分享页直接下载，避免浏览器整文件 blob 缓存
- 登录/注册表单与工具栏的可访问性修正

仍然建议在正式公开发布前继续补齐：

- 文件元数据索引
- 分页化文件列表
- 大目录统计异步化
- 目录删除任务化或批处理化
- 更完整的操作审计和告警

## 目录结构

```text
src/
├── react-app/   # React 前端
└── worker/      # Cloudflare Worker API 与静态资源入口
```

## 参考文档

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Resend](https://resend.com/docs)
