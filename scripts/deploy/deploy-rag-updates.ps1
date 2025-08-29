# Deploy updated RAG functions
Write-Host "🚀 Deploying updated RAG functions..." -ForegroundColor Cyan

# Deploy agentic-rag with updated REGIME_FALLBACK handling
Write-Host "`n📦 Deploying agentic-rag..." -ForegroundColor Yellow
npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ agentic-rag deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to deploy agentic-rag" -ForegroundColor Red
    exit 1
}

# Deploy response-synthesizer with extraction improvements
Write-Host "`n📦 Deploying response-synthesizer..." -ForegroundColor Yellow
npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ response-synthesizer deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to deploy response-synthesizer" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 All functions deployed successfully!" -ForegroundColor Green
Write-Host "⏳ Wait 30 seconds for functions to propagate..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "`n🧪 Testing deployment..." -ForegroundColor Cyan
node test-regime-fallback.mjs