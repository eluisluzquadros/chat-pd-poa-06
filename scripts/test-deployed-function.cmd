@echo off
echo ==========================================
echo 🧪 TESTE DA FUNÇÃO AGENTIC-RAG DEPLOYED
echo ==========================================
echo.

set ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg

echo Testando query: "O que diz o artigo 75?"
echo.

curl -L -X POST "https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/agentic-rag" ^
  -H "Authorization: Bearer %ANON_KEY%" ^
  -H "Content-Type: application/json" ^
  --data "{\"message\":\"O que diz o artigo 75?\",\"bypassCache\":true}"

echo.
echo.
echo ==========================================
echo Testando query: "Quais bairros têm proteção contra enchentes?"
echo.

curl -L -X POST "https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/agentic-rag" ^
  -H "Authorization: Bearer %ANON_KEY%" ^
  -H "Content-Type: application/json" ^
  --data "{\"message\":\"Quais bairros têm proteção contra enchentes?\",\"bypassCache\":true}"

echo.
echo.
pause