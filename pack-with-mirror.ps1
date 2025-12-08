# 使用国内镜像打包脚本
# 解决 GitHub 下载 Electron 失败的问题

Write-Host "=== 使用国内镜像打包 ===" -ForegroundColor Green
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

# 检查参数
$target = $args[0]
if (-not $target) {
    $target = "pack"
    Write-Host "未指定打包类型，使用默认: pack" -ForegroundColor Yellow
    Write-Host "可用选项: pack, dist, dist:win, dist:win:portable" -ForegroundColor Yellow
    Write-Host ""
}

# 运行打包命令
Write-Host "开始打包..." -ForegroundColor Green
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

