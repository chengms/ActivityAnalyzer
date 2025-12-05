# Release 版本发布指南

## 📦 构建 Release 版本

### 1. 安装依赖

```bash
npm install
```

### 2. 构建项目

```bash
# 构建主进程和渲染进程
npm run build
```

### 3. 测试构建结果

```bash
# 运行构建后的应用
npm start
```

## 📝 日志系统

### 日志位置

Release 版本的日志文件保存在：
- **Windows**: `%APPDATA%\活动分析器\logs\app-YYYY-MM-DD.log`
- **macOS**: `~/Library/Application Support/活动分析器/logs/app-YYYY-MM-DD.log`
- **Linux**: `~/.config/活动分析器/logs/app-YYYY-MM-DD.log`

### 日志级别

在 Release 版本中，系统会自动记录：
- ✅ **ERROR** - 所有错误日志
- ✅ **WARN** - 所有警告日志
- ❌ **INFO** - 仅在开发模式记录
- ❌ **DEBUG** - 仅在开发模式记录

### 日志文件管理

- 每个日志文件最大 **10MB**
- 自动保留最近 **5个** 日志文件
- 超过大小限制时自动轮转
- 旧日志文件自动清理

### 查看日志

#### Windows PowerShell:
```powershell
# 查看日志目录
$logDir = "$env:APPDATA\活动分析器\logs"
Get-ChildItem $logDir

# 查看最新日志
Get-Content "$logDir\app-$(Get-Date -Format 'yyyy-MM-dd').log" -Tail 50

# 查看所有错误
Get-Content "$logDir\app-*.log" | Select-String "ERROR"
```

#### Windows CMD:
```cmd
REM 查看日志目录
dir "%APPDATA%\活动分析器\logs"

REM 查看最新日志（需要安装 PowerShell 或使用其他工具）
type "%APPDATA%\活动分析器\logs\app-2025-12-05.log"
```

## 🔧 打包为可执行文件（可选）

如果需要打包为独立的可执行文件，可以使用 `electron-builder`：

### 1. 安装 electron-builder

```bash
npm install --save-dev electron-builder
```

### 2. 配置 package.json

在 `package.json` 中添加：

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
      "package.json"
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "assets/icon.png"
    }
  }
}
```

### 3. 添加构建脚本

在 `package.json` 的 `scripts` 中添加：

```json
{
  "scripts": {
    "pack": "electron-builder --dir",
    "dist": "electron-builder"
  }
}
```

### 4. 构建

```bash
# 构建当前平台
npm run dist

# 构建所有平台（需要配置）
npm run dist -- --win --mac --linux
```

## 🐛 调试 Release 版本

### 方法 1: 查看日志文件

日志文件包含所有错误和警告信息，可以直接查看。

### 方法 2: 启用调试模式

在设置中启用"调试模式"，会自动打开开发者工具。

### 方法 3: 命令行参数

```bash
# 启用日志输出到控制台
npm start -- --enable-logging

# 打开开发者工具
npm start -- --devtools
```

## 📋 发布检查清单

- [ ] 运行 `npm run build` 确保构建成功
- [ ] 运行 `npm start` 测试应用功能
- [ ] 检查日志文件是否正确生成
- [ ] 测试错误场景，确认日志记录正常
- [ ] 检查日志文件大小和轮转功能
- [ ] 确认日志目录权限正确
- [ ] 测试在不同操作系统上的日志路径

## 🔍 常见问题

### Q: 日志文件没有生成？

**A:** 检查：
1. 应用是否有写入权限
2. 用户数据目录是否正确
3. 查看控制台是否有错误信息

### Q: 日志文件太大？

**A:** 系统会自动轮转日志文件，每个文件最大 10MB，保留最近 5 个文件。

### Q: 如何查看特定日期的日志？

**A:** 日志文件按日期命名：`app-YYYY-MM-DD.log`，直接打开对应日期的文件即可。

### Q: 如何清除所有日志？

**A:** 删除日志目录即可，系统会在下次启动时自动创建：
- Windows: `%APPDATA%\活动分析器\logs`
- macOS: `~/Library/Application Support/活动分析器/logs`
- Linux: `~/.config/活动分析器/logs`

## 📚 相关文件

- `src/main/logger.ts` - 日志系统实现
- `src/main/main.ts` - 主进程入口（使用 logger）
- `package.json` - 构建配置

