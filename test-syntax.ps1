if (`$true) {
    try {
        Write-Host 'OK'
    } catch {
        Write-Host 'Error'
    }
} else {
    Write-Host 'Else'
}
