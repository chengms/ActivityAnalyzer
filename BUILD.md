# 打包指南 - 生成 EXE 和安装包

## 📦 快速开始

### 1. 安装 electron-builder

```bash
npm install --save-dev electron-builder
```

### 2. 构建项目

```bash
# 先构建应用代码
npm run build
```

### 3. 打包应用

```bash
# 打包为当前平台的安装包
npm run dist

# 或者只打包不生成安装包（用于测试）
npm run pack
```

**⚠️ 如果遇到网络问题（无法从 GitHub 下载 Electron）：**

```powershell
# 使用打包脚本（自动配置国内镜像）
.\pack-with-mirror.ps1 dist:win:portable

# 或者手动设置环境变量
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"
npm run dist:win:portable
```

## 🎯 打包选项

### Windows

#### 生成 NSIS 安装包（推荐）

```bash
npm run dist:win
```

生成文件：
- `release/活动分析器 Setup 1.0.0.exe` - 安装程序
- `release/win-unpacked/` - 未打包的应用文件夹

#### 生成便携版（Portable）

```bash
npm run dist:win:portable
```

生成文件：
- `release/活动分析器-1.0.0.exe` - 单个可执行文件，无需安装

### 所有平台

```bash
# 打包所有平台（需要相应的构建环境）
npm run dist:all
```

## 📋 完整配置

### package.json 配置

已自动配置，包含以下内容：

```json
{
  "build": {
    "appId": "com.activityanalyzer.app",
    "productName": "活动分析器",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "package.json",
      "!node_modules/**/*"
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        },
        {
          "target": "portable",
          "arch": ["x64"]
        }
      ],
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "活动分析器"
    }
  }
}
```

## 🖼️ 图标准备

### 需要的图标文件

在 `build/` 目录下准备以下图标：

- `icon.ico` - Windows 图标（256x256，包含多个尺寸）
- `icon.png` - 通用图标（512x512）

### 创建图标

#### 方法 1: 在线工具

1. 访问 [ICO Convert](https://icoconvert.com/) 或 [CloudConvert](https://cloudconvert.com/png-to-ico)
2. 上传 512x512 的 PNG 图片
3. 下载生成的 ICO 文件
4. 保存到 `build/icon.ico`

#### 方法 2: 使用 ImageMagick

```bash
# 安装 ImageMagick
# Windows: choco install imagemagick
# macOS: brew install imagemagick

# 转换 PNG 为 ICO
magick convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

#### 方法 3: 使用在线图标生成器

访问 [Icon Generator](https://www.icongenerator.net/) 生成多尺寸图标。

## 🚀 详细步骤

### 步骤 1: 准备图标

```bash
# 创建 build 目录
mkdir build

# 将图标文件放入 build 目录
# build/icon.ico (Windows)
# build/icon.png (通用)
```

### 步骤 2: 安装依赖

```bash
npm install --save-dev electron-builder
```

### 步骤 3: 构建应用

```bash
npm run build
```

### 步骤 4: 打包

```bash
# 生成安装包
npm run dist

# 或生成便携版
npm run dist:win:portable
```

### 步骤 5: 查找输出文件

打包完成后，文件在 `release/` 目录：

```
release/
├── 活动分析器 Setup 1.0.0.exe    # NSIS 安装程序
├── 活动分析器-1.0.0.exe          # 便携版
└── win-unpacked/                  # 未打包的应用文件夹
```

## 🔧 高级配置

### 自定义安装程序

编辑 `package.json` 中的 `build.nsis` 配置：

```json
{
  "build": {
    "nsis": {
      "oneClick": false,                    // 允许用户选择安装目录
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,        // 创建桌面快捷方式
      "createStartMenuShortcut": true,      // 创建开始菜单快捷方式
      "shortcutName": "活动分析器",         // 快捷方式名称
      "installerIcon": "build/icon.ico",   // 安装程序图标
      "uninstallerIcon": "build/icon.ico", // 卸载程序图标
      "installerHeaderIcon": "build/icon.ico",
      "deleteAppDataOnUninstall": false     // 卸载时是否删除应用数据
    }
  }
}
```

### 代码签名（可选）

如果需要代码签名（避免 Windows 安全警告）：

```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/certificate.pfx",
      "certificatePassword": "password",
      "signingHashAlgorithms": ["sha256"],
      "sign": "path/to/signtool.exe"
    }
  }
}
```

## 📊 打包类型对比

| 类型 | 文件 | 优点 | 缺点 |
|------|------|------|------|
| **NSIS 安装包** | `.exe` | 标准安装流程，支持卸载 | 需要安装步骤 |
| **便携版** | `.exe` | 无需安装，直接运行 | 无法创建快捷方式 |
| **未打包文件夹** | 文件夹 | 便于调试 | 文件较多 |

## 🐛 常见问题

### 问题 1: 打包失败 - 找不到图标

**错误：** `Error: Application icon is not set`

**解决：**
1. 确保 `build/icon.ico` 文件存在
2. 检查图标文件路径是否正确
3. 如果暂时没有图标，可以注释掉 `icon` 配置

### 问题 1.1: 打包成功但 EXE 文件没有图标

**症状：** 打包成功，但生成的 EXE 文件显示默认图标而不是自定义图标

**可能原因：**
1. 图标文件格式不正确（可能只是重命名的 PNG，不是真正的 ICO）
2. 图标文件缺少必要的尺寸（需要包含 256, 128, 64, 48, 32, 16 像素）
3. electron-builder 缓存问题
4. Windows 图标缓存问题

**解决方案：**

```powershell
# 方法 1: 清理 electron-builder 缓存并重新打包（推荐）
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache" -ErrorAction SilentlyContinue
npm run build
npm run dist:win:portable
```

```powershell
# 方法 2: 清理 Windows 图标缓存
# 以管理员身份运行 PowerShell，然后执行：
ie4uinit.exe -show
# 或者重启资源管理器
Stop-Process -Name explorer -Force; Start-Process explorer
```

```powershell
# 方法 3: 确保图标文件是正确的 ICO 格式
# 使用在线工具重新生成 ICO 文件：
# 访问 https://icoconvert.com/ 上传 PNG，选择生成多尺寸 ICO
# 下载后替换 build/icon.ico
```

```powershell
# 方法 4: 检查图标文件是否包含多个尺寸
# 使用工具检查 ICO 文件（如 IcoFX、Greenfish Icon Editor Pro）
# 确保包含以下尺寸：256x256, 128x128, 64x64, 48x48, 32x32, 16x16
```

**验证方法：**
1. 打包后，检查 `release/win-unpacked/活动分析器.exe` 的图标
2. 如果 `win-unpacked` 中的 EXE 有图标，但便携版没有，可能是便携版打包问题
3. 尝试重新生成图标文件，确保是有效的多尺寸 ICO 格式

### 问题 1.2: EXE 文件显示错误的图标

**症状：** 打包后的 EXE 文件显示的不是预期的软件图标（可能显示为默认图标或其他图标）

**可能原因：**
1. 图标文件格式不正确或损坏
2. 图标文件没有包含所有必要的尺寸
3. electron-builder 缓存了旧的图标
4. Windows 图标缓存问题
5. 图标文件路径配置错误

**解决方案：**

```powershell
# 方法 1: 清理所有缓存并重新打包（最有效）
# 1. 清理 electron-builder 缓存
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache" -ErrorAction SilentlyContinue

# 2. 清理 Windows 图标缓存（需要管理员权限）
# 以管理员身份运行：
ie4uinit.exe -show
# 或者重启资源管理器
Stop-Process -Name explorer -Force; Start-Process explorer

# 3. 删除旧的打包文件
Remove-Item -Recurse -Force release\win-unpacked -ErrorAction SilentlyContinue
Remove-Item release\*.exe -ErrorAction SilentlyContinue

# 4. 重新构建和打包
npm run build
npm run dist:win:portable
```

```powershell
# 方法 2: 检查并重新生成图标文件
# 1. 确保图标文件是正确的 ICO 格式（不是重命名的 PNG）
# 2. 使用在线工具重新生成：
#    - 访问 https://icoconvert.com/
#    - 上传你的 PNG 图标（建议 512x512 或 1024x1024）
#    - 选择生成多尺寸 ICO（必须包含：256, 128, 64, 48, 32, 16）
#    - 下载并替换 build/icon.ico

# 3. 验证图标文件
# 在 Windows 中右键点击 icon.ico，选择"属性"，应该能看到图标预览
```

```powershell
# 方法 3: 检查图标文件是否被正确识别
# 在 PowerShell 中检查图标文件：
$icon = [System.Drawing.Icon]::ExtractAssociatedIcon("build\icon.ico")
if ($icon) {
    Write-Host "图标文件有效，尺寸: $($icon.Width)x$($icon.Height)"
} else {
    Write-Host "图标文件无效或无法读取"
}
```

```powershell
# 方法 4: 使用绝对路径指定图标（如果相对路径有问题）
# 在 package.json 中，将 "icon": "build/icon.ico" 改为绝对路径
# 或者确保 buildResources 配置正确指向 build 目录
```

**重要提示：**
- ICO 文件必须包含多个尺寸（至少 16x16, 32x32, 48x48, 256x256）
- 不要直接将 PNG 文件重命名为 ICO，必须使用工具转换
- 打包前确保 `build/icon.ico` 文件存在且有效
- 如果修改了图标文件，必须清理缓存后重新打包

### 问题 2: 打包文件太大

**原因：** 包含了不必要的文件

**解决：**
1. 检查 `files` 配置，排除不需要的文件
2. 使用 `asar` 打包（默认启用）
3. 排除开发依赖

### 问题 3: 打包失败 - 网络连接错误（无法下载 Electron）

**错误信息：**
```
⨯ Get "https://github.com/electron/electron/releases/download/v28.3.3/electron-v28.3.3-win32-x64.zip": read tcp ... wsarecv: A connection attempt failed
```

**原因：** 无法从 GitHub 下载 Electron ZIP 文件（网络问题，常见于中国大陆）

**解决方案：**

```powershell
# 方法 1: 使用打包脚本（推荐，最简单）
# 脚本会自动设置国内镜像
.\pack-with-mirror.ps1 dist:win:portable
```

```powershell
# 方法 2: 手动设置环境变量后打包
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"
npm run dist:win:portable
```

```powershell
# 方法 3: 使用代理（如果有）
$env:HTTP_PROXY = "http://127.0.0.1:7890"
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
npm run dist:win:portable
```

### 问题 4: 打包失败 - 无法创建符号链接（权限错误）

**错误信息：**
```
ERROR: Cannot create symbolic link : 客户端没有所需的特权
ERROR: Cannot create symbolic link : ...\darwin\10.12\lib\libcrypto.dylib
```

**原因：** Windows 上创建符号链接需要管理员权限，winCodeSign 工具解压时失败

**解决方案：**

```powershell
# 方法 1: 使用打包脚本（推荐，已自动禁用代码签名）
# 脚本已设置 CSC_IDENTITY_AUTO_DISCOVERY=false 和 forceCodeSigning: false
.\pack-with-mirror.ps1 dist:win:portable
```

```powershell
# 方法 1.1: 手动设置环境变量禁用代码签名
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run dist:win:portable
```

```powershell
# 方法 2: 以管理员身份运行 PowerShell
# 右键点击 PowerShell，选择"以管理员身份运行"
# 然后运行打包命令
.\pack-with-mirror.ps1 dist:win:portable
```

```powershell
# 方法 3: 启用 Windows 开发者模式（允许非管理员创建符号链接）
# 设置 -> 更新和安全 -> 开发者选项 -> 启用"开发人员模式"
# 然后重新打包
.\pack-with-mirror.ps1 dist:win:portable
```

### 问题 5: 打包失败 - ZIP 文件错误

**错误信息：**
```
⨯ zip: not a valid zip file
⨯ app-builder.exe process failed ERR_ELECTRON_BUILDER_CANNOT_EXECUTE
```

**原因：** app-builder-bin 的二进制文件损坏或下载不完整

**解决方案：**

```powershell
# 方法 1: 清理所有缓存并重新安装（推荐，最彻底）
# 清理 electron-builder 缓存
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder" -ErrorAction SilentlyContinue
# 清理 Electron 缓存
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron\Cache" -ErrorAction SilentlyContinue
# 清理嵌套的 app-builder-bin
Remove-Item -Recurse -Force "node_modules\builder-util\node_modules\app-builder-bin" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules\app-builder-bin" -ErrorAction SilentlyContinue
# 清理 npm 缓存
npm cache clean --force
# 重新安装相关依赖
npm install builder-util@latest --save-dev
npm install electron-builder@latest --save-dev

# 然后重新尝试打包
npm run pack
```

```powershell
# 方法 2: 完全重新安装（如果方法 1 无效）
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder" -ErrorAction SilentlyContinue
npm cache clean --force
npm install
```

```powershell
# 方法 2.1: 清理 builder-util 中的嵌套依赖（如果错误路径指向 builder-util）
Remove-Item -Recurse -Force "node_modules\builder-util\node_modules\app-builder-bin" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules\app-builder-bin" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder" -ErrorAction SilentlyContinue
npm cache clean --force
npm install builder-util@latest --save-dev
npm install electron-builder@latest --save-dev
```

```powershell
# 方法 3: 使用网络代理或镜像（如果网络问题）
npm config set registry https://registry.npmmirror.com
npm install electron-builder@latest --save-dev
```

### 问题 4: 运行打包后的应用报错 - Cannot find module 'better-sqlite3'

**错误信息：**
```
Error: Cannot find module 'better-sqlite3'
```

**原因：** better-sqlite3 是 native 模块，不能被打包到 asar 中，需要特殊处理

**解决方案：**

```powershell
# 方法 1: 重新构建 native 模块并打包（推荐）
npm run rebuild
npm run build
.\pack-with-mirror.ps1 dist:win:portable
```

**配置说明：**
已在 `package.json` 中配置 `asarUnpack`，将 better-sqlite3 从 asar 中排除：
```json
{
  "build": {
    "asarUnpack": [
      "**/node_modules/better-sqlite3/**/*",
      "**/node_modules/active-win/**/*"
    ]
  }
}
```

如果问题仍然存在，检查：
1. `node_modules/better-sqlite3/build/Release/better_sqlite3.node` 是否存在
2. 是否已运行 `npm run rebuild`
3. 打包时是否包含了 native 模块文件

### 问题 4: Windows Defender 报毒

**原因：** 未签名的应用可能被误报

**解决：**
1. 申请代码签名证书
2. 配置代码签名
3. 或提交到 Windows Defender 白名单

## 📝 发布检查清单

- [ ] 更新 `package.json` 中的版本号
- [ ] 运行 `npm run build` 确保构建成功
- [ ] 测试构建后的应用 (`npm start`)
- [ ] 准备图标文件 (`build/icon.ico`)
- [ ] 运行 `npm run dist` 打包
- [ ] 测试安装程序
- [ ] 测试卸载程序
- [ ] 检查文件大小是否合理
- [ ] 在干净的 Windows 系统上测试安装

## 🎁 分发应用

### 方式 1: 直接分发

将 `release/活动分析器 Setup 1.0.0.exe` 分发给用户。

### 方式 2: 使用更新服务器

如果配置了 `electron-updater`，可以设置自动更新：

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-username",
      "repo": "activity-analyzer"
    }
  }
}
```

## 📚 相关资源

- [electron-builder 文档](https://www.electron.build/)
- [NSIS 文档](https://nsis.sourceforge.io/Docs/)
- [图标生成工具](https://www.icongenerator.net/)

