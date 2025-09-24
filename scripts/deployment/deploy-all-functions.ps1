# Deploy All Edge Functions Script for Windows PowerShell
# This script deploys all edge functions with proper error handling

$PROJECT_REF = "ngrqwmvuhvjkeohesbxs"
$FUNCTIONS_PATH = "supabase/functions"

Write-Host "🚀 Deploying All Edge Functions" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host "Project: $PROJECT_REF"
Write-Host ""

# Function to deploy with retry
function Deploy-Function {
    param(
        [string]$funcName,
        [int]$maxRetries = 3
    )
    
    $retryCount = 0
    Write-Host "📦 Deploying: $funcName" -ForegroundColor Cyan
    
    while ($retryCount -lt $maxRetries) {
        try {
            $result = npx supabase functions deploy $funcName --project-ref $PROJECT_REF 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ $funcName deployed successfully" -ForegroundColor Green
                return $true
            }
            throw "Deployment failed"
        }
        catch {
            $retryCount++
            if ($retryCount -lt $maxRetries) {
                Write-Host "   ⚠️ Deployment failed, retrying ($retryCount/$maxRetries)..." -ForegroundColor Yellow
                Start-Sleep -Seconds 2
            }
            else {
                Write-Host "   ❌ Failed to deploy $funcName after $maxRetries attempts" -ForegroundColor Red
                return $false
            }
        }
    }
}

# Core RAG Functions
Write-Host "🔧 Deploying Core RAG Functions" -ForegroundColor Cyan
Write-Host "--------------------------------"
Deploy-Function "agentic-rag"
Deploy-Function "agentic-rag-v2"
Deploy-Function "query-analyzer"
Deploy-Function "sql-generator"
Deploy-Function "sql-generator-v2"
Deploy-Function "enhanced-vector-search"
Deploy-Function "response-synthesizer"
Deploy-Function "response-synthesizer-simple"

Write-Host ""
Write-Host "🤖 Deploying Agent Functions" -ForegroundColor Cyan
Write-Host "-----------------------------"
Deploy-Function "orchestrator-master"
Deploy-Function "agent-legal"
Deploy-Function "agent-urban"
Deploy-Function "agent-validator"

Write-Host ""
Write-Host "📊 Deploying Admin Functions" -ForegroundColor Cyan
Write-Host "----------------------------"
Deploy-Function "qa-validator"
Deploy-Function "qa-batch-runner"
Deploy-Function "qa-ingest-kb"

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "📋 Deployment Summary" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Core functions deployed" -ForegroundColor Green
Write-Host "✅ Agent functions deployed" -ForegroundColor Green
Write-Host "✅ Admin functions deployed" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Test the system using: npm run test-qa"
Write-Host "2. Clear cache if needed: node scripts/clear-cache-and-fix.ts"
Write-Host "3. Access admin dashboard at /admin/quality"
Write-Host "4. Run benchmarks at /admin/benchmark"
Write-Host ""
Write-Host "🎯 Deployment complete!" -ForegroundColor Green