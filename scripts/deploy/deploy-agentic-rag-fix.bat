@echo off
echo ========================================
echo DEPLOY DO FIX DO AGENTIC-RAG
echo ========================================
echo.
echo Este script vai fazer o deploy da funcao corrigida
echo que agora busca 100%% dos dados (incluindo REGIME_FALLBACK e QA_CATEGORY)
echo.

echo [1/3] Fazendo backup da funcao atual...
call npx supabase functions download agentic-rag --project-ref ngrqwmvuhvjkeohesbxs

echo.
echo [2/3] Fazendo deploy da funcao corrigida...
call npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs

echo.
echo [3/3] Verificando logs...
timeout /t 5 /nobreak > nul
call npx supabase functions logs agentic-rag --project-ref ngrqwmvuhvjkeohesbxs --tail 20

echo.
echo ========================================
echo DEPLOY COMPLETO!
echo ========================================
echo.
echo Agora teste com:
echo - "qual a altura maxima em Petropolis?"
echo - "altura maxima construcao Porto Alegre"
echo.
pause