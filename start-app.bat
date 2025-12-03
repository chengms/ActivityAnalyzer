@echo off
chcp 65001 >nul
echo ========================================
echo   活动分析器 - 启动脚本
echo ========================================
echo.

cd /d %~dp0

echo 检查依赖...
if not exist "node_modules" (
    echo 正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo 依赖安装失败！
        pause
        exit /b 1
    )
)

echo 检查 Electron...
if not exist "node_modules\electron\dist\electron.exe" (
    echo Electron 未正确安装，正在重新安装...
    call npm install electron --save-dev
    if errorlevel 1 (
        echo Electron 安装失败！
        echo 请检查网络连接或手动运行: npm install electron --save-dev
        pause
        exit /b 1
    )
)

echo 检查 better-sqlite3 模块...
if not exist "node_modules\better-sqlite3\build\Release\better_sqlite3.node" (
    echo better-sqlite3 需要为 Electron 重新编译...
    call npx electron-rebuild -f -w better-sqlite3
    if errorlevel 1 (
        echo 重新编译失败！
        echo 请手动运行: npx electron-rebuild -f -w better-sqlite3
        pause
        exit /b 1
    )
)

echo.
echo 检查构建文件...
if not exist "dist\main\main.js" (
    echo 正在构建主进程...
    call npm run build:main
    if errorlevel 1 (
        echo 构建失败！
        pause
        exit /b 1
    )
)

if not exist "dist\renderer\index.html" (
    echo 正在构建渲染进程...
    call npm run build:renderer
    if errorlevel 1 (
        echo 构建失败！
        pause
        exit /b 1
    )
)

echo.
echo 正在启动应用...
echo 应用将在独立窗口中运行
echo.
start "" "cmd" /k "npm start"

echo.
echo 应用已启动！
echo 如果窗口没有显示，请检查系统托盘（任务栏右下角）
echo.
pause

