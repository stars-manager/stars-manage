# GitHub Star Manager

一个用于智能管理 GitHub Star（收藏）的 Web 应用，支持 AI 自动标签生成和智能搜索。

## ✨ 主要功能

### 📥 GitHub Stars 管理
- **同步 Stars** - 一键从 GitHub 拉取所有 Star 项目
- **智能搜索** - 模糊搜索项目名称、描述、语言
- **AI 思考助手** - 通过对话式交互智能推荐项目
- **虚拟滚动** - 高效渲染大量项目列表

### 🏷️ 标签系统
- **自定义标签** - 手动创建和管理标签，支持颜色设置
- **AI 自动标签** - 基于腾讯混元大模型自动生成标签建议
- **标签筛选** - 按标签快速过滤项目
- **批量操作** - 批量添加、删除标签，提升效率

### 🔐 安全认证
- **OAuth 登录** - GitHub OAuth 安全认证，无需 Personal Access Token
- **Session 管理** - 基于 HttpOnly Cookie 的安全会话管理
- **后端代理** - 所有敏感 API 请求通过后端代理，保护密钥安全

### 📦 数据同步
- **GitHub 存储** - 数据存储在 GitHub 私有仓库，安全可控
- **JSON 格式** - 结构化数据格式，便于版本管理和备份
- **README 生成** - 自动生成可读的 README 文档，方便分享

## 🚀 快速开始

### 前置要求

- Node.js 18+
- pnpm 8+
- Go 1.21+（后端服务）
- GitHub OAuth App
- 腾讯混元 API Key

### 安装依赖

```bash
# 前端依赖
pnpm install

# 后端依赖
cd ../stars-server
go mod tidy
```

### 配置环境变量

参考 `../stars-server/.env.example` 创建 `.env` 文件：

```bash
# GitHub OAuth 配置
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:8080/api/v1/auth/callback

# 腾讯混元 API
HUNYUAN_API_KEY=your_hunyuan_api_key

# 加密密钥
SESSION_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
```

### 启动服务

```bash
# 启动后端服务
cd ../stars-server
go run cmd/server/main.go

# 启动前端开发服务器（新终端）
cd ../stars-manage
pnpm dev
```

访问 `http://localhost:3000` 开始使用。

### 构建生产版本

```bash
pnpm build
```

## 🛠️ 技术栈

### 前端
- **React 19** + **TypeScript** - 现代化前端框架
- **Vite 8** - 极速构建工具
- **TDesign React** - 企业级 UI 组件库
- **Zustand** - 轻量级状态管理
- **UnoCSS** - 原子化 CSS 引擎

### 后端
- **Go** - 高性能服务端语言
- **Gin** - 轻量级 Web 框架
- **腾讯混元** - 大语言模型服务

## 📖 使用指南

### 1. 登录认证

首次使用需要通过 GitHub OAuth 登录：
1. 点击"GitHub 登录"按钮
2. 在 GitHub 授权页面确认授权
3. 自动跳转回应用，完成登录

### 2. 同步 Stars

1. 点击"同步 Stars"按钮
2. 等待从 GitHub 拉取数据
3. 查看同步统计信息（新增、更新、删除）

### 3. 管理标签

**手动添加标签：**
1. 点击项目卡片的"添加标签"按钮
2. 创建新标签或选择已有标签
3. 标签会自动保存

**AI 自动标签：**
1. 点击"自动标签"按钮
2. 选择要生成标签的项目
3. AI 自动分析项目并生成标签建议
4. 确认应用标签

### 4. 智能搜索

**模糊搜索：**
- 在搜索框输入关键词
- 实时过滤匹配的项目

**AI 思考助手：**
1. 点击"💡 思考助手"按钮
2. 用自然语言描述需求
3. AI 分析并推荐相关项目

### 5. 数据同步

**配置同步仓库：**
1. 进入"设置" → "同步设置"
2. 选择或创建一个 GitHub 仓库
3. 保存配置

**推送数据：**
1. 点击"推送"按钮
2. 数据会保存到仓库的 `stars.json`
3. 自动生成 `README.md` 文档

## 🏗️ 项目结构

```
stars-manage/
├── src/
│   ├── api/              # API 调用
│   ├── components/       # React 组件
│   ├── stores/           # 状态管理
│   ├── types/            # 类型定义
│   └── utils/            # 工具函数
├── public/               # 静态资源
└── package.json          # 项目配置
```

## 🔒 安全配置

详见 [安全配置指南](../SECURITY.md)

### 关键安全措施

1. **OAuth 认证** - 不使用 Personal Access Token
2. **HttpOnly Cookie** - Session 存储在安全 Cookie 中
3. **后端代理** - 所有敏感 API 通过后端代理
4. **环境变量** - 密钥通过环境变量配置

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具链相关
```

## 📄 License

Apache 2.0

## 🙏 致谢

- [TDesign](https://tdesign.tencent.com/) - 腾讯开源 UI 组件库
- [腾讯混元](https://hunyuan.tencent.com/) - 大语言模型服务
