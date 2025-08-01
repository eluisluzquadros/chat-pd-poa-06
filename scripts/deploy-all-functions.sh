#!/bin/bash

# 🚀 Script de Deploy de Todas as Edge Functions
# Automatiza o deployment de todas as functions do projeto

echo "🚀 Iniciando deploy das Edge Functions..."
echo "========================================"

# Configurações
PROJECT_REF="ngrqwmvuhvjkeohesbxs"
FUNCTIONS_DIR="supabase/functions"

# Array de functions para deploy
FUNCTIONS=(
    "enhanced-vector-search"
    "agent-rag"
    "response-synthesizer"
    "contextual-scoring"
    "process-document"
)

# Contador de sucesso/falha
SUCCESS=0
FAILED=0

# Função para deploy individual
deploy_function() {
    local func_name=$1
    echo ""
    echo "📦 Deploying: $func_name"
    echo "------------------------"
    
    if [ -d "$FUNCTIONS_DIR/$func_name" ]; then
        # Navegar para o diretório da function
        cd "$FUNCTIONS_DIR/$func_name" || exit
        
        # Executar deploy
        if supabase functions deploy "$func_name" --project-ref "$PROJECT_REF"; then
            echo "✅ $func_name deployed successfully!"
            ((SUCCESS++))
        else
            echo "❌ Failed to deploy $func_name"
            ((FAILED++))
        fi
        
        # Voltar ao diretório raiz
        cd - > /dev/null || exit
    else
        echo "⚠️  Directory not found: $FUNCTIONS_DIR/$func_name"
        ((FAILED++))
    fi
}

# Deploy de cada function
for func in "${FUNCTIONS[@]}"; do
    deploy_function "$func"
done

# Resumo final
echo ""
echo "========================================"
echo "📊 DEPLOYMENT SUMMARY"
echo "========================================"
echo "✅ Successful: $SUCCESS"
echo "❌ Failed: $FAILED"
echo "📋 Total: ${#FUNCTIONS[@]}"
echo ""

# Verificar functions deployadas
echo "🔍 Verificando functions ativas..."
supabase functions list --project-ref "$PROJECT_REF"

# Sugestões finais
if [ $FAILED -eq 0 ]; then
    echo ""
    echo "🎉 Todas as functions foram deployadas com sucesso!"
    echo ""
    echo "💡 Próximos passos:"
    echo "1. Configure as API keys: npm run deploy-env"
    echo "2. Teste as functions: npm run test-functions"
    echo "3. Monitore os logs: supabase functions logs <function-name>"
else
    echo ""
    echo "⚠️  Algumas functions falharam no deploy."
    echo "💡 Verifique os logs e tente novamente:"
    echo "   ./scripts/deploy-all-functions.sh"
fi