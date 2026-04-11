# Better Auth + D1 认证迁移实施计划

## Summary

将当前基于 `UserDO + 自研 session/cookie + 自研邮箱 token` 的认证体系，整体替换为 `better-auth + Drizzle ORM + Cloudflare D1`。

本次范围只覆盖功能层实现，不做兼容层、不迁移旧数据、不重写测试；认证方式定为：

- 邮箱密码登录
- 邮箱密码注册 + 邮箱验证
- 忘记密码 / 重置密码
- Google 标准 OAuth 登录
- 不做 magic link 免密登录
- Google 与同邮箱现有账号自动关联
- `rootDirId` 从认证模型中剥离，放入独立应用表 `app_user_profile`

## Public / Interface Changes

- `wrangler.jsonc` 新增 D1 绑定 `AUTH_DB`，移除 `USER_DO` 绑定与对应 migration；保留 `RATE_LIMITER`、`FILES_BUCKET`、`ASSETS`。
- 新增环境变量 / secret：
  - `BETTER_AUTH_SECRET`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - 继续使用 `APP_URL`、`RESEND_API_KEY`、`SENDER_EMAIL`
- 认证路由统一挂到 `/api/auth/*`，由 Better Auth handler 接管；删除现有自定义 `/api/auth/register|login|logout|verify|forgot-password|reset-password|me` 实现。
- 重置密码前端路由改为 `/reset-password?token=...`；不再使用 `/reset-password/:token`。
- 邮箱验证不再走前端 `verify/:token` 页面消费 token，而是由 Better Auth 自动验证后跳转到 `/login?verified=1`。
- 业务 API `/api/profile`、`/api/files*`、`/api/share-links*` 对前端保持现有响应结构不变。

## Implementation Changes

### 1. 基础设施与数据层

- 安装并配置 `better-auth`、`drizzle-orm`、`drizzle-kit`，建立 D1 + Drizzle 基础设施。
- 在 `src/worker/db/` 下新增数据库入口与 schema；schema 分为两类：
  - Better Auth 核心表
  - 应用表 `app_user_profile`
- `app_user_profile` 结构固定为：
  - `userId`：主键，关联 Better Auth `user.id`
  - `rootDirId`：唯一，创建时生成
  - `createdAt` / `updatedAt`
- 迁移策略固定为：
  - Drizzle 生成 SQL migration
  - Wrangler 对 D1 执行 migration
  - 不保留 `UserDO` 中任何用户、session、verification token 数据

### 2. 通用认证模块

- 在 `src/worker/auth/` 下建立通用认证模块，至少拆成：
  - Better Auth 配置
  - Resend 邮件发送
  - Hono session middleware
  - 应用侧 profile 初始化 helper
- Better Auth 配置固定为：
  - `baseURL` 使用 `APP_URL`
  - `basePath` 为 `/api/auth`
  - `trustedOrigins` 至少包含 `APP_URL` 对应 origin；开发态允许当前请求 origin
  - `emailAndPassword.enabled = true`
  - `requireEmailVerification = true`
  - `autoSignIn = false`
  - `minPasswordLength = 8`
  - `maxPasswordLength = 64`
  - `resetPasswordTokenExpiresIn = 1800`
  - `revokeSessionsOnPasswordReset = true`
- 邮箱验证配置固定为：
  - `sendOnSignUp = true`
  - `sendOnSignIn = true`
  - `autoSignInAfterVerification = false`
  - 验证完成跳转 `/login?verified=1`
- Google 配置固定为：
  - `socialProviders.google`
  - `prompt = "select_account"`
  - 开启账号关联，`trustedProviders = ["google"]`
- 安全策略固定为：
  - 不保留自定义 `session_token` / `user_email` cookie
  - 使用 Better Auth 默认会话 cookie
  - 认证接口的 CSRF / Origin 校验由 Better Auth 负责
  - 保留现有安全响应头
- 输入策略固定为：
  - 注册页仍只提交 `email + password`
  - `name` 在服务端由邮箱前缀派生并裁剪到安全长度
  - 用 Better Auth hooks 在注册 / 重置密码前复用现有密码复杂度规则，避免退回默认弱校验

### 3. 应用侧用户资料与文件上下文

- 删除 `UserDO` 对认证的职责；`rootDirId` 的真相源改为 `app_user_profile`。
- 新增 `getOrCreateAppProfile(userId, email)`：
  - 先查 `app_user_profile`
  - 不存在则创建 `rootDirId`
  - 返回 `rootDirId`
- Hono 受保护路由统一通过 Better Auth `getSession` 注入 `user/session`，然后再解析 `app_user_profile`。
- `src/worker/utils/appHelpers.ts` 的文件上下文改为依赖：
  - Better Auth user 的 `id/email`
  - `app_user_profile.rootDirId`
- `src/worker/routes/profile.ts`、`files.ts`、`shares.ts` 全部改为新上下文，不再访问 `USER_DO`。
- 为稳健性保留“双保险”：
  - 注册成功 / 首次 Google 登录后尝试预创建 `app_user_profile`
  - 任意首次受保护业务访问时再执行一次 `get-or-create` 兜底

### 4. Worker 路由与中间件重组

- `src/worker/index.ts` 调整为：
  - 挂载 Better Auth handler 到 `/api/auth/*`
  - 自定义 auth middleware 仅用于业务 API，不覆盖 Better Auth 路由
  - 自定义 Hono `csrf()` 不再作用于 `/api/auth/*`
- 认证相关旧实现删除或退役：
  - `src/worker/routes/auth.ts`
  - `src/worker/middleware/auth.ts`
  - `src/worker/durable-objects/UserDO.ts`
  - 仅服务旧认证的 password / token / verification helper
- `src/worker/utils/rateLimit.ts` 去掉认证相关 action，只保留业务侧限流，如 `create-share-link`。

### 5. React 前端集成

- 新增 `src/react-app/lib/auth-client.ts`，使用 `createAuthClient` from `better-auth/react`。
- `AuthContext` 保留，但实现改成对 Better Auth client 的薄封装，避免页面层大面积重写；会话状态来源改为 `authClient.useSession()`。
- 页面调整固定为：
  - `Login.tsx`：保留邮箱密码表单；新增 Google 登录按钮；未验证邮箱错误时展示明确提示
  - `Register.tsx`：继续只收邮箱+密码+确认密码；注册成功后跳转 `/login?registered=1`
  - `ForgotPassword.tsx`：调用 `requestPasswordReset({ email, redirectTo: "/reset-password" })`
  - `ResetPassword.tsx`：从 query string 读取 `token`，调用 `resetPassword({ token, newPassword })`
  - 删除 `Verify.tsx` 及对应路由
- 路由调整固定为：
  - 删除 `/verify/:token`
  - 将 `/reset-password/:token` 改为 `/reset-password`
  - 登录成功 / Google 成功统一回到 `/`
- UI 文案固定为：
  - 注册成功提示“请查收邮箱完成验证”
  - 验证成功提示通过登录页 query 参数触发
  - Google 按钮文案使用 `Continue with Google`

## Manual Verification

- 本次不重建自动化测试；验收以手工流程为准。
- 必测场景：
  - 邮箱注册后收到 Resend 验证邮件，点击后回到 `/login?verified=1`
  - 未验证邮箱尝试密码登录被拒绝，并触发重新发送验证邮件
  - 已验证邮箱可正常登录、登出，刷新后会话持续
  - 忘记密码邮件可收到，重置后旧会话失效，新密码可登录
  - Google 首次登录可创建账号并进入应用
  - 已有邮箱密码账号使用同邮箱 Google 登录时自动关联到同一用户
  - 登录后 `profile/files/shares` 功能正常，`rootDirId` 稳定且不泄露到公开接口
- 完成前必须运行：
  - `npm run cf-typegen`
  - `npm run build`
  - `npm run check`

## Assumptions

- 不处理任何历史用户、历史 cookie、历史 token、历史 Durable Object 数据。
- 该应用当前单域部署，不做跨子域 cookie 方案；沿用 Better Auth 默认 `SameSite=Lax`。
- 不在本轮引入 Turnstile / Captcha / 2FA / Passkey。
- 认证模块目标是“可复用”，因此通用逻辑放在 `src/worker/auth/`，文件系统相关字段只放在 `app_user_profile`，不耦合进 Better Auth 核心 user 模型。
- 参考实现以官方文档为准：
  - [Hono Integration](https://better-auth.com/docs/integrations/hono)
  - [Email & Password](https://better-auth.com/docs/authentication/email-password)
  - [Google](https://better-auth.com/docs/authentication/google)
  - [Options](https://better-auth.com/docs/reference/options)
  - [Drizzle + Cloudflare D1](https://orm.drizzle.team/docs/connect-cloudflare-d1)
