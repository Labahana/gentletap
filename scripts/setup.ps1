# GentleTap local setup (Windows)
# Run from repo root: .\scripts\setup.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "`n=== GentleTap Setup ===" -ForegroundColor Cyan

# Check Node
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Node $(node -v)" -ForegroundColor Green

# Check Python
$python = $null
foreach ($cmd in @("python", "python3", "py")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        $python = $cmd
        break
    }
}
if (-not $python) {
    Write-Host "WARN: Python not found. Install 3.12+ from https://python.org and re-run." -ForegroundColor Yellow
    Write-Host "      Web app can still run; API requires Python." -ForegroundColor Yellow
} else {
    Write-Host "[OK] Python via $python" -ForegroundColor Green
}

# Env file
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "[OK] Created .env from .env.example — edit secrets before production" -ForegroundColor Green
}

# Docker
if (Get-Command docker -ErrorAction SilentlyContinue) {
    try {
        docker compose up -d 2>&1 | Out-Null
        Write-Host "[OK] Docker Compose started (Postgres + Redis)" -ForegroundColor Green
    } catch {
        Write-Host "WARN: Docker failed. Start Docker Desktop and run: docker compose up -d" -ForegroundColor Yellow
    }
} else {
    Write-Host "WARN: Docker not found. Install Docker Desktop for Postgres/Redis." -ForegroundColor Yellow
}

# Web env
$webEnv = "apps\web\.env.local"
if (-not (Test-Path $webEnv)) {
    Copy-Item "apps\web\.env.local.example" $webEnv
    Write-Host "[OK] Created apps/web/.env.local" -ForegroundColor Green
}

# Python venv + deps
if ($python) {
    Set-Location "apps\api"
    if (-not (Test-Path ".venv")) {
        & $python -m venv .venv
        Write-Host "[OK] Created Python venv" -ForegroundColor Green
    }
    .\.venv\Scripts\pip install -e ".[dev]" -q
    Write-Host "[OK] Python dependencies installed" -ForegroundColor Green

    # Migrations (needs Postgres)
    try {
        .\.venv\Scripts\alembic upgrade head 2>&1 | Out-Null
        Write-Host "[OK] Database migrations applied" -ForegroundColor Green
    } catch {
        Write-Host "WARN: Migrations skipped — is Postgres running?" -ForegroundColor Yellow
    }
    Set-Location $Root
}

# npm install
Set-Location "apps\web"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm packages (may take a few minutes)..." -ForegroundColor Cyan
    npm install
}
Write-Host "[OK] Web dependencies ready" -ForegroundColor Green
Set-Location $Root

Write-Host "`n=== Ready ===" -ForegroundColor Cyan
Write-Host "Terminal 1 (API):  cd apps\api; .\.venv\Scripts\uvicorn gentletap.main:app --reload --port 8000"
Write-Host "Terminal 2 (Web):  cd apps\web; npm run dev"
Write-Host ""
Write-Host "Landing:  http://localhost:3000"
Write-Host "API docs: http://localhost:8000/docs"
Write-Host ""
