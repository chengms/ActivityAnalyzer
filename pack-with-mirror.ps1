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
$processFilter = "*活动分析器*"
$allProcesses = Get-Process -ErrorAction SilentlyContinue
$processes = $allProcesses | Where-Object {
    ($_.ProcessName -like $processFilter) -or
    ($_.MainWindowTitle -like $processFilter) -or
    ($_.Path -like "*win-unpacked*") -or
    (($_.ProcessName -like "*electron*") -and ($_.Path -like "*ActivityAnalyzer*"))
}

if ($processes) {
    Write-Host "    找到 $($processes.Count) 个相关进程，正在关闭..." -ForegroundColor Yellow
    foreach ($proc in $processes) {
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            Write-Host "      OK 已关闭: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Green
        } catch {
            Write-Host "      FAIL 无法关闭: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Red
        }
    }
    Start-Sleep -Seconds 2
}
if (-not $processes) {
    Write-Host "    OK 没有相关进程在运行" -ForegroundColor Green
}

# 1.2 清理 electron-builder 缓存（保留 winCodeSign）
Write-Host "  1.2 清理 electron-builder 缓存..." -ForegroundColor Yellow
$builderCache = "$env:LOCALAPPDATA\electron-builder\Cache"
$winCodeSignCache = Join-Path $builderCache "winCodeSign"
if (Test-Path $builderCache) {
    try {
        # 备份 winCodeSign 缓存（如果存在）
        $winCodeSignBackup = $null
        if (Test-Path $winCodeSignCache) {
            $winCodeSignBackup = Join-Path $env:TEMP "winCodeSign-backup"
            if (Test-Path $winCodeSignBackup) {
                Remove-Item -Recurse -Force $winCodeSignBackup -ErrorAction SilentlyContinue
            }
            Copy-Item -Path $winCodeSignCache -Destination $winCodeSignBackup -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        # 清理缓存
        Remove-Item -Recurse -Force $builderCache -ErrorAction Stop
        
        # 恢复 winCodeSign 缓存（如果备份存在）
        if ($winCodeSignBackup -and (Test-Path $winCodeSignBackup)) {
            if (-not (Test-Path $builderCache)) {
                New-Item -ItemType Directory -Path $builderCache -Force | Out-Null
            }
            Copy-Item -Path $winCodeSignBackup -Destination $winCodeSignCache -Recurse -Force -ErrorAction SilentlyContinue
            Remove-Item -Recurse -Force $winCodeSignBackup -ErrorAction SilentlyContinue
        }
        
        Write-Host "    OK electron-builder 缓存已清理（已保留 winCodeSign）" -ForegroundColor Green
    } catch {
        Write-Host "    WARN 无法完全清理缓存: $_" -ForegroundColor Yellow
    }
}
if (-not (Test-Path $builderCache)) {
    Write-Host "    OK electron-builder 缓存目录不存在" -ForegroundColor Green
}

# 1.3 清理旧的编译输出（dist 目录）
Write-Host "  1.3 清理旧的编译输出 (dist/)..." -ForegroundColor Yellow
if (Test-Path "dist") {
    try {
        Remove-Item -Recurse -Force "dist" -ErrorAction Stop
        Write-Host "    OK dist 目录已清理" -ForegroundColor Green
    } catch {
        Write-Host "    WARN 无法完全清理 dist 目录: $_" -ForegroundColor Yellow
        Write-Host "    提示: 某些文件可能被占用，请手动关闭相关程序后重试" -ForegroundColor Yellow
    }
}
if (-not (Test-Path "dist")) {
    Write-Host "    OK dist 目录不存在" -ForegroundColor Green
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
            Write-Host "    OK win-unpacked 目录已清理" -ForegroundColor Green
        } catch {
            Write-Host "    WARN 无法清理 win-unpacked 目录: $_" -ForegroundColor Yellow
        }
    }
    
    # 清理旧的 exe 文件
    $exeFiles = Get-ChildItem -Path $releaseDir -Filter "*.exe" -ErrorAction SilentlyContinue
    if ($exeFiles) {
        foreach ($exe in $exeFiles) {
            try {
                Remove-Item -Force $exe.FullName -ErrorAction Stop
                Write-Host "    OK 已删除: $($exe.Name)" -ForegroundColor Green
            } catch {
                Write-Host "    WARN 无法删除: $($exe.Name)" -ForegroundColor Yellow
            }
        }
    }
    
    Write-Host "    OK release 目录清理完成" -ForegroundColor Green
}
if (-not (Test-Path $releaseDir)) {
    Write-Host "    OK release 目录不存在" -ForegroundColor Green
}

# 1.5 清理 Vite 缓存（可选）
Write-Host "  1.5 清理 Vite 缓存..." -ForegroundColor Yellow
$viteCache = "node_modules\.vite"
if (Test-Path $viteCache) {
    try {
        Remove-Item -Recurse -Force $viteCache -ErrorAction Stop
        Write-Host "    OK Vite 缓存已清理" -ForegroundColor Green
    } catch {
        Write-Host "    WARN 无法清理 Vite 缓存: $_" -ForegroundColor Yellow
    }
}
if (-not (Test-Path $viteCache)) {
    Write-Host "    OK Vite 缓存不存在" -ForegroundColor Green
}

Write-Host ""
Write-Host "清理完成！" -ForegroundColor Green
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

# 检查并修复 winCodeSign 工具（避免打包时失败）
Write-Host "  2.1 检查 winCodeSign 工具..." -ForegroundColor Yellow
$cacheDir = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0"
$filePath = Join-Path $cacheDir "winCodeSign-2.6.0.7z"
$rceditPath = Join-Path $cacheDir "rcedit-x64.exe"

# 如果只有 .7z 文件但没有解压的文件，删除不完整的缓存让 electron-builder 重新处理
if ((Test-Path $filePath) -and (-not (Test-Path $rceditPath))) {
    Write-Host "    检测到不完整的 winCodeSign 缓存，正在清理..." -ForegroundColor Yellow
    try {
        Remove-Item -Recurse -Force $cacheDir -ErrorAction Stop
        Write-Host "    OK 已清理不完整的缓存" -ForegroundColor Green
    } catch {
        Write-Host "    WARN 无法清理缓存: $_" -ForegroundColor Yellow
    }
}

# 检查工具是否就绪
if (Test-Path $rceditPath) {
    Write-Host "    OK winCodeSign 工具已就绪" -ForegroundColor Green
} else {
    Write-Host "    INFO winCodeSign 未就绪，electron-builder 会在打包时自动下载并解压" -ForegroundColor Cyan
    Write-Host "    提示: 如果下载失败，请检查网络连接或使用代理" -ForegroundColor Yellow
}
Write-Host ""

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
    Write-Host "FAIL 构建失败！请检查错误信息" -ForegroundColor Red
    exit 1
}
Write-Host ""
Write-Host "构建完成！" -ForegroundColor Green
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
