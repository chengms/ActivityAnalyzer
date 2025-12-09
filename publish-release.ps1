# GitHub Releases 发布辅助脚本
# 帮助快速打包和准备发布文件

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$false)]
    [string]$Tag = "v$Version",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false
)

Write-Host "=== GitHub Releases 发布辅助脚本 ===" -ForegroundColor Green
Write-Host ""

# 1. 更新版本号
Write-Host "步骤 1: 更新版本号..." -ForegroundColor Cyan
try {
    $packageJsonPath = "package.json"
    $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
    $oldVersion = $packageJson.version
    $packageJson.version = $Version
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath -Encoding UTF8
    Write-Host "   OK 版本号已更新: $oldVersion -> $Version" -ForegroundColor Green
} catch {
    Write-Host "   FAIL 更新版本号失败: $_" -ForegroundColor Red
    exit 1
}

# 2. 打包（如果未跳过）
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "步骤 2: 打包应用..." -ForegroundColor Cyan
    Write-Host "  提示: 这可能需要几分钟，请耐心等待..." -ForegroundColor Yellow
    Write-Host ""
    
    .\pack-with-mirror.ps1 dist:win:portable
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "   FAIL 打包失败！" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
    Write-Host "   OK 打包完成！" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "步骤 2: 跳过打包（使用 --SkipBuild 参数）" -ForegroundColor Yellow
}

# 3. 检查文件
Write-Host ""
Write-Host "步骤 3: 检查发布文件..." -ForegroundColor Cyan
$exeFile = "release\活动分析器-$Version.exe"
if (-not (Test-Path $exeFile)) {
    Write-Host "   FAIL 找不到文件: $exeFile" -ForegroundColor Red
    Write-Host "  提示: 请先运行打包命令" -ForegroundColor Yellow
    exit 1
}

$fileSize = (Get-Item $exeFile).Length / 1MB
Write-Host "   OK 文件存在: $exeFile" -ForegroundColor Green
Write-Host "   文件大小: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan

# 4. 显示下一步操作
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "准备完成！下一步操作：" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "1. 提交更改到 Git:" -ForegroundColor Yellow
Write-Host "   git add ." -ForegroundColor White
Write-Host "   git commit -m `"发布 $Tag`"" -ForegroundColor White
Write-Host ""

Write-Host "2. 创建并推送标签:" -ForegroundColor Yellow
Write-Host "   git tag $Tag" -ForegroundColor White
Write-Host "   git push origin $Tag" -ForegroundColor White
Write-Host "   # 或者一次性推送: git push origin main --tags" -ForegroundColor Gray
Write-Host ""

Write-Host "3. 在 GitHub 上创建 Release:" -ForegroundColor Yellow
Write-Host "   a) 访问: https://github.com/你的用户名/仓库名/releases/new" -ForegroundColor White
Write-Host "   b) 选择标签: $Tag" -ForegroundColor White
Write-Host "   c) 填写标题: $Tag - 活动分析器" -ForegroundColor White
Write-Host "   d) 上传文件: $exeFile" -ForegroundColor White
Write-Host "   e) 点击 'Publish release'" -ForegroundColor White
Write-Host ""

Write-Host "文件位置: $exeFile" -ForegroundColor Cyan
Write-Host ""

# 5. 可选：打开文件位置
$openLocation = Read-Host "是否打开文件所在目录？(Y/N)"
if ($openLocation -eq "Y" -or $openLocation -eq "y") {
    explorer.exe (Split-Path -Parent (Resolve-Path $exeFile))
}

Write-Host ""
Write-Host "完成！" -ForegroundColor Green

