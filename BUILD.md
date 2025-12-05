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

### 问题 2: 打包文件太大

**原因：** 包含了不必要的文件

**解决：**
1. 检查 `files` 配置，排除不需要的文件
2. 使用 `asar` 打包（默认启用）
3. 排除开发依赖

### 问题 3: 运行打包后的应用报错

**可能原因：**
1. 缺少 native 模块（如 better-sqlite3）
2. 路径问题

**解决：**
```bash
# 重新构建 native 模块
npm run rebuild

# 重新打包
npm run build
npm run dist
```

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

