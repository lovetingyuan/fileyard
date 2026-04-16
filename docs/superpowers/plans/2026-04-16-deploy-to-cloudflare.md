# Fileyard 部署到 Cloudflare 傻瓜式计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Fileyard 应用完整部署到 Cloudflare，包括 D1 数据库、R2 存储桶、KV 命名空间、Durable Objects 和所有必要的 Secrets。

**Architecture:** 前端 React 静态资源通过 Cloudflare Workers Static Assets 托管，后端 Hono Worker 处理 API 请求，数据层使用 D1（SQLite）存储用户/认证数据，R2 存储用户上传的文件，KV 用于缓存，Durable Objects 实现速率限制。

**Tech Stack:** Cloudflare Workers, D1, R2, KV, Durable Objects, Wrangler CLI, Drizzle ORM, Better Auth, Resend (邮件), Google OAuth

---

## 前置条件

- 已安装 Node.js 和 npm
- 已安装 wrangler（项目 devDependency 中已包含，用 `npx wrangler` 调用）
- 拥有 Cloudflare 账号
- 拥有 Google Cloud Console 项目（用于 OAuth）
- 拥有 Resend 账号（用于发送邮件）

---

## Task 1: 登录 Cloudflare 账号

**Files:**
- 无文件修改，纯命令操作

- [ ] **Step 1: 执行登录命令**

```bash
npx wrangler login
```

浏览器会自动打开 Cloudflare 授权页面，点击"Allow"授权。

- [ ] **Step 2: 验证登录成功**

```bash
npx wrangler whoami
```

预期输出：显示你的 Cloudflare 账号邮箱和账号 ID，例如：
```
 ⛅️ wrangler 4.x.x
You are logged in with an OAuth Token, associated with the email 'your@email.com'!
```

---

## Task 2: 创建 D1 数据库

**Files:**
- Modify: `wrangler.jsonc`（更新 database_id）

- [ ] **Step 1: 创建 D1 数据库**

```bash
npx wrangler d1 create fileyard-db
```

预期输出类似：
```
✅ Successfully created DB 'fileyard-db' in region APAC
Created your new D1 database.

[[d1_databases]]
binding = "AUTH_DB"
database_name = "fileyard-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

- [ ] **Step 2: 将输出的 database_id 更新到 wrangler.jsonc**

找到 `wrangler.jsonc` 中的 `d1_databases` 部分，将 `database_id` 替换为上一步输出的真实 ID：

```jsonc
"d1_databases": [
  {
    "binding": "AUTH_DB",
    "database_name": "fileyard-db",
    "database_id": "你刚才得到的真实ID",
    "migrations_dir": "./drizzle",
  },
],
```

> **注意：** 如果 `database_id` 已经是 `79ade83d-d79b-4270-98de-ba887af6b405`，说明数据库已存在，跳过创建，直接进入下一步。

- [ ] **Step 3: 执行数据库迁移（应用到远程）**

```bash
npx wrangler d1 migrations apply fileyard-db --remote
```

预期输出：
```
✅ Applied 2 migrations to fileyard-db (remote)
```

- [ ] **Step 4: 验证表已创建**

```bash
npx wrangler d1 execute fileyard-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

预期输出包含：`user`, `session`, `account`, `verification`, `app_user_profile`, `rate_limit`

---

## Task 3: 创建 R2 存储桶

**Files:**
- 无文件修改

- [ ] **Step 1: 创建 R2 存储桶**

```bash
npx wrangler r2 bucket create fileyard
```

预期输出：
```
✅ Created bucket 'fileyard' with default storage class of Standard.
```

> **注意：** 如果提示桶已存在，跳过此步。

- [ ] **Step 2: 验证存储桶已创建**

```bash
npx wrangler r2 bucket list
```

预期输出中包含 `fileyard`。

---

## Task 4: 创建 KV 命名空间

**Files:**
- Modify: `wrangler.jsonc`（更新 KV id）

- [ ] **Step 1: 创建 KV 命名空间**

```bash
npx wrangler kv namespace create FILE_YARD_KV
```

预期输出类似：
```
✅ Successfully created KV namespace with ID 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
Add the following to your configuration file in your kv_namespaces array:
{ binding = "FILE_YARD_KV", id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

- [ ] **Step 2: 将输出的 id 更新到 wrangler.jsonc**

找到 `wrangler.jsonc` 中的 `kv_namespaces` 部分，将 `id` 替换为上一步输出的真实 ID：

```jsonc
"kv_namespaces": [
  {
    "binding": "FILE_YARD_KV",
    "id": "你刚才得到的真实KV ID",
    "remote": true,
  },
],
```

> **注意：** 如果 `id` 已经是 `d27e0ee9d2574d0a9929024ffd5118a3`，说明 KV 已存在，跳过创建。

---

## Task 5: 配置 Google OAuth

**Files:**
- 无文件修改，在 Google Cloud Console 操作

- [ ] **Step 1: 打开 Google Cloud Console**

访问 https://console.cloud.google.com/

- [ ] **Step 2: 创建或选择项目**

在顶部项目选择器中，创建新项目或选择已有项目。

- [ ] **Step 3: 启用 Google+ API**

导航到"APIs & Services" → "Library"，搜索并启用 "Google+ API" 或 "Google Identity"。

- [ ] **Step 4: 创建 OAuth 2.0 凭据**

导航到"APIs & Services" → "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"

- Application type: **Web application**
- Name: `Fileyard`
- Authorized redirect URIs 添加：
  - `https://你的worker域名/api/auth/callback/google`
  - （本地测试）`http://localhost:5173/api/auth/callback/google`

> Worker 域名格式通常是 `fileyard.你的账号名.workers.dev`，可以先填写后再回来更新。

- [ ] **Step 5: 记录凭据**

创建后会显示：
- Client ID（形如 `xxxx.apps.googleusercontent.com`）
- Client Secret

将这两个值保存好，下一步会用到。

---

## Task 6: 获取 Resend API Key

**Files:**
- 无文件修改

- [ ] **Step 1: 注册/登录 Resend**

访问 https://resend.com，注册或登录账号。

- [ ] **Step 2: 创建 API Key**

进入 Dashboard → "API Keys" → "Create API Key"

权限选择 "Sending access"，记录生成的 API Key（形如 `re_xxxxxxxxxx`）。

- [ ] **Step 3: 验证发件域名（可选但推荐）**

如果 `wrangler.jsonc` 中 `SENDER_EMAIL` 使用了自定义域名（如 `fileyard@tingyuan.in`），需要在 Resend 中验证该域名。

进入 "Domains" → "Add Domain"，按照指引添加 DNS 记录。

---

## Task 7: 配置所有 Secrets

**Files:**
- 无文件修改，通过 wrangler 命令设置

所有 secrets 必须逐一设置。每条命令执行后会提示你输入值（不会显示在终端）。

- [ ] **Step 1: 设置 BETTER_AUTH_SECRET**

```bash
npx wrangler secret put BETTER_AUTH_SECRET
```

输入一个随机的强密钥（至少 32 位随机字符串）。可以用以下命令生成：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- [ ] **Step 2: 设置 GOOGLE_CLIENT_ID**

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
```

输入 Task 5 中获取的 Google Client ID。

- [ ] **Step 3: 设置 GOOGLE_CLIENT_SECRET**

```bash
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

输入 Task 5 中获取的 Google Client Secret。

- [ ] **Step 4: 设置 RESEND_API_KEY**

```bash
npx wrangler secret put RESEND_API_KEY
```

输入 Task 6 中获取的 Resend API Key。

- [ ] **Step 5: 设置 SHARE_LINK_SECRET**

```bash
npx wrangler secret put SHARE_LINK_SECRET
```

输入另一个随机强密钥（同样可用 crypto.randomBytes 生成）。

- [ ] **Step 6: 验证所有 secrets 已设置**

```bash
npx wrangler secret list
```

预期输出包含所有 5 个 secret 名称：
```
BETTER_AUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
RESEND_API_KEY
SHARE_LINK_SECRET
```

---

## Task 8: 配置 APP_URL（可选）

**Files:**
- Modify: `wrangler.jsonc`

- [ ] **Step 1: 确认 Worker 域名**

首次部署后，Worker 域名格式为 `fileyard.<你的CF账号子域>.workers.dev`。

如果你有自定义域名，也可以在 Cloudflare Dashboard 中绑定。

- [ ] **Step 2: 更新 wrangler.jsonc 中的 APP_URL（如需固定域名）**

如果你希望 auth 回调和分享链接使用固定域名，更新：

```jsonc
"vars": {
  "APP_URL": "https://fileyard.你的账号名.workers.dev",
  "MAX_UPLOAD_BYTES": "104857600",
  "SENDER_EMAIL": "Fileyard <fileyard@tingyuan.in>",
},
```

> 如果留空，系统会自动使用请求的 origin，通常不需要修改。

---

## Task 9: 构建并部署

**Files:**
- 无文件修改

- [ ] **Step 1: 安装依赖（如未安装）**

```bash
npm install
```

- [ ] **Step 2: 执行完整检查（可选，推荐）**

```bash
npm run check
```

预期：TypeScript 编译通过，Vite 构建成功，wrangler dry-run 无报错。

如果有报错，根据错误信息修复后再继续。

- [ ] **Step 3: 构建项目**

```bash
npm run build
```

预期输出：
```
✓ built in Xs
```
并在 `dist/client/` 目录生成静态资源。

- [ ] **Step 4: 部署到 Cloudflare**

```bash
npm run deploy
```

等价于 `npx wrangler deploy`。

预期输出：
```
✅ Uploaded fileyard (Xs)
✅ Deployed fileyard triggers (Xs)
  https://fileyard.你的账号名.workers.dev
```

记录输出的 Worker URL。

---

## Task 10: 验证部署

**Files:**
- 无文件修改

- [ ] **Step 1: 访问应用**

打开浏览器，访问 Task 9 输出的 Worker URL（如 `https://fileyard.xxx.workers.dev`）。

预期：看到 Fileyard 登录页面。

- [ ] **Step 2: 测试邮箱注册**

使用一个真实邮箱注册账号，检查是否收到验证邮件。

- [ ] **Step 3: 测试 Google 登录**

点击 Google 登录按钮，完成 OAuth 流程。

> 如果 Google 登录报错，检查 Task 5 中配置的 Authorized redirect URIs 是否包含正确的 Worker URL。

- [ ] **Step 4: 测试文件上传**

登录后，尝试上传一个小文件，验证 R2 存储正常工作。

- [ ] **Step 5: 检查 Worker 日志（如有问题）**

```bash
npx wrangler tail
```

实时查看 Worker 日志，帮助排查问题。

---

## 常见问题排查

| 问题 | 可能原因 | 解决方法 |
|------|---------|---------|
| 部署报错 "Missing binding" | wrangler.jsonc 中资源 ID 未更新 | 检查 D1 database_id 和 KV id 是否正确 |
| Google 登录失败 | redirect URI 不匹配 | 在 Google Console 添加正确的 Worker URL |
| 邮件发送失败 | RESEND_API_KEY 错误或域名未验证 | 检查 Resend Dashboard |
| 文件上传失败 | R2 桶不存在或名称不匹配 | 确认 R2 桶名为 `fileyard` |
| 数据库错误 | 迁移未执行 | 重新运行 `wrangler d1 migrations apply fileyard-db --remote` |
| Secret 未找到 | Secret 未设置 | 运行 `wrangler secret list` 检查 |

---

## 部署完成后的可选配置

- **自定义域名：** 在 Cloudflare Dashboard → Workers & Pages → fileyard → Settings → Domains & Routes 中绑定自定义域名
- **更新 Google OAuth redirect URI：** 绑定自定义域名后，在 Google Console 添加新域名的 redirect URI
- **更新 APP_URL：** 如使用自定义域名，更新 `wrangler.jsonc` 中的 `APP_URL` 并重新部署
