# 使用国内镜像打包脚本
# 解决 GitHub 下载 Electron 失败的问题
# 自动清理缓存和旧的编译打包信息

Write-Host "=== 使用国内镜像打包 ===" -ForegroundColor Green
Write-Host ""

# ============================================
# 步骤 1: 清理缓存和旧的编译打包信息
# ============================================
Write-Host "步骤 1: 清理缓存和旧的编译打包信息..." -ForegroundColor Cyan
Write-Host ""

# 1.1 关闭相关进程（避免文件被锁定）
Write-Host "  1.1 检查并关闭相关进程..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object { 
    $_.ProcessName -like "*活动分析器*" -or 
    $_.MainWindowTitle -like "*活动分析器*" -or
    $_.Path -like "*win-unpacked*" -or
    ($_.ProcessName -like "*electron*" -and $_.Path -like "*ActivityAnalyzer*")
} -ErrorAction SilentlyContinue

if ($processes) {
    Write-Host "    找到 $($processes.Count) 个相关进程，正在关闭..." -ForegroundColor Yellow
    foreach ($proc in $processes) {
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            Write-Host "      ✓ 已关闭: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Green
        } catch {
            Write-Host "      ✗ 无法关闭: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Red
        }
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "    ✓ 没有相关进程在运行" -ForegroundColor Green
}

# 1.2 清理 electron-builder 缓存
Write-Host "  1.2 清理 electron-builder 缓存..." -ForegroundColor Yellow
$builderCache = "$env:LOCALAPPDATA\electron-builder\Cache"
if (Test-Path $builderCache) {
    try {
        Remove-Item -Recurse -Force $builderCache -ErrorAction Stop
        Write-Host "    ✓ electron-builder 缓存已清理" -ForegroundColor Green
    } catch {
        Write-Host "    ⚠ 无法完全清理缓存: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "    ✓ electron-builder 缓存目录不存在" -ForegroundColor Green
}

# 1.3 清理旧的编译输出（dist 目录）
Write-Host "  1.3 清理旧的编译输出 (dist/)..." -ForegroundColor Yellow
if (Test-Path "dist") {
    try {
        Remove-Item -Recurse -Force "dist" -ErrorAction Stop
        Write-Host "    ✓ dist 目录已清理" -ForegroundColor Green
    } catch {
        Write-Host "    ⚠ 无法完全清理 dist 目录: $_" -ForegroundColor Yellow
        Write-Host "    提示: 某些文件可能被占用，请手动关闭相关程序后重试" -ForegroundColor Yellow
    }
} else {
    Write-Host "    ✓ dist 目录不存在" -ForegroundColor Green
}

# 1.4 清理旧的打包输出（release 目录中的 win-unpacked 和 exe 文件）
Write-Host "  1.4 清理旧的打包输出 (release/)..." -ForegroundColor Yellow
$releaseDir = "release"
if (Test-Path $releaseDir) {
    # 清理 win-unpacked 目录
    $unpackedDir = Join-Path $releaseDir "win-unpacked"
    if (Test-Path $unpackedDir) {
        try {
            Remove-Item -Recurse -Force $unpackedDir -ErrorAction Stop
            Write-Host "    ✓ win-unpacked 目录已清理" -ForegroundColor Green
        } catch {
            Write-Host "    ⚠ 无法清理 win-unpacked 目录: $_" -ForegroundColor Yellow
        }
    }
    
    # 清理旧的 exe 文件
    $exeFiles = Get-ChildItem -Path $releaseDir -Filter "*.exe" -ErrorAction SilentlyContinue
    if ($exeFiles) {
        foreach ($exe in $exeFiles) {
            try {
                Remove-Item -Force $exe.FullName -ErrorAction Stop
                Write-Host "    ✓ 已删除: $($exe.Name)" -ForegroundColor Green
            } catch {
                Write-Host "    ⚠ 无法删除: $($exe.Name)" -ForegroundColor Yellow
            }
        }
    }
    
    Write-Host "    ✓ release 目录清理完成" -ForegroundColor Green
} else {
    Write-Host "    ✓ release 目录不存在" -ForegroundColor Green
}

# 1.5 清理 Vite 缓存（可选）
Write-Host "  1.5 清理 Vite 缓存..." -ForegroundColor Yellow
$viteCache = "node_modules\.vite"
if (Test-Path $viteCache) {
    try {
        Remove-Item -Recurse -Force $viteCache -ErrorAction Stop
        Write-Host "    ✓ Vite 缓存已清理" -ForegroundColor Green
    } catch {
        Write-Host "    ⚠ 无法清理 Vite 缓存: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "    ✓ Vite 缓存不存在" -ForegroundColor Green
}

Write-Host ""
Write-Host "✓ 清理完成！" -ForegroundColor Green
Write-Host ""

# ============================================
# 步骤 2: 设置环境变量
# ============================================
Write-Host "步骤 2: 设置环境变量..." -ForegroundColor Cyan
Write-Host ""

# 设置 Electron 镜像环境变量
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"

# 禁用代码签名（避免符号链接权限问题）
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"

Write-Host "已设置环境变量:" -ForegroundColor Yellow
Write-Host "  ELECTRON_MIRROR = $env:ELECTRON_MIRROR"
Write-Host "  ELECTRON_BUILDER_BINARIES_MIRROR = $env:ELECTRON_BUILDER_BINARIES_MIRROR"
Write-Host "  CSC_IDENTITY_AUTO_DISCOVERY = $env:CSC_IDENTITY_AUTO_DISCOVERY"
Write-Host ""

# ============================================
# 步骤 3: 构建项目
# ============================================
Write-Host "步骤 3: 构建项目..." -ForegroundColor Cyan
Write-Host ""
Write-Host "正在运行: npm run build" -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "✗ 构建失败！请检查错误信息" -ForegroundColor Red
    exit 1
}
Write-Host ""
Write-Host "✓ 构建完成！" -ForegroundColor Green
Write-Host ""

# ============================================
# 步骤 4: 打包应用
# ============================================
# 检查参数
$target = $args[0]
if (-not $target) {
    $target = "dist:win:portable"
    Write-Host "未指定打包类型，使用默认: dist:win:portable" -ForegroundColor Yellow
    Write-Host "可用选项: pack, dist, dist:win, dist:win:portable" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "步骤 4: 打包应用..." -ForegroundColor Cyan
Write-Host ""
Write-Host "开始打包 ($target)..." -ForegroundColor Green
Write-Host ""

switch ($target) {
    "pack" {
        npm run pack
    }
    "dist" {
        npm run dist
    }
    "dist:win" {
        npm run dist:win
    }
    "dist:win:portable" {
        npm run dist:win:portable
    }
    default {
        Write-Host "未知的打包类型: $target" -ForegroundColor Red
        Write-Host "使用: .\pack-with-mirror.ps1 [pack|dist|dist:win|dist:win:portable]" -ForegroundColor Yellow
        exit 1
    }
}

