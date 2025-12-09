# GitHub Releases 发布指南

本指南说明如何将编译好的可执行文件发布到 GitHub Releases。

## 📦 方法一：使用发布脚本（推荐）

使用项目提供的 `publish-release.ps1` 脚本可以快速完成发布准备。

```powershell
# 运行发布脚本
.\publish-release.ps1 -Version "1.0.0"
```

脚本会自动：
- 更新版本号
- 打包应用
- 检查文件
- 提供操作指引

然后按照脚本提示完成 Git 操作和 GitHub Release 创建。

## 📦 方法二：手动发布（适合自定义流程）

### 步骤 1: 打包应用

```powershell
# 使用打包脚本打包
.\pack-with-mirror.ps1 dist:win:portable
```

打包完成后，可执行文件位于 `release/活动分析器-1.0.0.exe`

### 步骤 2: 创建 GitHub Release

1. **打开 GitHub 仓库页面**
   - 访问你的 GitHub 仓库
   - 点击右侧的 "Releases" 链接
   - 或直接访问：`https://github.com/你的用户名/仓库名/releases`

2. **创建新 Release**
   - 点击 "Create a new release" 或 "Draft a new release" 按钮

3. **填写 Release 信息**
   - **Tag version**: 输入版本号，例如 `v1.0.0`（建议使用 `v` 前缀）
   - **Release title**: 输入标题，例如 `v1.0.0 - 活动分析器`
   - **Description**: 填写更新说明，例如：
     ```markdown
     ## 新功能
     - 新增详细时间线功能
     - 支持时间段筛选
     
     ## 修复
     - 修复了时间线卡顿问题
     - 优化了界面显示
     
     ## 下载
     下载 `活动分析器-1.0.0.exe` 即可使用，无需安装。
     ```

4. **上传文件**
   - 在 "Attach binaries" 区域，点击 "Choose your files"
   - 选择 `release/活动分析器-1.0.0.exe` 文件
   - 等待上传完成

5. **发布**
   - 如果准备好了，点击 "Publish release"
   - 如果想稍后发布，点击 "Save draft" 保存草稿

### 步骤 3: 验证发布

发布成功后，用户可以：
- 在 Releases 页面下载可执行文件
- 通过链接直接下载：`https://github.com/你的用户名/仓库名/releases/download/v1.0.0/活动分析器-1.0.0.exe`

## 🤖 方法二：使用 GitHub Actions 自动发布（推荐）

使用 GitHub Actions 可以在推送代码时自动构建和发布。

### 步骤 1: 创建 GitHub Actions 工作流

在项目根目录创建 `.github/workflows/release.yml` 文件：

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'  # 当推送以 v 开头的标签时触发

jobs:
  build:
    runs-on: windows-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build application
      run: npm run build
      
    - name: Build portable executable
      env:
        ELECTRON_MIRROR: https://npmmirror.com/mirrors/electron/
        ELECTRON_BUILDER_BINARIES_MIRROR: https://npmmirror.com/mirrors/electron-builder-binaries/
        CSC_IDENTITY_AUTO_DISCOVERY: false
      run: npm run dist:win:portable
      
    - name: Create Release
      id: create_release
      uses: actions/create-release@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        tag_name: ${{ github.ref }}
        release_name: Release ${{ github.ref }}
        body: |
          ## 自动构建发布
          
          此版本由 GitHub Actions 自动构建和发布。
          
          ### 下载
          - 下载 `活动分析器-*.exe` 即可使用，无需安装。
          
          ### 更新说明
          查看 [提交历史](https://github.com/${{ github.repository }}/compare/${{ github.event.before }}...${{ github.sha }}) 了解详细更改。
        draft: false
        prerelease: false
        
    - name: Upload Release Asset
      uses: actions/upload-release-asset@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        upload_url: ${{ steps.create_release.outputs.upload_url }}
        asset_path: ./release/活动分析器-*.exe
        asset_name: 活动分析器-${{ github.ref_name }}.exe
        asset_content_type: application/octet-stream
```

### 步骤 2: 推送标签触发发布

```bash
# 1. 更新版本号（如果需要）
# 编辑 package.json，更新 version 字段

# 2. 提交更改
git add .
git commit -m "准备发布 v1.0.0"

# 3. 创建并推送标签
git tag v1.0.0
git push origin v1.0.0

# 或者一次性推送标签和代码
git push origin main --tags
```

GitHub Actions 会自动：
1. 检测到标签推送
2. 运行构建流程
3. 创建 Release
4. 上传可执行文件

### 步骤 3: 查看构建状态

- 在 GitHub 仓库页面，点击 "Actions" 标签
- 查看构建进度和结果
- 构建成功后，在 "Releases" 页面可以看到新发布的版本

## 📝 发布检查清单

在发布前，请确保：

- [ ] 更新了 `package.json` 中的版本号
- [ ] 更新了 `CHANGELOG.md`（如果有）
- [ ] 测试了打包后的应用
- [ ] 检查了文件大小（通常应该在 100-200MB 左右）
- [ ] 在干净的 Windows 系统上测试了可执行文件
- [ ] 编写了清晰的 Release 说明

## 🎯 版本号规范

建议使用 [语义化版本](https://semver.org/)：

- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

示例：
- `v1.0.0` - 首次发布
- `v1.1.0` - 新增功能
- `v1.1.1` - 修复 bug
- `v2.0.0` - 重大更新（可能不兼容）

## 🔗 获取下载链接

发布后，可以通过以下方式获取下载链接：

### 最新版本下载链接

```
https://github.com/你的用户名/仓库名/releases/latest/download/活动分析器-1.0.0.exe
```

### 特定版本下载链接

```
https://github.com/你的用户名/仓库名/releases/download/v1.0.0/活动分析器-1.0.0.exe
```

### 在 README 中添加下载按钮

可以在 README.md 中添加下载链接：

```markdown
## 📥 下载

[![下载最新版本](https://img.shields.io/badge/下载-最新版本-blue)](https://github.com/你的用户名/仓库名/releases/latest)

或访问 [Releases 页面](https://github.com/你的用户名/仓库名/releases) 下载所有版本。
```

## ⚠️ 注意事项

1. **文件大小限制**
   - GitHub Releases 单个文件最大 2GB
   - 建议压缩大文件或使用分卷压缩

2. **文件命名**
   - 使用清晰的命名，包含版本号
   - 例如：`活动分析器-1.0.0.exe`

3. **Release 说明**
   - 详细说明新功能和修复
   - 提供使用说明
   - 列出已知问题（如果有）

4. **测试**
   - 在发布前充分测试
   - 在干净的 Windows 系统上测试
   - 检查所有功能是否正常

5. **安全性**
   - 不要上传包含敏感信息的文件
   - 考虑代码签名（避免 Windows 安全警告）

## 🚀 快速发布脚本（推荐）

项目已包含发布辅助脚本 `publish-release.ps1`，可以自动完成版本号更新和打包。

### 使用方法

```powershell
# 基本用法（会自动更新版本号并打包）
.\publish-release.ps1 -Version "1.0.0"

# 如果已经打包过，可以跳过打包步骤
.\publish-release.ps1 -Version "1.0.0" -SkipBuild

# 自定义标签名（默认是 v1.0.0）
.\publish-release.ps1 -Version "1.0.0" -Tag "v1.0.0-beta"
```

### 脚本功能

1. ✅ 自动更新 `package.json` 中的版本号
2. ✅ 自动打包应用（使用 `pack-with-mirror.ps1`）
3. ✅ 检查发布文件是否存在
4. ✅ 显示文件大小
5. ✅ 提供下一步操作指引
6. ✅ 可选打开文件所在目录

### 使用示例

```powershell
# 发布 v1.0.0
.\publish-release.ps1 -Version "1.0.0"

# 脚本会：
# 1. 更新 package.json 版本号为 1.0.0
# 2. 运行打包脚本
# 3. 检查 release/活动分析器-1.0.0.exe 是否存在
# 4. 显示下一步操作指引
```

然后按照脚本提示的步骤：
1. 提交更改到 Git
2. 创建并推送标签
3. 在 GitHub 上创建 Release 并上传文件

## 📚 相关资源

- [GitHub Releases 文档](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [语义化版本规范](https://semver.org/)

