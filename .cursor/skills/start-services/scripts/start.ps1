param(
    [switch]$Frontend,
    [switch]$ReportService,
    [switch]$ExportService,
    [switch]$All
)

$ROOT = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

function Kill-Port($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "  [stopped] port $port (PID $($conn.OwningProcess))"
        return $true
    }
    return $false
}

function Start-Bg($label, $cmd) {
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", $cmd -WindowStyle Normal
    Write-Host "  [started] $label"
}

if ($All -or $ReportService) {
    Write-Host "report-service (8001):"
    Kill-Port 8001
    Start-Bg "report-service" "cd '$ROOT\services\report-service'; .\venv\Scripts\activate; uvicorn app.main:app --port 8001 --reload"
}

if ($All -or $ExportService) {
    Write-Host "export-service (8002):"
    Kill-Port 8002
    Start-Bg "export-service" "cd '$ROOT\services\export-service'; .\venv\Scripts\activate; uvicorn app.main:app --port 8002 --reload"
}

if ($All -or $Frontend) {
    Write-Host "frontend (5173+):"
    5173..5180 | ForEach-Object { Kill-Port $_ } | Out-Null
    Start-Bg "frontend" "cd '$ROOT\frontend'; npm run dev"
}

Write-Host "Done."
