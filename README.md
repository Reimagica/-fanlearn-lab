# FanLearn Lab

FanLearn Lab 是北京大学教育学院范逸洲课题组的网站原型，当前版本用于展示课题组简介、成员、论文、动态和 AI 辅助功能。

## 当前状态

这个仓库现在是一个可运行的 demo 版本，已经支持：

- 首页、团队页、论文页、动态页、AI 对话页
- 成员登录、管理员审核、论文/动态提审流程
- 论文自动检索与人工确认
- 动态草稿生成与预览
- 基础的单元测试和 GitHub Actions CI

但请注意：当前账号、成员、论文、动态和审核队列仍主要保存在浏览器本地存储里，属于演示原型，不是正式生产后台。

## 本地运行

先安装依赖：

```bash
npm ci
```

然后创建 `.env.local`，至少填入：

```bash
DEEPSEEK_API_KEY=你的DeepSeek密钥
```

启动开发服务器：

```bash
npm run dev
```

打开：

- http://localhost:3000

## 常用命令

```bash
npm run lint
npm run test
npm run build
```

含义分别是：

- `lint`：检查代码风格和基础错误
- `test`：运行当前的自动化单元测试
- `build`：做一次生产构建，检查线上是否能正常打包

## 环境变量

当前真正必需的是：

- `DEEPSEEK_API_KEY`

后续如果接入正式数据库、对象存储、身份系统，再补：

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `SANITY_API_TOKEN`

注意：不要把密钥写死在代码里，也不要放到 `NEXT_PUBLIC_*` 里。

## 部署建议

当前项目最适合先部署到 Vercel 做预览和验收：

1. 把代码推到 GitHub
2. 在 Vercel 导入这个仓库
3. 只配置必要环境变量 `DEEPSEEK_API_KEY`
4. 使用默认的 Next.js 构建流程即可

本仓库已经把构建命令固定为：

```bash
next build --webpack
```

这样本地、CI 和 Vercel 的构建路径更一致。

## 数据边界

当前版本里的很多内容是为了演示而准备的：

- 成员账号和密码是 mock 数据
- 论文和动态可先在本地维护
- 审核流程是本地原型
- AI 只能辅助检索、起草和整理，不会自动越权发布

正式上线前，需要把这些内容迁到服务端数据库和真实认证系统里。

## 测试与 CI

仓库里已经加了基础测试和 GitHub Actions：

- 账号权限
- 成员-论文匹配
- 论文去重
- 动态分类迁移
- 提审/审核记录

CI 会在 push 和 pull request 时自动跑：

- 安装依赖
- lint
- test
- build

## 目录记忆

项目的长期记忆和开发约定统一写在 `AGENTS.md`，以后更新项目状态时优先改那里。
