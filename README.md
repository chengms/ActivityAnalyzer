# 活动分析器 (Activity Analyzer)

电脑活动追踪与分析报告工具

## 功能特性

### 核心功能

- 📊 **实时追踪**：每 5 秒自动检测并记录活动窗口和应用切换
- 📈 **数据可视化**：饼图展示应用使用分布、排行列表、活动时间线
- 📄 **报告生成**：一键生成 Excel 和 HTML 格式的详细活动报告
- 💾 **数据存储**：SQLite 数据库持久化存储，支持历史数据查询
- 🔍 **数据分析**：按日期、应用统计使用时长和使用次数
- 📱 **应用排行**：自动统计和排序应用使用情况

### 详细功能

**追踪功能：**
- 自动识别当前活动应用（进程名）
- 记录活动窗口标题
- 精确记录开始/结束时间和持续时间
- 自动过滤小于 1 秒的短暂活动
- **可配置检测间隔**（1-60秒）

**后台运行：**
- 系统托盘支持，应用可在后台运行
- 最小化/关闭到托盘选项
- 双击托盘图标快速显示窗口
- 右键菜单快速访问功能

**自动启动：**
- 开机自启动功能（Windows）
- 启动时最小化选项
- 自动应用用户设置

**数据展示：**
- 日期选择器查看任意日期数据
- 汇总卡片显示总时长、应用数、记录数
- 饼图可视化应用使用时长分布
- 应用使用排行列表（带进度条）
- 活动时间线（最新 20 条记录）

**报告功能：**
- Excel 报告（3 个工作表：汇总、应用统计、详细记录）
- HTML 报告（美观的可视化报告）
- 自动保存到用户数据目录

## 技术栈

- **前端**：Electron + React + TypeScript
- **后端**：Node.js
- **数据库**：SQLite (better-sqlite3)
- **图表**：Chart.js + React-Chartjs-2

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 运行
npm start
```

## 项目结构

```
ActivityAnalyzer/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── main.ts        # 主进程入口，窗口管理和 IPC
│   │   └── preload.ts     # 预加载脚本，暴露安全 API
│   ├── renderer/          # React 前端界面
│   │   ├── App.tsx        # 主应用组件
│   │   ├── components/    # UI 组件
│   │   │   ├── ActivityChart.tsx      # 饼图组件
│   │   │   ├── AppUsageList.tsx        # 应用排行列表
│   │   │   └── ActivityTimeline.tsx    # 活动时间线
│   │   └── index.html     # HTML 入口
│   ├── tracker/           # 活动追踪模块
│   │   ├── tracker.ts     # 活动追踪器（Windows API）
│   │   └── database.ts    # 数据库操作（SQLite）
│   └── reporter/          # 报告生成模块
│       └── reporter.ts    # Excel/HTML 报告生成
├── database/              # SQLite 数据库文件（运行时生成）
├── reports/               # 生成的报告（运行时生成）
└── dist/                  # 构建输出
```

## 功能要点

详细的功能说明请查看 [FEATURES.md](./FEATURES.md)

**主要模块：**
1. **活动追踪模块** - 实时监控窗口和应用切换
2. **数据存储模块** - SQLite 数据库持久化
3. **数据分析模块** - 统计和汇总功能
4. **数据可视化模块** - 图表和列表展示
5. **报告生成模块** - Excel 和 HTML 报告

