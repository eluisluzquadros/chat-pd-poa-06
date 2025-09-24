# PowerShell Script para deletar Edge Functions obsoletas
# Execute após configurar SUPABASE_ACCESS_TOKEN

Write-Host "🗑️ Script para deletar Edge Functions obsoletas" -ForegroundColor Yellow
Write-Host "⚠️ Certifique-se de ter configurado SUPABASE_ACCESS_TOKEN primeiro!" -ForegroundColor Red
Write-Host ""

# Verificar se o token está configurado
if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Host "❌ SUPABASE_ACCESS_TOKEN não configurado!" -ForegroundColor Red
    Write-Host "Configure com: `$env:SUPABASE_ACCESS_TOKEN='seu_token_aqui'" -ForegroundColor Yellow
    exit 1
}

$projectRef = "ngrqwmvuhvjkeohesbxs"

# Lista de funções para deletar (ordenadas por prioridade)
$functionsToDelete = @(
    # Debug/Test functions
    "agentic-rag-debug",
    "agentic-rag-v2", 
    "agentic-rag-v3",
    "agentic-rag-unified",
    "cache-debug",
    "sql-generator-debug",
    "test-minimal",
    "test-qa-cases",
    
    # QA redundantes
    "qa-validator-direct",
    "qa-validator-test",
    "qa-validator-simple",
    "qa-execute-validation-v2",
    "qa-batch-execution",
    "qa-benchmark-unified",
    "qa-cleanup-failed-runs",
    "qa-cleanup-runs",
    "qa-debug-runs",
    "qa-test-fixes",
    "qa-check-results-rls",
    "qa-delete-test-case",
    "qa-ensure-completed-status",
    "qa-fetch-runs",
    "qa-fix-rls",
    "qa-fix-simple",
    "qa-fix-stuck-runs",
    "qa-fix-system",
    "qa-get-run-details",
    "qa-update-test-case",
    
    # Chat individuais (usar multiLLMService em vez disso)
    "claude-chat",
    "claude-haiku-chat",
    "claude-sonnet-chat", 
    "claude-opus-chat",
    "deepseek-chat",
    "gemini-chat",
    "gemini-pro-chat",
    "gemini-vision-chat",
    "groq-chat",
    "llama-chat",
    "openai-advanced-chat",
    
    # Agentes redundantes
    "agent-evaluation",
    "agent-legal",
    "agent-rag",
    "agent-reasoning",
    "agent-urban",
    "agent-validator",
    "orchestrator-master",
    "orchestrator-master-fixed",
    "rl-cognitive-agent",
    
    # Utilitárias redundantes
    "create-admin-user",
    "create-admin-account",
    "setup-demo-user",
    "set-user-role",
    "create-user-from-interest",
    "check-processing-status",
    
    # Processamento antigas
    "fix-embeddings",
    "fix-embeddings-batch",
    "kb-reprocess-all",
    "kb-upload",
    "import-structured-kb",
    "process-document",
    "knowledge-updater",
    "feedback-processor",
    
    # Busca redundantes
    "cursor-pagination",
    "paginated-search",
    "match-documents",
    "get_documents",
    "get_list",
    "format-table-response",
    "structured-data-search",
    "legal-article-finder",
    
    # Validação redundantes
    "cross-validation",
    "cross-validation-v2",
    "contextual-scoring",
    "gap-detector",
    "table-coverage-monitor",
    "sql-validator",
    "universal-bairro-validator",
    "validate-dynamic-bairros",
    "ux-consistency-validator",
    
    # Response redundantes
    "response-synthesizer-v2",
    "response-synthesizer-simple",
    "response-synthesizer-rag",
    "predefined-responses",
    
    # SQL redundantes
    "sql-generator-v2",
    "sql-generator-new",
    
    # Outras
    "bairros-cache-service",
    "rag-neighborhood-sweep",
    "run-benchmark",
    "generate-embedding",
    "generate-text-embedding",
    "qa-ingest-kb",
    "qa-add-test-case"
)

Write-Host "📊 Total de funções para deletar: $($functionsToDelete.Count)" -ForegroundColor Cyan
Write-Host ""

$deleted = 0
$failed = 0

foreach ($func in $functionsToDelete) {
    Write-Host "Deletando: $func..." -NoNewline
    
    try {
        $result = npx supabase functions delete $func --project-ref $projectRef 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " ✅" -ForegroundColor Green
            $deleted++
        } else {
            Write-Host " ❌ (pode já estar deletada)" -ForegroundColor Yellow
            $failed++
        }
    } catch {
        Write-Host " ❌ Erro" -ForegroundColor Red
        $failed++
    }
    
    # Pequena pausa para não sobrecarregar
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 Resultado Final:" -ForegroundColor Green
Write-Host "✅ Deletadas com sucesso: $deleted" -ForegroundColor Green
Write-Host "⚠️ Já deletadas ou erro: $failed" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✨ Próximo passo: Deploy da função agentic-rag atualizada" -ForegroundColor Magenta
Write-Host "npx supabase functions deploy agentic-rag --project-ref $projectRef" -ForegroundColor White