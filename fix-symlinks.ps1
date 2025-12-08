# 修复 winCodeSign 缓存中的符号链接问题
# 需要以管理员身份运行

Write-Host "=== 修复 winCodeSign 符号链接 ===" -ForegroundColor Green
Write-Host ""

$cacheDir = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"

if (-not (Test-Path $cacheDir)) {
    Write-Host "winCodeSign 缓存目录不存在，无需修复" -ForegroundColor Yellow
    exit 0
}

Write-Host "查找需要修复的符号链接..." -ForegroundColor Yellow

$fixed = 0
$errors = 0

Get-ChildItem -Path $cacheDir -Recurse -Directory | ForEach-Object {
    $dir = $_.FullName
    $darwinDir = Join-Path $dir "darwin"
    
    if (Test-Path $darwinDir) {
        $libDir = Join-Path $darwinDir "10.12\lib"
        if (Test-Path $libDir) {
            $cryptoLink = Join-Path $libDir "libcrypto.dylib"
            $sslLink = Join-Path $libDir "libssl.dylib"
            
            # 检查并修复 libcrypto.dylib
            if (Test-Path $cryptoLink) {
                try {
                    $item = Get-Item $cryptoLink -Force
                    if ($item.LinkType -eq "SymbolicLink") {
                        $target = $item.Target
                        Remove-Item $cryptoLink -Force
                        Copy-Item $target $cryptoLink -Force
                        Write-Host "✓ 修复: $cryptoLink" -ForegroundColor Green
                        $fixed++
                    }
                } catch {
                    Write-Host "✗ 错误: $cryptoLink - $_" -ForegroundColor Red
                    $errors++
                }
            }
            
            # 检查并修复 libssl.dylib
            if (Test-Path $sslLink) {
                try {
                    $item = Get-Item $sslLink -Force
                    if ($item.LinkType -eq "SymbolicLink") {
                        $target = $item.Target
                        Remove-Item $sslLink -Force
                        Copy-Item $target $sslLink -Force
                        Write-Host "✓ 修复: $sslLink" -ForegroundColor Green
                        $fixed++
                    }
                } catch {
                    Write-Host "✗ 错误: $sslLink - $_" -ForegroundColor Red
                    $errors++
                }
            }
        }
    }
}

Write-Host ""
Write-Host "修复完成: 修复 $fixed 个符号链接, $errors 个错误" -ForegroundColor $(if ($errors -eq 0) { "Green" } else { "Yellow" })

