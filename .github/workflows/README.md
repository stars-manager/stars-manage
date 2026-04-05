# GitHub Workflows

## 📋 Workflows 说明

### sync-cnb.yml

**用途**：将代码自动同步到 CNB 平台

**触发条件**：每次 push 到任意分支

**目标仓库**：
- **前端**：https://cnb.cool/rss1102.cnb/github-stars-manage/client
- **后端**：https://cnb.cool/rss1102.cnb/github-stars-manage/server

**配置步骤**：

1. **获取 CNB Token**
   - 登录 CNB 平台
   - 进入个人设置 → Access Tokens
   - 创建新 Token（需要 repo 权限）
   - 复制 Token

2. **配置 GitHub Secret**
   - 进入 GitHub 仓库 → Settings → Secrets and variables → Actions
   - 点击 "New repository secret"
   - Name: `SYNC_TO_CNB_TOKEN_STARS`
   - Value: 粘贴 CNB Token
   - 点击 "Add secret"

3. **验证同步**
   - Push 代码到 GitHub
   - 查看 Actions 标签页
   - 确认 workflow 执行成功
   - 访问 CNB 仓库验证代码已同步

## 🔐 安全说明

- **Token 安全**：CNB Token 存储在 GitHub Secrets 中，不会泄露
- **权限控制**：Token 仅用于代码同步，最小权限原则
- **强制同步**：`PLUGIN_FORCE: "true"` 确保 CNB 仓库与 GitHub 完全一致

## 📊 同步流程

```
GitHub Push
    ↓
触发 workflow
    ↓
拉取 GitHub 代码
    ↓
推送到 CNB 仓库
    ↓
同步完成 ✅
```

## 🚀 使用方式

### 自动同步
```bash
# 正常 push 代码即可自动同步
git add .
git commit -m "feat: new feature"
git push origin main

# GitHub Actions 自动执行同步
# CNB 仓库自动更新
```

### 手动触发
```bash
# 在 GitHub Actions 页面
# 点击 "Sync to CNB" workflow
# 点击 "Run workflow"
```

## ⚠️ 注意事项

1. **首次配置**：需要先在 GitHub 配置 Secret
2. **分支保护**：CNB 仓库会完全同步 GitHub，包括所有分支
3. **冲突处理**：使用强制同步模式，CNB 仓库以 GitHub 为准
4. **CI/CD**：CNB 仓库会自动触发 .cnb.yml 中定义的构建流程

## 🔗 相关链接

- **GitHub 仓库**：https://github.com/your-org/github-stars-manage
- **CNB 前端**：https://cnb.cool/rss1102.cnb/github-stars-manage/client
- **CNB 后端**：https://cnb.cool/rss1102.cnb/github-stars-manage/server
- **CNB 平台**：https://cnb.cool

## 📝 Troubleshooting

### 同步失败
**原因**：Token 无效或权限不足

**解决**：
1. 检查 GitHub Secret 是否正确配置
2. 验证 CNB Token 是否有效
3. 确认 Token 有 repo 权限

### 分支未同步
**原因**：workflow 配置问题

**解决**：
1. 检查 `on: [push]` 配置
2. 确认所有分支都触发 workflow
3. 查看 Actions 日志定位问题

### CI/CD 未触发
**原因**：CNB 仓库配置问题

**解决**：
1. 检查 `.cnb.yml` 文件是否存在
2. 验证 CNB 仓库的 CI/CD 配置
3. 查看 CNB 构建日志
