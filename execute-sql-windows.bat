@echo off
REM Script para executar SQL no Supabase via psql no Windows

echo ====================================
echo Executando SQL no Supabase
echo ====================================

REM URL de conexão
set DATABASE_URL=postgresql://postgres.ngrqwmvuhvjkeohesbxs:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo@aws-0-us-west-1.pooler.supabase.com:5432/postgres

echo.
echo Opcoes:
echo 1. Instalar psql via npm: npm install -g @pgtyped/cli
echo 2. Usar o SQL Editor do Supabase (recomendado)
echo.
echo Para usar o SQL Editor:
echo 1. Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql
echo 2. Cole o conteudo de CREATE_REGIME_TABLES.sql
echo 3. Clique em "Run"
echo.
echo Apos criar as tabelas, execute:
echo node scripts/execute-regime-tables-sql.mjs
echo ====================================