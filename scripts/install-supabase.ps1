# Script de instalação do Supabase CLI para Windows
# Execute como Administrador

Write-Host "=== Instalação do Supabase CLI no Windows ===" -ForegroundColor Green

# Verificar se o Docker está instalado
Write-Host "`nVerificando Docker..." -ForegroundColor Yellow
try {
    docker --version
    Write-Host "✓ Docker instalado" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker não encontrado. Por favor, instale o Docker Desktop primeiro." -ForegroundColor Red
    Write-Host "Download: https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
    exit 1
}

# Verificar se o Scoop está instalado
Write-Host "`nVerificando Scoop..." -ForegroundColor Yellow
try {
    scoop --version | Out-Null
    Write-Host "✓ Scoop já instalado" -ForegroundColor Green
} catch {
    Write-Host "Instalando Scoop..." -ForegroundColor Yellow
    try {
        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
        Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
        Write-Host "✓ Scoop instalado com sucesso" -ForegroundColor Green
    } catch {
        Write-Host "✗ Erro ao instalar Scoop" -ForegroundColor Red
        exit 1
    }
}

# Instalar Supabase CLI
Write-Host "`nInstalando Supabase CLI..." -ForegroundColor Yellow
try {
    scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
    scoop install supabase
    Write-Host "✓ Supabase CLI instalado com sucesso" -ForegroundColor Green
} catch {
    Write-Host "✗ Erro ao instalar Supabase CLI" -ForegroundColor Red
    exit 1
}

# Verificar instalação
Write-Host "`nVerificando instalação..." -ForegroundColor Yellow
try {
    $version = supabase --version
    Write-Host "✓ Supabase CLI instalado: $version" -ForegroundColor Green
} catch {
    Write-Host "✗ Supabase CLI não foi instalado corretamente" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Instalação concluída! ===" -ForegroundColor Green
Write-Host "`nPróximos passos:" -ForegroundColor Cyan
Write-Host "1. Execute: supabase init" -ForegroundColor White
Write-Host "2. Execute: supabase start" -ForegroundColor White
Write-Host "3. Acesse: http://localhost:54323" -ForegroundColor White