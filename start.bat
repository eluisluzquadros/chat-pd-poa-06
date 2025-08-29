@echo off
REM Chat PD POA - Quick Start Script for Windows

echo ========================================
echo   Chat PD POA - Ambiente de Desenvolvimento
echo ========================================
echo.

REM Verificar se as dependencias estao instaladas
if not exist "node_modules" (
    echo Instalando dependencias do projeto...
    npm install
)

if not exist "frontend\node_modules" (
    echo Instalando dependencias do frontend...
    cd frontend
    npm install
    cd ..
)

REM Verificar arquivo .env
if not exist ".env" (
    echo.
    echo AVISO: Arquivo .env nao encontrado!
    echo Copiando .env.example para .env...
    copy .env.example .env
    echo.
    echo Por favor, edite o arquivo .env com suas credenciais
    echo e execute este script novamente.
    pause
    exit /b 1
)

echo.
echo Iniciando servicos...
echo ---------------------
echo Frontend: http://localhost:8080
echo Supabase: http://localhost:54321
echo.

REM Iniciar frontend e backend
npm run dev:all