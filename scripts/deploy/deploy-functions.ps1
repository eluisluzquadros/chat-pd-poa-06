# PowerShell script to deploy Supabase Edge Functions
# Usage: .\deploy-functions.ps1

$PROJECT_REF = "ngrqwmvuhvjkeohesbxs"
$FUNCTIONS = @(
    "query-analyzer",
    "response-synthesizer", 
    "sql-generator-v2",
    "agentic-rag",
    "enhanced-vector-search"
)

Write-Host "🚀 Deploying Edge Functions to Supabase" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

foreach ($func in $FUNCTIONS) {
    Write-Host "`n📦 Deploying: $func" -ForegroundColor Yellow
    
    $env:SUPABASE_ACCESS_TOKEN = ""  # Will use login session
    
    # Use npx to run supabase CLI without .env.local
    $deployCmd = "npx supabase@latest functions deploy $func --project-ref $PROJECT_REF --no-verify-jwt 2>&1"
    
    try {
        $output = Invoke-Expression $deployCmd
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $func deployed successfully!" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to deploy $func" -ForegroundColor Red
            Write-Host $output
        }
    } catch {
        Write-Host "❌ Error deploying $func`: $_" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📊 Deployment Complete!" -ForegroundColor Cyan