# 活动分析器 (Activity Analyzer)

一个基于 Electron 的电脑活动追踪与分析工具，帮助您了解自己的时间使用情况。

## ✨ 主要功能

- 📊 **实时追踪**：自动检测并记录活动窗口和应用切换（可配置检测间隔 1-60 秒）
- 📈 **数据可视化**：饼图展示应用使用分布、排行列表、详细时间线
- 📄 **报告生成**：一键生成 Excel 和 HTML 格式的详细活动报告
- 💾 **数据持久化**：SQLite 数据库存储，支持历史数据查询和分析
- 🔍 **数据分析**：按日期、应用统计使用时长和使用次数
- 🎯 **后台运行**：系统托盘支持，最小化到托盘，开机自启动
- ⚙️ **灵活配置**：可自定义数据存储路径、日志路径、报告路径

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 运行应用

#### 开发模式（推荐用于开发）

```bash
# 同时启动主进程和渲染进程（支持热重载）
npm run dev

# 然后在另一个终端运行应用
npm start
```

#### 生产模式（推荐用于测试）

```bash
# 先构建项目
npm run build

# 然后运行
npm start
```

#### 使用启动脚本（Windows）

双击 `start-app.bat` 文件，脚本会自动检查依赖并启动应用。

### 打包应用

```bash
# 使用打包脚本（自动配置国内镜像，推荐）
.\pack-with-mirror.ps1 dist:win:portable

# 或手动打包
npm run build
npm run dist:win:portable
```

打包后的可执行文件位于 `release/` 目录。

## 📖 文档

- **[功能说明](./FEATURES.md)** - 详细的功能列表和技术实现
- **[开发指南](./DEVELOPMENT.md)** - 开发模式、构建、调试说明
- **[运行指南](./RUN.md)** - 如何运行应用、常见问题
- **[打包指南](./BUILD.md)** - 如何打包应用、生成安装包
- **[故障排除](./TROUBLESHOOTING.md)** - 常见问题及解决方案
- **[数据位置](./DATA_LOCATION.md)** - 数据文件保存位置说明

## 🏗️ 项目结构

```
ActivityAnalyzer/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── main.ts        # 主进程入口，窗口管理和 IPC
│   │   ├── preload.ts     # 预加载脚本，暴露安全 API
│   │   ├── logger.ts      # 日志管理
│   │   └── autoLauncher.ts # 开机自启动管理
│   ├── renderer/          # React 前端界面
│   │   ├── App.tsx        # 主应用组件
│   │   ├── components/    # UI 组件
│   │   │   ├── ActivityChart.tsx      # 饼图组件
│   │   │   ├── AppUsageList.tsx        # 应用排行列表
│   │   │   ├── ActivityTimeline.tsx    # 活动时间线
│   │   │   ├── TimelineDetail.tsx      # 详细时间线
│   │   │   ├── Settings.tsx            # 设置界面
│   │   │   └── ...                     # 其他组件
│   │   └── index.html     # HTML 入口
│   ├── tracker/           # 活动追踪模块
│   │   ├── tracker.ts     # 活动追踪器（Windows API）
│   │   └── database.ts   # 数据库操作（SQLite）
│   ├── reporter/          # 报告生成模块
│   │   └── reporter.ts   # Excel/HTML 报告生成
│   └── settings/          # 设置管理模块
│       └── settings.ts    # 设置存储和管理
├── build/                 # 构建资源（图标等）
├── dist/                  # 构建输出（编译后的代码）
├── release/               # 打包输出（.exe 文件）
└── package.json           # 项目配置
```

## 🛠️ 技术栈

- **框架**：Electron 28.3.3
- **前端**：React 18 + TypeScript 5
- **构建工具**：Vite 5
- **数据库**：SQLite (better-sqlite3)
- **图表**：Chart.js + React-Chartjs-2
- **打包工具**：electron-builder

## 📋 主要特性

### 活动追踪
- 自动识别当前活动应用（进程名）
- 记录活动窗口标题
- 精确记录开始/结束时间和持续时间
- 自动过滤小于 1 秒的短暂活动
- 可配置检测间隔（1-60 秒）

### 数据展示
- 日期选择器查看任意日期数据
- 汇总卡片显示总时长、应用数、记录数
- 饼图可视化应用使用时长分布
- 应用使用排行列表（带进度条）
- 活动时间线（支持正序/倒序、时间段筛选）

### 报告功能
- Excel 报告（3 个工作表：汇总、应用统计、详细记录）
- HTML 报告（美观的可视化报告）
- 支持单日报告和日期范围报告

### 系统集成
- 系统托盘支持，应用可在后台运行
- 最小化/关闭到托盘选项
- 开机自启动功能（Windows）
- 启动时最小化选项

### 数据管理
- 可配置数据存储路径（数据库、日志、报告）
- 支持数据迁移（更改路径时自动移动文件）
- SQLite 数据库持久化存储

## 🔧 开发

### 开发模式

```bash
# 同时运行主进程和渲染进程（支持热重载）
npm run dev

# 然后在另一个终端运行应用
npm start
```

### 构建项目

```bash
# 构建主进程和渲染进程
npm run build

# 只构建主进程
npm run build:main

# 只构建渲染进程
npm run build:renderer
```

### 运行构建后的应用

```bash
npm start
```

## 📦 打包

### 快速打包（推荐）

```bash
# 使用打包脚本（自动配置国内镜像，智能清理）
.\pack-with-mirror.ps1 dist:win:portable
```

### 手动打包

```bash
# 先构建
npm run build

# 然后打包
npm run dist:win:portable
```

更多打包选项和问题排查，请查看 [BUILD.md](./BUILD.md)。

## 🚀 发布到 GitHub Releases

将编译好的可执行文件发布到 GitHub Releases：

### 快速发布（推荐）

```powershell
# 使用发布脚本（自动更新版本号、打包、检查文件）
.\publish-release.ps1 -Version "1.0.0"
```

然后按照脚本提示完成 Git 操作和 GitHub Release 创建。

### 手动发布

1. **打包应用**：`.\pack-with-mirror.ps1 dist:win:portable`
2. **创建 Release**：在 GitHub 仓库页面创建新的 Release
3. **上传文件**：上传 `release/活动分析器-1.0.0.exe` 文件

详细说明请查看 [RELEASE.md](./RELEASE.md)。

## 📁 数据文件位置

所有数据文件保存在用户数据目录：

**Windows：** `%APPDATA%\活动分析器`

包含：
- `activity.db` - SQLite 数据库（所有活动记录）
- `settings.json` - 应用设置
- `logs/` - 日志文件目录
- `reports/` - 生成的报告目录

详细说明请查看 [DATA_LOCATION.md](./DATA_LOCATION.md)。

## ⚙️ 配置

### 应用设置

在应用内通过设置界面可以配置：
- 检测间隔（1-60 秒）
- 开机自启动
- 启动时最小化
- 窗口行为（最小化到托盘、关闭到托盘）
- 数据存储路径（数据库、日志、报告）

### 环境变量（打包时）

```powershell
# 使用国内镜像（已集成到打包脚本中）
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"
```

## 🐛 故障排除

### 常见问题

1. **应用无法启动**
   - 检查是否安装了依赖：`npm install`
   - 检查 better-sqlite3 是否编译成功：`npm run rebuild`

2. **打包失败**
   - 使用打包脚本：`.\pack-with-mirror.ps1 dist:win:portable`
   - 检查网络连接（需要下载 Electron）
   - 查看 [BUILD.md](./BUILD.md) 中的详细说明

3. **数据文件位置**
   - 查看 [DATA_LOCATION.md](./DATA_LOCATION.md)

更多问题请查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)。

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 相关文档

- [功能说明](./FEATURES.md) - 详细功能列表
- [开发指南](./DEVELOPMENT.md) - 开发相关说明
- [运行指南](./RUN.md) - 运行应用说明
- [打包指南](./BUILD.md) - 打包和发布说明
- [发布指南](./RELEASE.md) - GitHub Releases 发布说明
- [故障排除](./TROUBLESHOOTING.md) - 常见问题解决
- [数据位置](./DATA_LOCATION.md) - 数据文件说明
