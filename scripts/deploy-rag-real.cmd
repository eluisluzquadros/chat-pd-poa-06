@echo off
echo ==========================================
echo 🚀 DEPLOY DO RAG REAL (agentic-rag)
echo ==========================================
echo.

REM Verificar se o token está configurado
if "%SUPABASE_ACCESS_TOKEN%"=="" (
    echo ❌ ERRO: SUPABASE_ACCESS_TOKEN não configurado!
    echo.
    echo Por favor, execute primeiro:
    echo set SUPABASE_ACCESS_TOKEN=seu_token_aqui
    echo.
    echo Para obter o token, acesse:
    echo https://app.supabase.com/account/tokens
    echo.
    pause
    exit /b 1
)

echo ✅ Token configurado!
echo.
echo 📦 Fazendo deploy da função agentic-rag...
echo.

npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==========================================
    echo ✅ DEPLOY REALIZADO COM SUCESSO!
    echo ==========================================
    echo.
    echo 🧪 Teste a função com:
    echo.
    echo curl -L -X POST "https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/agentic-rag" ^
    echo   -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg" ^
    echo   -H "Content-Type: application/json" ^
    echo   --data "{\"message\":\"O que diz o artigo 75?\"}"
    echo.
) else (
    echo.
    echo ❌ ERRO NO DEPLOY!
    echo Por favor, verifique o erro acima.
    echo.
)

pause