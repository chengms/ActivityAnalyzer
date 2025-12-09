# 使用国内镜像打包脚本
# 解决 GitHub 下载 Electron 失败的问题
# 智能清理缓存和旧的编译打包信息（仅清理必要部分）
#
# 用法:
#   .\pack-with-mirror.ps1 [target] [--force]
#   参数:
#     target: 打包类型 (pack|dist|dist:win|dist:win:portable)，默认: dist:win:portable
#     --force: 强制清理所有构建输出（包括 dist 和 Vite 缓存）

Write-Host "=== 使用国内镜像打包 ===" -ForegroundColor Green
Write-Host ""

# 记录脚本开始时间（用于计算总耗时）
$scriptStartTime = Get-Date

# 解析参数
$target = $null
$forceClean = $false
foreach ($arg in $args) {
    if ($arg -eq "--force" -or $arg -eq "-f") {
        $forceClean = $true
    } elseif ($arg -notlike "--*" -and $arg -notlike "-*") {
        $target = $arg
    }
}

# ============================================
# 步骤 1: 智能清理缓存和旧的编译打包信息
# ============================================
Write-Host "步骤 1: 智能清理缓存和旧的编译打包信息..." -ForegroundColor Cyan
Write-Host ""

# 辅助函数：获取目录的最新修改时间
function Get-DirectoryLastWriteTime {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        return $null
    }
    $items = Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue
    if (-not $items) {
        return $null
    }
    return ($items | Measure-Object -Property LastWriteTime -Maximum).Maximum
}

# 辅助函数：检查是否需要清理 dist 目录
function Should-CleanDist {
    $srcPath = "src"
    $distPath = "dist"
    
    # 如果 dist 不存在，不需要清理
    if (-not (Test-Path $distPath)) {
        return $false
    }
    
    # 如果 src 不存在，总是清理 dist
    if (-not (Test-Path $srcPath)) {
        return $true
    }
    
    # 获取最新修改时间
    $srcLastWrite = Get-DirectoryLastWriteTime -Path $srcPath
    $distLastWrite = Get-DirectoryLastWriteTime -Path $distPath
    
    # 如果无法获取时间，保守处理：清理
    if (-not $srcLastWrite -or -not $distLastWrite) {
        return $true
    }
    
    # 如果源代码比构建输出新，需要清理
    if ($srcLastWrite -gt $distLastWrite) {
        return $true
    }
    
    # 检查关键配置文件是否更改
    $configFiles = @("package.json", "tsconfig.main.json", "vite.config.ts", "tsconfig.json")
    foreach ($configFile in $configFiles) {
        if (Test-Path $configFile) {
            $configTime = (Get-Item $configFile).LastWriteTime
            if ($configTime -gt $distLastWrite) {
                return $true
            }
        }
    }
    
    # 源代码没有更改，可以保留 dist
    return $false
}

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

# 1.2 跳过清理 electron-builder 缓存（保留所有下载的工具和资源）
Write-Host "  1.2 检查 electron-builder 缓存..." -ForegroundColor Yellow
$builderCache = "$env:LOCALAPPDATA\electron-builder\Cache"
if (Test-Path $builderCache) {
    $cacheSize = (Get-ChildItem -Path $builderCache -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "    OK 保留 electron-builder 缓存（大小: $([math]::Round($cacheSize, 2)) MB）" -ForegroundColor Green
    Write-Host "    提示: 缓存包含 Electron、winCodeSign 等工具，已保留以避免重复下载" -ForegroundColor Cyan
} else {
    Write-Host "    OK electron-builder 缓存目录不存在" -ForegroundColor Green
}

# 1.3 智能清理旧的编译输出（dist 目录）
Write-Host "  1.3 检查编译输出 (dist/)..." -ForegroundColor Yellow
if ($forceClean) {
    Write-Host "    强制清理模式：将清理所有构建输出" -ForegroundColor Yellow
}
$shouldCleanDist = $forceClean -or (Should-CleanDist)
if ($shouldCleanDist) {
    if (Test-Path "dist") {
        try {
            Remove-Item -Recurse -Force "dist" -ErrorAction Stop
            Write-Host "    OK dist 目录已清理（检测到源代码或配置更改）" -ForegroundColor Green
        } catch {
            Write-Host "    WARN 无法完全清理 dist 目录: $_" -ForegroundColor Yellow
            Write-Host "    提示: 某些文件可能被占用，请手动关闭相关程序后重试" -ForegroundColor Yellow
        }
    } else {
        Write-Host "    OK dist 目录不存在" -ForegroundColor Green
    }
} else {
    Write-Host "    SKIP 保留 dist 目录（源代码未更改，构建输出仍然有效）" -ForegroundColor Cyan
}

# 1.4 清理旧的打包输出（release 目录中的 win-unpacked 和 exe 文件）
# 注意：打包输出总是需要清理，因为打包过程会重新生成
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

# 1.5 智能清理 Vite 缓存
Write-Host "  1.5 检查 Vite 缓存..." -ForegroundColor Yellow
$viteCache = "node_modules\.vite"
if ($forceClean) {
    if (Test-Path $viteCache) {
        try {
            Remove-Item -Recurse -Force $viteCache -ErrorAction Stop
            Write-Host "    OK Vite 缓存已清理（强制清理模式）" -ForegroundColor Green
        } catch {
            Write-Host "    WARN 无法清理 Vite 缓存: $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "    OK Vite 缓存不存在" -ForegroundColor Green
    }
} else {
    if (Test-Path $viteCache) {
        $viteCacheSize = (Get-ChildItem -Path $viteCache -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "    SKIP 保留 Vite 缓存（大小: $([math]::Round($viteCacheSize, 2)) MB）" -ForegroundColor Cyan
        Write-Host "    提示: Vite 会自动处理增量构建，保留缓存可以加快构建速度" -ForegroundColor Cyan
        Write-Host "    如需强制清理，请使用: .\pack-with-mirror.ps1 $target --force" -ForegroundColor Cyan
    } else {
        Write-Host "    OK Vite 缓存不存在" -ForegroundColor Green
    }
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

# 检查 winCodeSign 工具状态（仅检查，不清理）
Write-Host "  2.1 检查 winCodeSign 工具..." -ForegroundColor Yellow
$cacheDir = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0"
$rceditPath = Join-Path $cacheDir "rcedit-x64.exe"

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
Write-Host ""

# 记录编译开始时间
$buildStartTime = Get-Date

npm run build

# 记录编译结束时间并计算耗时
$buildEndTime = Get-Date
$buildDuration = $buildEndTime - $buildStartTime
$buildMinutes = [math]::Floor($buildDuration.TotalMinutes)
$buildSeconds = [math]::Floor($buildDuration.TotalSeconds % 60)

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "FAIL 构建失败！耗时: ${buildMinutes}分${buildSeconds}秒" -ForegroundColor Red
    Write-Host "请检查错误信息" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "构建完成！耗时: ${buildMinutes}分${buildSeconds}秒" -ForegroundColor Green
Write-Host ""

# ============================================
# 步骤 4: 打包应用
# ============================================
# 检查打包目标参数
if (-not $target) {
    $target = "dist:win:portable"
    Write-Host "未指定打包类型，使用默认: dist:win:portable" -ForegroundColor Yellow
    Write-Host "可用选项: pack, dist, dist:win, dist:win:portable" -ForegroundColor Yellow
    Write-Host "使用 --force 参数可以强制清理所有构建输出" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "步骤 4: 打包应用..." -ForegroundColor Cyan
Write-Host ""
Write-Host "开始打包 ($target)..." -ForegroundColor Green
Write-Host ""
Write-Host "提示: 打包过程可能需要几分钟，请耐心等待..." -ForegroundColor Yellow
Write-Host "      - 正在复制文件到临时目录" -ForegroundColor Cyan
Write-Host "      - 正在打包 asar 文件" -ForegroundColor Cyan
Write-Host "      - 正在复制 Electron 运行时" -ForegroundColor Cyan
Write-Host "      - 正在生成便携版可执行文件" -ForegroundColor Cyan
Write-Host ""

# 记录开始时间
$startTime = Get-Date

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

# 计算耗时
$endTime = Get-Date
$duration = $endTime - $startTime
$minutes = [math]::Floor($duration.TotalMinutes)
$seconds = [math]::Floor($duration.TotalSeconds % 60)

# 计算总耗时
$scriptEndTime = Get-Date
$totalDuration = $scriptEndTime - $scriptStartTime
$totalMinutes = [math]::Floor($totalDuration.TotalMinutes)
$totalSeconds = [math]::Floor($totalDuration.TotalSeconds % 60)

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "打包完成！" -ForegroundColor Green
    Write-Host "  编译耗时: ${buildMinutes}分${buildSeconds}秒" -ForegroundColor Cyan
    Write-Host "  打包耗时: ${minutes}分${seconds}秒" -ForegroundColor Cyan
    Write-Host "  总耗时: ${totalMinutes}分${totalSeconds}秒" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "打包失败！" -ForegroundColor Red
    Write-Host "  编译耗时: ${buildMinutes}分${buildSeconds}秒" -ForegroundColor Yellow
    Write-Host "  打包耗时: ${minutes}分${seconds}秒" -ForegroundColor Yellow
    Write-Host "  总耗时: ${totalMinutes}分${totalSeconds}秒" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}
