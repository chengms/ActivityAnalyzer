# 故障排除指南

## 🔧 常见问题及解决方案

### 问题 1: Electron 安装失败

**错误信息：**
```
Error: Electron failed to install correctly, please delete node_modules/electron and try installing again
```

**解决方案：**

```bash
# 方法 1: 删除并重新安装
Remove-Item -Recurse -Force node_modules\electron
npm install electron --save-dev

# 方法 2: 清理并重新安装所有依赖
Remove-Item -Recurse -Force node_modules
npm install

# 方法 3: 使用国内镜像（如果网络问题）
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
npm install electron --save-dev
```

---

### 问题 2: better-sqlite3 模块版本不匹配

**错误信息：**
```
The module was compiled against a different Node.js version using
NODE_MODULE_VERSION 137. This version of Node.js requires
NODE_MODULE_VERSION 119.
```

**原因：**
better-sqlite3 是针对系统 Node.js 编译的，但 Electron 使用自己的 Node.js 版本。

**解决方案：**

```bash
# 方法 1: 使用 electron-rebuild（推荐）
npm install --save-dev electron-rebuild
npx electron-rebuild -f -w better-sqlite3

# 方法 2: 使用 postinstall 脚本（自动重建）
# 已在 package.json 中添加 postinstall 脚本
npm install

# 方法 3: 手动重建
npm run rebuild
```

**注意：** 每次更新 Electron 或 better-sqlite3 后，都需要重新运行 electron-rebuild。

---

### 问题 3: 应用无法启动

**检查清单：**

1. **检查构建文件**
   ```bash
   Test-Path dist\main\main.js
   Test-Path dist\renderer\index.html
   ```

2. **重新构建**
   ```bash
   npm run build
   ```

3. **检查 Electron**
   ```bash
   Test-Path node_modules\electron\dist\electron.exe
   ```

4. **查看错误日志**
   - 在终端中运行 `npm start` 查看详细错误

---

### 问题 4: 资源加载失败

**症状：** 窗口显示但页面空白

**解决方案：**

1. 检查 `vite.config.ts` 中是否有 `base: './'`
2. 重新构建渲染进程：
   ```bash
   npm run build:renderer
   ```
3. 检查 `dist/renderer/index.html` 中的路径是否为相对路径

---

### 问题 5: 活动追踪不工作

**检查清单：**

1. **确保在 Windows 系统上**
   - 当前版本仅支持 Windows

2. **检查 PowerShell**
   ```bash
   powershell -Command "Get-Process"
   ```

3. **查看控制台错误**
   - 打开开发者工具查看错误信息

4. **检查权限**
   - 某些功能可能需要管理员权限

---

### 问题 6: 系统托盘图标不显示

**原因：**
- 没有图标文件
- 图标路径错误

**解决方案：**

1. **创建图标文件**
   - 在 `assets/icon.png` 放置 16x16 或 32x32 的图标
   - 或使用在线工具生成图标

2. **检查代码**
   - 查看 `src/main/main.ts` 中的 `createTray()` 函数
   - 确认图标路径正确

3. **临时方案**
   - 即使没有图标，应用仍可在后台运行
   - 检查任务管理器中的进程

---

### 问题 7: 设置无法保存

**检查清单：**

1. **检查文件权限**
   - 确保应用有写入权限

2. **检查路径**
   - 设置文件位置：`{userData}/settings.json`
   - 查看控制台错误信息

3. **手动检查**
   ```bash
   # 查看用户数据目录
   echo %APPDATA%\activity-analyzer
   ```

---

### 问题 8: 开机自启动不工作

**检查清单：**

1. **检查注册表**
   ```bash
   reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "activity-analyzer"
   ```

2. **检查权限**
   - 某些情况下需要管理员权限

3. **手动测试**
   - 重启电脑验证是否自动启动

---

## 🛠️ 通用修复步骤

### 完全重置

如果遇到无法解决的问题，可以尝试完全重置：

```bash
# 1. 停止所有相关进程
Get-Process | Where-Object {$_.ProcessName -like "*electron*" -or $_.ProcessName -like "*node*"} | Stop-Process -Force

# 2. 删除 node_modules 和构建文件
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force dist

# 3. 清理 npm 缓存
npm cache clean --force

# 4. 重新安装
npm install

# 5. 重新构建
npm run build
```

---

## 📞 获取帮助

如果问题仍然存在：

1. **查看日志**
   - 运行 `npm start` 查看控制台输出
   - 检查开发者工具中的错误

2. **检查文档**
   - `README.md` - 项目说明
   - `RUN.md` - 运行指南
   - `QUICK_TEST.md` - 测试指南

3. **常见错误代码**
   - 记录完整的错误信息
   - 包括堆栈跟踪

---

## ✅ 预防措施

1. **定期更新依赖**
   ```bash
   npm update
   ```

2. **保持构建文件最新**
   ```bash
   npm run build
   ```

3. **检查 Node.js 版本**
   - 推荐使用 Node.js 18+ 或 20+

4. **使用启动脚本**
   - `start-app.bat` 会自动检查并修复常见问题

---

**最后更新：** 2024-12-02

