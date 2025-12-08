# 数据文件保存位置说明

## 📁 Release 版本文件保存位置

在打包后的 release 版本中，所有数据文件都保存在 **用户数据目录** 中。

### Windows 系统

**用户数据目录路径：**
```
%APPDATA%\活动分析器
```
或完整路径：
```
C:\Users\<用户名>\AppData\Roaming\活动分析器
```

### 文件结构

```
活动分析器/
├── activity.db              # 数据库文件（所有活动记录）
├── settings.json            # 应用设置文件
├── logs/                    # 日志目录
│   ├── app-2025-12-08.log   # 当日日志文件
│   ├── app-2025-12-07.log   # 历史日志文件
│   └── ...                  # 最多保留 5 个日志文件
└── reports/                 # 报告目录
    ├── report-2025-12-08.html
    ├── report-2025-12-08.xlsx
    └── ...
```

## 📋 各文件说明

### 1. 数据库文件

**路径：** `%APPDATA%\活动分析器\activity.db`

**说明：**
- SQLite 数据库文件
- 存储所有活动记录数据
- 包含应用使用时间、窗口标题、时间戳等信息

**查看方法：**
- 使用 SQLite 工具（如 DB Browser for SQLite）打开
- 或使用命令行：`sqlite3 activity.db`

### 2. 日志文件

**路径：** `%APPDATA%\活动分析器\logs\app-YYYY-MM-DD.log`

**说明：**
- 按日期命名的日志文件
- 记录应用的运行日志、错误信息、警告等
- 在 release 版本中，只记录 WARN 和 ERROR 级别
- 单个日志文件最大 10MB，超过后自动轮转
- 最多保留 5 个历史日志文件

**查看方法：**
```powershell
# 查看最新日志
Get-Content "$env:APPDATA\活动分析器\logs\app-$(Get-Date -Format 'yyyy-MM-dd').log" -Tail 50

# 查看所有错误
Get-Content "$env:APPDATA\活动分析器\logs\app-*.log" | Select-String "ERROR"
```

### 3. 设置文件

**路径：** `%APPDATA%\活动分析器\settings.json`

**说明：**
- JSON 格式的配置文件
- 存储应用的所有设置项：
  - `checkInterval`: 检测间隔（毫秒）
  - `autoStart`: 开机自启动
  - `startMinimized`: 启动时最小化
  - `minimizeToTray`: 最小化到托盘
  - `closeToTray`: 关闭到托盘
  - `debugMode`: 调试模式

**查看/编辑：**
- 可以用文本编辑器打开查看
- 修改后需要重启应用生效

### 4. 报告文件

**路径：** `%APPDATA%\活动分析器\reports\`

**说明：**
- 生成的 HTML 和 Excel 报告文件
- 文件名格式：`report-YYYY-MM-DD.html` 和 `report-YYYY-MM-DD.xlsx`

## 🔍 快速访问方法

### 方法 1: 通过应用设置查看

在应用设置界面中，可以查看日志文件路径（如果已实现此功能）。

### 方法 2: 通过 Windows 资源管理器

1. 按 `Win + R` 打开运行对话框
2. 输入：`%APPDATA%\活动分析器`
3. 按回车打开文件夹

### 方法 3: 通过 PowerShell

```powershell
# 打开用户数据目录
explorer "$env:APPDATA\活动分析器"

# 查看数据库文件
Test-Path "$env:APPDATA\活动分析器\activity.db"

# 查看日志目录
Get-ChildItem "$env:APPDATA\活动分析器\logs"

# 查看报告目录
Get-ChildItem "$env:APPDATA\活动分析器\reports"
```

## 📊 数据备份

### 备份所有数据

```powershell
# 创建备份目录
$backupDir = "D:\Backup\活动分析器-$(Get-Date -Format 'yyyy-MM-dd')"
New-Item -ItemType Directory -Path $backupDir -Force

# 复制所有文件
Copy-Item "$env:APPDATA\活动分析器\*" -Destination $backupDir -Recurse -Force

Write-Host "备份完成: $backupDir" -ForegroundColor Green
```

### 只备份数据库

```powershell
Copy-Item "$env:APPDATA\活动分析器\activity.db" -Destination "D:\Backup\activity-$(Get-Date -Format 'yyyy-MM-dd').db"
```

## 🗑️ 清理数据

### 清理日志文件

日志文件会自动清理，但也可以手动删除：

```powershell
Remove-Item "$env:APPDATA\活动分析器\logs\app-*.log" -Force
```

### 清理报告文件

```powershell
Remove-Item "$env:APPDATA\活动分析器\reports\*" -Force
```

### 重置所有数据（危险操作）

```powershell
# 删除整个用户数据目录（会丢失所有数据）
Remove-Item "$env:APPDATA\活动分析器" -Recurse -Force
```

## ⚠️ 注意事项

1. **不要手动修改数据库文件**：可能导致数据损坏
2. **备份重要数据**：定期备份 `activity.db` 文件
3. **日志文件会自动清理**：超过 5 个或超过 10MB 会自动删除
4. **卸载应用不会删除数据**：需要手动删除用户数据目录

## 🔧 开发模式 vs Release 模式

### 开发模式（npm start）

**数据文件位置：** 与 Release 模式完全相同
- 路径：`%APPDATA%\活动分析器`
- 数据库：`activity.db`
- 日志：`logs\app-YYYY-MM-DD.log`
- 设置：`settings.json`
- 报告：`reports\`

### Release 模式（打包后的 .exe）

**数据文件位置：** 与开发模式完全相同
- 路径：`%APPDATA%\活动分析器`
- 数据库：`activity.db`
- 日志：`logs\app-YYYY-MM-DD.log`
- 设置：`settings.json`
- 报告：`reports\`

### 重要说明

✅ **开发模式和 Release 模式使用相同的数据文件路径**

这意味着：
- 在开发模式下测试时，数据会保存到相同的位置
- 打包后的 release 版本可以访问开发模式下创建的数据
- 卸载应用不会删除数据（需要手动删除）

**区别：**
- **日志级别：**
  - 开发模式：记录所有级别（DEBUG, INFO, WARN, ERROR）
  - Release 模式：只记录 WARN 和 ERROR 级别（减少日志文件大小）

- **日志输出：**
  - 开发模式：同时输出到控制台和文件
  - Release 模式：只输出到文件

