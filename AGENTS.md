# FanLearn Lab — 项目唯一记忆文件（AGENTS.md）

> **给下一次对话的开发 Agent**：这是 FanLearn Lab 课题组网站的唯一项目记忆文件。
> 请先完整阅读本文件，再开始任何代码编写。以后的项目进度、设计决策和开发约束只更新本文件。

---

## 项目概况

| 字段 | 内容 |
|-----|------|
| **项目名称** | FanLearn Lab（泛学习实验室）课题组团队主页 |
| **代码位置** | 当前仓库根目录（跨电脑迁移时不再依赖固定绝对路径） |
| **GitHub** | `https://github.com/Reimagica/-fanlearn-lab` |
| **线上 Demo** | `https://fanlearn-lab.vercel.app/`（Vercel 项目：`https://vercel.com/ma-j/fanlearn-lab`） |
| **技术方案文档** | `./技术方案.md`（详细架构设计，必读） |
| **开发模式** | Vibe Coding — AI 主导编码，用户做决策 |
| **LLM 服务** | DeepSeek `deepseek-chat`，OpenAI 兼容接口 |
| **当前阶段** | Phase 1.6 Demo 冻结版（已满足组会汇报演示；当前优先准备汇报内容，工程问题留待下一轮） |

---

## 课题组信息

| 字段 | 内容 |
|-----|------|
| **课题组 PI** | 范逸洲（Yizhou Fan），北京大学教育学院，副教授 |
| **指导老师** | 范逸洲（副教授、PI）；成员A、成员B（虚拟博士后） |
| **在读/研究成员** | 夏梦雨（博士生）、朱桃林（硕士生）、马郡阳（2026级硕士、管理员）、许家奇（博士生）、李子健（博士生）、马玲（2026级博士）；成员C（虚拟博士生）、成员D（虚拟硕士生） |
| **已毕业成员** | 唐陆禛（2026年硕士毕业）；成员E（虚拟博士毕业生）、成员F（虚拟硕士毕业生） |
| **研究方向** | AI for Education / 学习分析 / 智能辅导系统 / 大语言模型 |

---

## 技术栈

| 层级 | 技术 |
|-----|------|
| 前端框架 | Next.js 16.x (App Router) + TypeScript |
| 样式 | Tailwind CSS v4 + CSS 变量（深色/浅色双主题） |
| 动画 | Framer Motion |
| AI 对话 | Vercel AI SDK (`ai` + `@ai-sdk/openai`) |
| LLM | DeepSeek `deepseek-chat` |
| 图标 | lucide-react |
| 工具函数 | clsx + tailwind-merge |
| 输入校验 | Zod 3.x（与当前 Vercel AI SDK 3.x 兼容） |
| 包管理 | npm（项目用 npm，非 pnpm） |
| 认证 | React Context + localStorage（Phase 1 Mock，Phase 2 接入真实认证） |
| 主题切换 | ThemeProvider + localStorage（key: `fl_theme`）+ 防闪烁内联脚本 |

> **注**：tsParticles 已在 Phase 1.5 移除，首页改为网格 + 渐变光晕 + 信息卡片。

---

## 目录结构

```
fanlearn-lab/
├── .env.local              ← API Key 配置（不提交 git）
├── .gitignore
├── package.json
├── next.config.ts
├── app/
│   ├── globals.css         ← 深色/浅色双主题 CSS 变量 + 工具类（hex-clip, gradient-text）
│   ├── layout.tsx          ← 根布局：ThemeProvider + AuthProvider + Navbar + main + Footer
│   ├── page.tsx            ← 首页：简介 + Stats + 成员/论文/动态单行预览
│   ├── account/page.tsx    ← 成员账号与安全（手机号/密码）
│   ├── messages/page.tsx   ← 管理员消息与内容审核
│   ├── login/
│   │   └── page.tsx        ← 登录页（Mock 认证）
│   ├── team/
│   │   ├── page.tsx        ← 指导老师/研究成员/毕业生 + 个人编辑/管理成员
│   │   └── [slug]/page.tsx ← 成员详情（共用论文卡片 + 动态详情链接）
│   ├── publications/
│   │   ├── page.tsx        ← 论文列表（查重/本组作者校验/审核提交）
│   │   └── [id]/page.tsx   ← 统一论文详情页
│   ├── news/
│   │   ├── page.tsx        ← 动态列表 + 成员发布入口
│   │   ├── new/page.tsx    ← AI 起草/修订/预览/提交审核
│   │   └── [id]/page.tsx   ← 统一动态详情页
│   ├── chat/
│   │   └── page.tsx        ← AI 对话页（ChatPanel，含返回首页按钮）
│   └── api/
│       ├── chat/route.ts                ← DeepSeek 结构化对话（answer / sources / uncertainty / nextStep）
│       ├── news/generate/route.ts       ← DeepSeek 动态生成/修订（factsUsed / riskFlags / needsReview）
│       ├── members/route.ts             ← GET 成员列表
│       ├── publications/route.ts        ← GET 论文；POST 在服务端认证落地前明确禁用
│       ├── publications/lookup/route.ts ← GET 论文元数据查询（标题/作者/DOI 多条件 AND 检索；多源候选检索）
│       ├── news/route.ts                ← GET 动态
│       └── agents/intake/route.ts       ← Intake Agent 结构化输出端点
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx              ← 顶部导航（登录/用户菜单 + 主题切换按钮）
│   │   ├── Footer.tsx              ← 页脚（北大教育学院信息 + 成员登录链接）
│   │   └── BackButton.tsx          ← 通用返回按钮组件（href 或 router.back()）
│   ├── home/
│   │   ├── HeroSection.tsx         ← 首页简短定性介绍（无 CTA/研究卡）
│   │   ├── StatsCounter.tsx        ← 数字滚动动画
│   │   ├── LatestTeam.tsx         ← 首页成员单行预览
│   │   ├── LatestPublications.tsx  ← 首页论文单行预览
│   │   └── LatestNews.tsx          ← 最新动态卡片
│   ├── team/
│   │   ├── HexGrid.tsx             ← 六边形头像网格（hover 不显示引用次数）
│   │   └── MemberTabs.tsx          ← 成员详情 Tab 组件（发表文章 / 科研动态）
│   ├── publications/
│   │   ├── AddPublicationModal.tsx ← 知网/万方式多条件检索 + 中英文成果手动录入
│   │   ├── BibtexImportModal.tsx   ← BibTeX 批量导入弹窗
│   │   └── PublicationEditorModal.tsx ← 管理员编辑已发布论文
│   └── chat/
│       └── ChatPanel.tsx           ← 完整聊天 UI（含顶部返回按钮；结构化回答）
├── lib/
│   ├── utils.ts                    ← cn() 工具函数
│   ├── mock-data.ts                ← 成员/中英文论文/动态演示数据（含 aliases 与显式成员关联）
│   ├── auth.tsx                    ← 认证 Context（AuthProvider / useAuth / 角色体系）
│   ├── lab-data.tsx                ← Phase 1.6 本地数据/审核队列原型
│   ├── theme.tsx                   ← 主题 Context（ThemeProvider / useTheme / 防闪烁脚本）
│   ├── member-match.ts             ← 成员-论文自动关联（aliases 模式，作者名自动匹配）
│   ├── bibtex-parser.ts            ← 零依赖 BibTeX 解析器（花括号匹配 + LaTeX 转义清理）
│   ├── chat-knowledge.ts           ← 站内知识检索与 QA 上下文组装
│   ├── news-category.ts            ← 三类动态定义 + 旧分类迁移
│   ├── ai-provider.ts              ← DeepSeek Provider 与模型配置唯一入口
│   ├── agent-harness.ts            ← 工具白名单 + 输入预算/超时/审计/人工审核边界
│   └── tools/
│       ├── fetch-semantic-scholar.ts  ← SS API 封装（论文搜索/DOI查询/作者统计）
│       ├── fetch-dblp.ts              ← DBLP API 封装
│       ├── check-safety.ts            ← 内容安全检查 + DOI 验证 + 重复检测
│       └── rag-search.ts              ← RAG 搜索（Phase 3 替换为向量数据库）
└── types/
    └── index.ts                    ← Member（含 aliases）/ Publication / NewsItem / AgentLog
```

---

## 认证与权限体系（Phase 1.6 本地原型）

- 公开访问分为“游客”和“课题组成员”。
- 管理员不再是成员类别，而是可附加在任一成员账户上的 `isAdmin` 权限。
- 成员数据仅分为 `advisor`（指导老师）/ `researcher`（研究成员）/ `alumni`（毕业生）三类。
- 管理员先创建新成员档案和初始账户，新成员才能登录。

**Mock 账号（Phase 1）**

| 用户名 | 密码 | 角色 |
|-------|------|------|
| `fanyz` | `member123` | PI + 管理员（范逸洲） |
| `xiamy` | `member123` | 成员（夏梦雨） |
| `zhutl` | `member123` | 成员（朱桃林） |
| `majy` | `member123` | 研究成员 + 管理员（马郡阳） |
| `xujq` | `member123` | 成员（许家奇） |
| `lizj` | `member123` | 成员（李子健） |
| `maling` | `member123` | 成员（马玲） |
| `tanglz` | `member123` | 毕业成员（唐陆禛） |
| `membera` / `memberb` | `member123` | 虚拟博士后（成员A/B） |
| `memberc` / `memberd` | `member123` | 虚拟博士/硕士研究成员（成员C/D） |
| `membere` / `memberf` | `member123` | 虚拟博士/硕士毕业成员（成员E/F） |

所有默认账号与管理员新建账号的初始密码统一为 `member123`；新增成员均为非管理员，只有范逸洲和马郡阳默认附加管理员权限。认证与账户数据保存在 `localStorage`（`fl_auth_user` / `fl_member_accounts`）。这仅是可操作原型，Phase 4 必须替换为服务端真实认证和授权。

---

## 主题系统（深色/浅色双主题）

### 切换方式
- Navbar 右上角 **太阳/月亮图标** 按钮，点击切换
- 选择持久化到 `localStorage`（key: `fl_theme`），刷新保持
- 防闪烁：`lib/theme.tsx` 导出 `themeInitScript`，在 `<head>` 内联注入，hydration 前设置 `data-theme`

### CSS 变量结构
`app/globals.css` 定义两套变量：

| 变量 | 深色值（默认 `:root`） | 浅色值（`:root[data-theme="light"]`） |
|-----|---------------------|--------------------------------------|
| `--bg-base` | `#06060a` | `#f8fafc` |
| `--bg-surface` | `#0f0f17` | `#ffffff` |
| `--bg-surface-2` | `#16161f` | `#f1f5f9` |
| `--bd-base` | `#1e1e2e` | `#e2e8f0` |
| `--fg-strong` | `#f1f5f9` | `#0f172a` |
| `--fg-base` | `#e2e8f0` | `#1e293b` |
| `--fg-muted` | `#94a3b8` | `#475569` |
| `--fg-faint` | `#64748b` | `#94a3b8` |

### Tailwind 语义类映射
**全站统一使用语义类，禁止硬编码颜色值。**

| 语义类 | 对应变量 | 用途 |
|-------|---------|------|
| `bg-background` | `--bg-base` | 页面背景 |
| `bg-surface` | `--bg-surface` | 卡片底色 |
| `bg-surface-2` | `--bg-surface-2` | 卡片悬停/次级背景 |
| `border-border` | `--bd-base` | 边框 |
| `text-text-strong` | `--fg-strong` | 标题/重要文字 |
| `text-text` | `--fg-base` | 正文 |
| `text-text-muted` | `--fg-muted` | 次要文字 |
| `text-text-faint` | `--fg-faint` | 辅助文字 |
| `bg-hairline` | `--hairline` | 细分割线 |
| `bg-overlay` | `--overlay` | 遮罩层 |

> indigo/cyan 等强调色在两种主题下保持一致，确保品牌色统一。

---

## 页面设计决策

### 全局
- **子页面左上角返回按钮**：`/team/[slug]`（返回团队列表）、`/chat`（返回首页）、`/login`（返回首页）
- **导航栏**：首页 / 团队 / 论文 / 动态 + AI助手按钮 + 主题切换按钮 + 登录/用户菜单
- **已删除「加入我们」页面**：代码中不存在 `/join` 路由，导航和 Footer 也不再提供入口

### 首页（/）
- Hero：仅保留网格背景、渐变光晕、课题组名称与简短定性介绍
- 删除 Hero 中“认识我们的团队/浏览学术成果”按钮、内联小数据和三张研究方向卡
- StatsCounter：数字滚动动画（论文数/成员数/总引用）；论文数和总引用从当前已发布论文实时汇总，不使用固定展示数字
- 团队成员、学术成果、课题组动态都以“单行预览 + 查看全部”的一致结构展示
- **已删除** ResearchTags 组件；研究方向卡片也已从 Hero 移除，首页改为团队/论文/动态单行预览

### 团队页（/team）
- 三类分组：指导老师 / 研究成员 / 毕业生
- 成员网格根据屏幕宽度响应式排列，每行最多5人
- 登录成员可编辑本人姓名、职称、研究方向、邮箱、简介和图片
- 管理员可新增、编辑、删除成员，设置成员分类和附加管理员权限
- 新增成员时同步建立用户名和临时密码

### 成员详情（/team/[slug]）
- 左侧：头像卡（去掉 h-index / 引用次数统计块，保留链接）
- 右侧：个人简介 + 两个并列 Tab（发表文章 / 科研动态）
- **成员-论文关联**：新提交论文在无显式关联时使用 aliases 自动匹配；已有 `relatedMemberSlugs` 时以显式关联为唯一依据，避免中英文同名作者被误挂到成员主页
- 成员论文与论文页共用 `PublicationCard`：支持被引/下载量、arXiv/PDF、摘要展开和 BibTeX 复制；仅论文标题链接详情页

### 论文页（/publications）
- 已去掉"精选"筛选按钮
- 顶部模糊检索框（检索标题、作者、会议、标签）
- 侧边筛选：年份 + 类型
- **登录后显示**「添加论文」+「从 BibTeX 导入」按钮
  - 自动查询：支持标题 / 作者 / DOI 多条件组合，最多 3 条，默认 AND；标题和 DOI 各最多 1 条，作者最多 3 条。前端以知网 / 万方式多条件检索交互组织输入，后端会用同样的条件严格约束 Semantic Scholar、Crossref / DBLP 兜底搜索
  - 手动录入：为未被国际数据库收录或没有 DOI 的国内外成果填写标题、作者、刊物/出版社、年份、类型、语言、原文/PDF、摘要和关键词；类型含期刊、会议、预印本、学位论文和学术著作
  - BibTeX 导入：粘贴 .bib 文本 → 零依赖解析器批量导入
  - 提交前必须匹配到至少一位本组成员作者
  - DOI 或规范化标题重复时禁止重复提交
  - 不直接发布，进入管理员消息/审核队列；通过后才加入论文库
  - 通过后根据作者别名自动同步到所有相关成员主页
- 每篇论文可进入 `/publications/[id]` 统一详情页
- 论文卡片固定显示被引量与下载量；下载量在 Phase 1.6 由数据字段/管理员维护，正式上线后由服务端统一统计
- 管理员在论文列表中可编辑或删除已发布论文；编辑时重新执行查重、作者匹配并同步成员主页与首页统计

### 开发环境标识
- `next.config.ts` 设置 `devIndicators: false`，隐藏开发环境左下角的 Next.js 工具按钮；不影响错误输出和生产构建

### 动态页（/news）
- 数据与发布类型统一为三类：`paper`（论文发表）/ `academic`（学术动态）/ `member`（成员动态）
- Tab 筛选：全部 / 论文发表 / 学术动态 / 成员动态
- 旧数据会自动迁移：`talk/award/other` → `academic`，`new_member/graduation` → `member`
- 顶部模糊检索框（检索标题+内容）
- 所有登录成员可进入 `/news/new` 发布动态
- 发布流程：选择类型/日期 → 添加参考链接或文本文件 → 用自然语言描述要求 → DeepSeek 生成 → 人工编辑或 AI 修订 → 预览 → 提交管理员审核
- 当前 AI 可读取 TXT/Markdown/CSV/JSON；PDF/Word 需待 Phase 2 接入对象存储和服务端解析后开放
- 统一内容结构：标题 / 列表摘要 / 正文（事件概述—核心信息—意义或后续）/ 作者与日期 / 参考资料
- 每条动态可进入 `/news/[id]` 详情页

### 管理员消息页（/messages）
- Navbar 对管理员显示带待审数量的消息按钮
- 可切换待处理/历史记录，预览论文或动态完整内容
- 通过后立即发布；驳回时必须填写审核意见

---

## API 接口文档

### GET /api/members
成员列表查询。**Query Params**: `category`、`active`

### GET /api/publications
论文列表查询。`POST` 当前返回 `501`，避免在尚无服务端认证和数据库时伪造“已进入审核队列”；页面内提交流程暂由 `lib/lab-data.tsx` 管理。

### GET /api/publications/lookup
论文元数据自动补全。**Query Params**: `title`、`doi`、重复 `author`；也兼容旧的 `query` 兜底输入
- 多源检索：按标题 / 作者 / DOI 组合做候选匹配，条件之间默认 AND；title / doi 各最多 1 条，author 最多 3 条。后端会先用最严格的组合词条发起搜索，再用结构化条件二次过滤，尽量减少“看起来像但其实不是”的候选
- 返回 `candidates[]`，每条候选含 `paper`、`source`、`confidence`、`matchedFields`、`missingFields`，方便前端人工确认
- 自动推断 pubType（conference/journal/preprint/thesis；学术著作 book 通过手动/BibTeX 录入）
- 该接口已接入 `research` Agent 的运行边界与审计

### GET /api/news
动态列表查询。**Query Params**: `category`、`member`、`limit`

### POST /api/chat
DeepSeek 结构化对话端点，返回 `answer`、`sources`、`uncertainty`、`nextStep`。先在站内知识中检索，再基于事实生成回答。环境变量：`DEEPSEEK_API_KEY`

### POST /api/agents/intake
Intake Agent 独立端点：使用 DeepSeek 进行意图识别 + 字段提取。

### POST /api/news/generate
DeepSeek 动态文本生成/修订端点。输入动态类型、自然语言要求、参考链接/文件；输出统一的 `title` / `summary` / `content` / `factsUsed` / `riskFlags` / `needsReview`。

### Harness Engineering 当前实现
- `lib/agent-harness.ts` 是所有 AI 路由的统一运行边界，定义 7 类 Agent（含 `news_draft`）的工具白名单与运行策略。
- QA 现改为先检索站内知识，再返回结构化回答；站内知识检索在 `lib/chat-knowledge.ts`，并同步返回来源与不确定性。
- 每类 Agent 都有限制：输入总字符、附件数量/文本长度、最大步骤、重试次数和超时。
- 所有 Agent 的 `canPublish` 固定为 `false`；AI 只能检索、提取、起草或给审核建议，管理员人工操作才是发布入口。
- 附件和参考资料按不可信输入处理，系统提示明确防止提示词注入；动态提交前另做基础隐私/长度检查。
- 每次 AI 调用生成 `traceId`；日志只记录规模、状态、耗时和错误类型，不记录用户原文、附件正文、账号或模型输出。

---

## 设计系统

**主色系（indigo/cyan 在深浅主题下一致）**
- 主色: `#6366f1`（indigo-500）/ `#818cf8`（indigo-400）
- 强调色: `#22d3ee`（cyan-400）

**特殊 CSS 类**
- `.hex-clip`：六边形 clip-path
- `.gradient-text`：渐变文字（indigo → cyan）

**组件规范（使用语义类，非硬编码颜色）**
- 卡片：`rounded-xl border border-border bg-surface`
- 主按钮：`bg-indigo-600 rounded-full` + 发光阴影
- Tab 激活：`bg-indigo-500 text-white shadow`
- 次级文字：`text-text-muted`
- 悬停背景：`hover:bg-surface-2`

---

## 迭代记录

### Phase 1.6 — 2026-07-13（当前）

**首页结构**
- ✅ Hero 删除 CTA、内联数据和三张研究方向卡，简介后直接进入 42+ 等成果数据
- ✅ 团队、学术成果、课题组动态改为一致的单行预览 + 查看全部
- ✅ 删除“在研项目”；论文数与总引用改为从当前论文数据实时汇总

**成员与账户**
- ✅ 成员数据分为指导老师/研究成员/毕业生，管理员改为附加权限
- ✅ 成员编辑本人基础资料；管理员新增/编辑/删除成员并初始化账户
- ✅ `/account` 独立管理手机号和密码
- ✅ 新增马郡阳（`majy`）研究成员账户并附加管理员权限
- ✅ 新增6名虚拟演示成员（成员A—F）、许家奇、李子健和马玲，新增成员默认均无管理员权限
- ✅ 所有默认账号与新建账号的初始密码统一为 `member123`，并为既有浏览器账户增加版本迁移
- ✅ 团队成员网格每行最多5人

**论文、动态与审核**
- ✅ 统一 PublicationCard 和 `/publications/[id]` 详情页
- ✅ 本组作者校验、DOI/标题去重、多成员主页自动同步
- ✅ 补充2024中文学术著作、2025—2026中文论文、2026英文论文及 DOI/原文/PDF 链接；新增中英文成果手动录入
- ✅ 动态内容替换为2025—2026真实事件/论文发表信息，并支持一条动态关联多位成员
- ✅ 论文卡片显示被引量/下载量，移除“查看详情”按钮，仅标题进入详情页
- ✅ 管理员可直接编辑/删除已发布论文，变更自动联动成员主页与首页统计
- ✅ 隐藏 Next.js 开发环境左下角工具按钮
- ✅ `/news/new` DeepSeek 生成/修订/预览流程与 `/news/[id]` 详情页
- ✅ `/messages` 管理员预览、通过、驳回流程
- ✅ AI 对话增加文件上传入口
- ✅ 所有 AI 调用迁移到 DeepSeek `deepseek-chat`
- ✅ 动态数据模型和发布入口统一为论文发表/学术动态/成员动态三类，兼容迁移旧浏览器数据
- ✅ 论文自动查询端点改为候选结构，返回 `confidence / matchedFields / missingFields`，前端先人工确认再提交
- ✅ AI 对话改为结构化输出 `answer / sources / uncertainty / nextStep`
- ✅ 动态草稿返回 `factsUsed / riskFlags / needsReview`，便于作者先审再提
- ✅ 新增独立 `news_draft` Agent 名称，新闻草稿日志与 intake 分离

**Phase 2 前稳定性与 Harness 检视**
- ✅ DeepSeek Provider 集中到 `lib/ai-provider.ts`，避免不同路由配置漂移
- ✅ Harness 从静态白名单升级为实际执行约束：运行时鉴权、输入预算、附件上限、超时/重试/步数、去敏审计
- ✅ 移除 AI 对话中伪造提交结果的工具，改为只读检索与提交流程指引
- ✅ AI 参考附件增加不可信输入边界；动态提交增加长度与隐私规则检查
- ✅ API 查询参数增加类型/范围校验，外部学术 API 增加 10 秒超时，全站增加基础安全响应头
- ✅ 禁用无持久化能力却返回成功的 `POST /api/publications` 原型；接入服务端认证和数据库后再开放
- ✅ 删除已停用的 tsParticles 依赖，降低安装体积和依赖面
- ✅ 将 Zod 从不匹配的 4.x 对齐到 AI SDK 3.x 支持的 3.25，消除工具参数 Schema 的运行时兼容风险
- ✅ 构建命令固定为 `next build --webpack`，并通过 `vercel.json` 的 `buildCommand` 对齐 Vercel 预览/正式部署，避免 Turbopack 在受限环境中的端口绑定问题
- ✅ 通过 `npm overrides` 将 Next 依赖链里的 `postcss` 与 `sharp` 更新到安全版本，`npm audit --omit=dev` 已无 high / critical；仍保留少量 low / moderate 告警，主要来自旧版 AI SDK，等待 Phase 2 再做大版本迁移
- ✅ 新增 Vitest 单测与 GitHub Actions CI，覆盖默认账号权限、成员-论文匹配、论文去重、动态分类迁移与提审流
- ✅ `GET /api/publications/lookup` 已切换到独立的 `research` Agent 路由与审计标识
- ✅ `README.md` 已从默认模板改为项目说明，补充了运行、环境变量、部署和数据边界

> Phase 1.6 的成员、账户、审核队列和发布结果仍是 `localStorage` 本地原型。正式上线前需接入 Sanity/Supabase 并将所有授权判断移到服务端。

### 组会 Demo 冻结与后续修复清单（临时）

> **临时维护说明**：2026-07-19 决定当前版本先用于组会汇报 Demo，不在汇报准备期间处理下列工程问题。下一轮开发逐项修复并验证后，应删除已完成条目；全部解决后删除本节。

**Demo 结论**
- 当前页面、演示数据、登录/审核原型和 AI 入口已足够展示产品构想与完整流程。
- 本地已通过 TypeScript、ESLint 和 Next.js 生产构建；下列问题不阻断组会演示，但阻断正式生产上线。
- 本轮已统一文档口径：`/join` 已删除；真实演示成员名单已改为许家奇、李子健。
- 20 分钟组会汇报提纲、逐页讲稿、Demo 顺序与讨论问题已整理到 `组会汇报内容.md`。
- 可直接投屏汇报的 Word 成稿已生成：`FanLearn-Lab组会汇报-最终版.docx`；网站截图单独保存在 `汇报插图/`。

**下一轮工程待办**
1. 恢复本地 Git 元数据并与 GitHub `main` 分支做逐文件核验；迁移包本身只是源码快照，不含 `.git` 历史。
2. 正式上线前将明文 Mock 密码、管理员权限、成员数据和审核队列迁出 `localStorage`，所有授权判断改到服务端。
3. 若后续要跟进 AI SDK 的安全告警，按 major migration 分批升级 `ai` / `@ai-sdk/openai`，先做路由与生成链回归，不直接追最新大版本。

### Phase 1.5 — 2026-06-18 ~ 2026-07-10（已完成）

**UI 全面迭代**
- ✅ 更新 LAB_INFO：北京大学教育学院，范逸洲课题组
- ✅ 更新 Mock 数据：范逸洲（PI）/ 夏梦雨 / 朱桃林 / 唐陆禛（已毕业）+ 配套论文和动态
- ✅ 认证系统原型：AuthProvider（lib/auth.tsx）+ 登录页（/login）；Phase 1.6 已统一为成员账户 + 可附加管理权限
- ✅ Navbar：去掉「加入我们」，加入登录按钮 + 已登录用户菜单 + 主题切换按钮
- ✅ Footer：更新为北大教育学院信息，去掉「加入我们」，加入「成员登录」链接
- ✅ BackButton 通用组件
- ✅ 成员详情页：左上返回按钮 + 右侧拆为「发表文章/科研动态」两个 Tab
- ✅ 团队列表页：去掉副标题；HexGrid hover 去掉引用次数
- ✅ 论文页：去掉精选筛选；加入模糊检索框
- ✅ 动态页：全部/论文发表/学术动态/成员动态 Tab + 模糊检索框
- ✅ 聊天页：ChatPanel 头部加入「返回」按钮

**首页改造**
- ✅ 移除 tsParticles 粒子背景（实用性优先）
- ✅ HeroSection 精简为网格 + 渐变光晕 + 课题组定性介绍
- ✅ 删除 ResearchTags 与 Hero 研究方向卡，改为团队/论文/动态单行预览

**论文管理工具（借鉴 LWT + al-folio）**
- ✅ 论文候选检索：`/api/publications/lookup` + AddPublicationModal（支持标题 / 作者 / DOI 多条件 AND 检索，最多 3 条；前端交互对齐知网 / 万方式组合检索，后端同步约束 Semantic Scholar + Crossref + DBLP）
- ✅ BibTeX 批量导入：零依赖解析器 + BibtexImportModal
- ✅ 论文页合并展示 mock 数据 + 用户本地新增论文（Phase 1.6 已改为审核提交）

**成员-论文自动关联（借鉴 LWT aliases 模式）**
- ✅ Member 类型加 `aliases` 字段
- ✅ `lib/member-match.ts`：作者名自动匹配（去点、小写、子串包含）
- ✅ 成员详情页改用 `getMemberPapers` 自动匹配

**深色/浅色双主题**
- ✅ `lib/theme.tsx`：ThemeProvider + useTheme + 防闪烁内联脚本
- ✅ `app/globals.css`：两套 CSS 变量（`:root` 深色 / `:root[data-theme="light"]` 浅色）
- ✅ `@theme inline` 映射为 Tailwind 语义类（bg-surface / text-text-strong 等）
- ✅ 全站 ~20 个组件批量替换硬编码颜色为语义类
- ✅ Navbar 右上角加主题切换按钮（Sun/Moon 图标）

### Phase 1 — 2026-06-18

- ✅ Next.js 16 项目初始化 + 全站 UI 骨架
- ✅ 初版 AI 对话接入（Phase 1.6 已迁移至 DeepSeek）
- ✅ Agent Harness 类型系统
- ✅ Python 爬虫骨架（scholar_sync.py）

---

## Phase 路线图（后续迭代）

### Phase 2 — 服务端数据与身份基础（下一阶段）

#### Sanity / Supabase 决策原则（尚未最终确定）

当前默认推荐 **Supabase 统一方案**：使用 Supabase Auth + PostgreSQL + Storage，统一保存成员、论文、动态、审核队列、文件元数据和 Agent 审计日志，现有网站管理页面继续作为编辑后台。对于当前规模的课题组网站，这条路线数据源单一、权限与审核事务更容易保持一致，开发和运维成本最低。

只有在课题组明确提出“非技术成员需要独立的可视化内容工作台、富文本编辑、媒体素材管理和内容预览”时，才考虑 **Supabase + Sanity 混合方案**：
- Supabase：身份、权限、审核流程、审计日志、文件与业务状态。
- Sanity：仅保存审核通过后的公开成员/论文/动态内容。
- 必须按数据状态划分唯一权威来源，并通过服务端发布任务或 outbox 同步；禁止浏览器双写，也禁止同一实体由两边同时编辑。

#### 推荐实施顺序

1. **Phase 2A（与内容平台选择无关）**：接入 Supabase Auth 或 Auth.js，将密码校验、管理员权限和会话移到服务端；完成前继续禁止开放写 API。
2. **Phase 2B（统一业务基础）**：先在 PostgreSQL 建立成员、论文、动态、审核队列、关联关系和 Agent 审计表，配置服务端授权与行级权限；迁移现有 Mock/localStorage 数据。
3. **决策门**：用实际管理场景验证现有网站后台是否足够。若足够，采用 Supabase 统一方案；若课题组确实需要专业 CMS 编辑体验，再引入 Sanity。决策必须在公开内容正式迁移前完成。
4. **Phase 2C（文件与运行保障）**：接入对象存储、文件类型校验与 PDF/Word 服务端文本提取；补充 AI/API 限流、费用上限、错误监控和备份恢复。
5. **Phase 2D（质量保障）**：增加关键流程自动化测试与 CI：登录权限、作者匹配、论文去重、三类动态迁移、提审/审核/发布。
6. **依赖升级**：将 Vercel AI SDK 升级到无相关安全公告的新主版本，并跟进 Next.js/PostCSS 修复版本；升级需重写并回归 `useChat`、工具 Schema 和流式响应，不做强制自动升级。

### Phase 3 — AI 对话智能化
接入真实 Semantic Scholar + Crossref + DBLP API；RAG 向量化；流程：输入标题/标识 → 自动补全 → 确认 → 提交。
> 注：论文自动补全的轻量版已在 Phase 1.5/1.6 落地，Phase 3 为 AI 驱动版本。

### Phase 4 — Moderation Agent + Watchdog 自动监察
- 在 Phase 2 服务端身份和审核表基础上加入 Moderation Agent 建议（AI 不直接发布）
- Watchdog Agent 定时扫描

### Phase 5 — 定时爬虫
激活 `crawler/scholar_sync.py`，填入成员 Semantic Scholar ID，在 ECS 上运行。

### Phase 6 — 阿里云 ECS 迁移
从 Vercel 迁移到自有服务器；Nginx 反向代理；Let's Encrypt HTTPS。

---

## 本地开发

```bash
cd <本机的 fanlearn-lab 仓库根目录>

# 配置 API Key（必须）
# 编辑 .env.local，填入 DEEPSEEK_API_KEY=sk-xxx

# 启动开发服务器
npm run dev
# → 访问 http://localhost:3000

# 类型检查
npx tsc --noEmit

# 构建
npm run build
```

> 注：当前 `npm run build` 会走 `next build --webpack`，这是为了让本地和 Vercel 的构建路径保持一致，并绕开 Turbopack 在当前受限环境里的端口绑定问题。

---

## 环境变量说明

| 变量名 | 阶段 | 说明 |
|-------|------|------|
| `DEEPSEEK_API_KEY` | Phase 1.6 | DeepSeek API Key（聊天、Intake、动态生成/修订共用） |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Phase 2（仅混合方案） | Sanity 项目 ID |
| `SANITY_API_TOKEN` | Phase 2（仅混合方案） | Sanity 服务端写入 Token |
| `DATABASE_URL` | Phase 2 | PostgreSQL/Supabase 服务端连接串 |
| `NEXT_PUBLIC_SUPABASE_URL` | Phase 2 | Supabase 项目 URL |

---

## 常见问题

**Q: 如何切换深色/浅色主题？**
A: 点击 Navbar 右上角的太阳/月亮图标。选择保存在 `localStorage`（key: `fl_theme`）。

**Q: 如何添加新的颜色？**
A: 在 `app/globals.css` 的 `:root` 和 `:root[data-theme="light"]` 中同时定义变量，然后在 `@theme inline` 块中映射为 Tailwind 语义类。**禁止在组件中硬编码颜色值**，统一使用 `bg-surface` / `text-text-strong` 等语义类。

**Q: AI 对话或动态生成返回 503？**
A: 检查 `.env.local` 中的 `DEEPSEEK_API_KEY` 是否正确填写。需要修改的 AI 路径为 `app/api/chat/route.ts`、`app/api/agents/intake/route.ts`、`app/api/news/generate/route.ts`。

**Q: Tailwind 类名不生效？**
A: 本项目用 Tailwind CSS v4，主题配置在 `app/globals.css` 的 `@theme` 块中。

**Q: 如何添加新成员？**
A: Phase 1.6 可用管理员账户登录，在 `/team` 点击“管理成员”建立成员档案和初始账户。如需修改默认演示数据，编辑 `lib/mock-data.ts`，并保持 `aliases` 完整。

**Q: 如何添加新的 Mock 登录账号？**
A: 优先通过“管理成员”创建。默认演示账号定义在 `lib/auth.tsx` 的 `DEFAULT_ACCOUNTS`。

**Q: 论文自动查询不工作？**
A: 现在是“组合检索 + 候选确认”模式：你可以像知网 / 万方那样把标题、作者、DOI 分开填，系统会按 AND 关系一起约束搜索，并把最像的候选返回给你确认。仍然找不到时，多半是该成果没有被公开学术库收录，或者标题/作者信息不够完整；这时切换到“手动录入”。查询代码在 `app/api/publications/lookup/route.ts`。

**Q: 用户提交的内容保存在哪里？**
A: Phase 1.6 由 `lib/lab-data.tsx` 管理本地原型：`fl_members`、`fl_publications`、`fl_news`、`fl_review_queue`。Phase 2 接入正式内容库、审核队列与真实权限。

**Q: 怎么部署到 Vercel？**
A: 现在这套仓库已经对齐成 Vercel 友好的构建方式了：`npm run build` 就是正式构建命令，仓库根目录还有 `vercel.json` 把 `buildCommand` 固定成同一个命令。真正上线时，只需要在 Vercel 里导入这个 GitHub 仓库，然后把环境变量 `DEEPSEEK_API_KEY` 配好即可；AI 聊天、论文补全、动态生成这些功能才会正常工作。

**Q: 「加入我们」页面还在吗？**
A: 不在。`/join` 页面和导航入口均已删除；当前网站不提供“加入我们”路由。

---

## 技术决策记录

| 决策 | 选择 | 理由 |
|-----|------|------|
| AI 服务 | DeepSeek `deepseek-chat` | OpenAI 兼容接口；统一支持聊天、Intake 和动态文本生成 |
| 认证（Phase 1） | React Context + localStorage | 快速实现，Phase 2 迁移到服务端真实认证 |
| 主题系统 | CSS 变量 + data-theme 属性 | 零依赖、防闪烁、Tailwind v4 原生支持 |
| 论文元数据补全 | Semantic Scholar + Crossref + DBLP 组合检索 | 免费、覆盖面更广，支持标题 / 作者 / DOI 多条件 AND 约束，尽量提高候选准确率 |
| BibTeX 解析 | 零依赖自研解析器 | 避免 jekyll-scholar 等重依赖，前端纯 TS |
| 成员-论文关联 | aliases 模式（借鉴 LWT） | 作者名自动匹配，避免手动维护关联 |
| 内容与业务数据（Phase 2） | 尚未最终确定；默认推荐 Supabase 统一方案 | 当前规模下单一数据源最稳妥；只有明确需要专业可视化 CMS 时才采用 Supabase + Sanity 混合方案，并严格划分唯一权威来源 |
| 包管理 | npm（非 pnpm） | pnpm 11 在此环境有 build scripts 权限问题 |
| 样式系统 | Tailwind CSS v4 | create-next-app 最新版默认，CSS 原生 @theme |
| 首页背景 | 网格 + 渐变光晕（移除粒子） | 功能性主页实用性优先，粒子已移除 |
