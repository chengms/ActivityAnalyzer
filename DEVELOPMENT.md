# 开发指南

## 🚀 运行模式

### 开发者模式（Development Mode）

开发者模式支持热重载，代码修改后自动重新编译。

#### 方法 1: 同时运行主进程和渲染进程（推荐）

```bash
npm run dev
```

这会同时启动：
- 主进程 TypeScript 编译器（监听模式）
- 渲染进程 Vite 开发服务器（热重载）

#### 方法 2: 分别运行

**终端 1 - 主进程：**
```bash
npm run dev:main
```

**终端 2 - 渲染进程：**
```bash
npm run dev:renderer
```

然后在**终端 3**运行应用：
```bash
npm start
```

### Release 版本（生产模式）

Release 版本是优化后的生产构建，用于测试和发布。

#### 步骤 1: 构建项目

```bash
npm run build
```

这会：
- 编译主进程 TypeScript 代码 → `dist/main/`
- 构建渲染进程 React 应用 → `dist/renderer/`

#### 步骤 2: 运行构建后的应用

```bash
npm start
```

## 📊 两种模式的区别

| 特性 | 开发者模式 | Release 版本 |
|------|-----------|-------------|
| **编译速度** | 快速（增量编译） | 较慢（完整构建） |
| **热重载** | ✅ 支持 | ❌ 不支持 |
| **代码优化** | ❌ 未优化 | ✅ 已优化 |
| **代码压缩** | ❌ 未压缩 | ✅ 已压缩 |
| **Source Maps** | ✅ 完整 | ⚠️ 可选 |
| **日志级别** | 全部（DEBUG/INFO/WARN/ERROR） | 仅 WARN/ERROR |
| **开发者工具** | 自动打开（如果启用调试模式） | 需手动启用 |
| **性能** | 较慢 | 更快 |

## 🔧 开发模式详细说明

### 主进程开发（`npm run dev:main`）

- 使用 TypeScript 编译器监听模式
- 文件修改后自动重新编译
- 输出到 `dist/main/`
- 需要手动重启应用才能看到主进程的更改

### 渲染进程开发（`npm run dev:renderer`）

- 使用 Vite 开发服务器
- 支持热模块替换（HMR）
- 自动在浏览器中打开（如果配置了）
- 代码修改后立即生效，无需重启

### 完整开发流程

1. **启动开发服务器：**
   ```bash
   npm run dev
   ```

2. **在另一个终端运行应用：**
   ```bash
   npm start
   ```

3. **修改代码：**
   - 修改 `src/renderer/` 下的文件 → 自动热重载
   - 修改 `src/main/` 下的文件 → 自动重新编译，需要重启应用

4. **查看日志：**
   - 开发者模式：控制台输出所有日志
   - Release 版本：日志文件在 `%APPDATA%\活动分析器\logs\`

## 🐛 调试技巧

### 开发者模式调试

1. **打开开发者工具：**
   - 在设置中启用"调试模式"
   - 或按 `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (macOS)

2. **查看控制台：**
   - 所有 `console.log` 都会显示
   - 错误堆栈信息完整

3. **使用 React DevTools：**
   - 安装 React DevTools 浏览器扩展
   - 在开发者工具中查看组件树

### Release 版本调试

1. **查看日志文件：**
   ```powershell
   # Windows PowerShell
   Get-Content "$env:APPDATA\活动分析器\logs\app-$(Get-Date -Format 'yyyy-MM-dd').log" -Tail 50
   ```

2. **启用调试模式：**
   - 在设置中启用"调试模式"
   - 会自动打开开发者工具

3. **命令行参数：**
   ```bash
   # 启用日志输出到控制台
   npm start -- --enable-logging
   
   # 打开开发者工具
   npm start -- --devtools
   ```

## 📝 常见工作流程

### 日常开发

```bash
# 1. 启动开发模式
npm run dev

# 2. 在另一个终端运行应用
npm start

# 3. 修改代码，自动重新编译/热重载
# 4. 测试功能
```

### 测试 Release 版本

```bash
# 1. 构建项目
npm run build

# 2. 运行构建后的应用
npm start

# 3. 测试功能，查看日志文件
```

### 发布前检查

```bash
# 1. 清理旧的构建文件
rm -rf dist  # Linux/macOS
# 或
Remove-Item -Recurse -Force dist  # Windows PowerShell

# 2. 完整构建
npm run build

# 3. 测试运行
npm start

# 4. 检查日志文件
# 5. 测试所有功能
```

## ⚠️ 注意事项

### 开发者模式

- ✅ 适合日常开发
- ✅ 修改渲染进程代码立即生效
- ⚠️ 修改主进程代码需要重启应用
- ⚠️ 性能较慢，不适合性能测试

### Release 版本

- ✅ 适合性能测试
- ✅ 适合最终测试
- ✅ 适合发布
- ⚠️ 代码修改后需要重新构建
- ⚠️ 调试信息较少

## 🔍 故障排除

### 问题 1: 开发模式无法启动

**症状：** `npm run dev` 报错

**解决：**
```bash
# 检查端口是否被占用
netstat -ano | findstr :3000  # Windows
lsof -i :3000  # macOS/Linux

# 清理并重新安装依赖
rm -rf node_modules
npm install
```

### 问题 2: 热重载不工作

**症状：** 修改代码后页面不更新

**解决：**
1. 检查浏览器控制台是否有错误
2. 尝试硬刷新：`Ctrl+Shift+R` (Windows/Linux) / `Cmd+Shift+R` (macOS)
3. 重启开发服务器

### 问题 3: 构建失败

**症状：** `npm run build` 报错

**解决：**
```bash
# 清理构建目录
rm -rf dist

# 重新构建
npm run build

# 检查 TypeScript 错误
npm run build:main

# 检查 Vite 构建错误
npm run build:renderer
```

## 📚 相关文件

- `package.json` - 脚本配置
- `tsconfig.main.json` - 主进程 TypeScript 配置
- `vite.config.ts` - 渲染进程 Vite 配置
- `RELEASE.md` - Release 版本发布指南

