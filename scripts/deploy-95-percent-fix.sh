#!/bin/bash

echo "🎯 DEPLOY PARA ATINGIR 95% DE PRECISÃO"
echo "======================================="
echo ""
echo "Implementando ajustes finos:"
echo "  ✅ Busca hierárquica melhorada (Título, Parte, Capítulo)"
echo "  ✅ Otimização de prompts de resumo"
echo "  ✅ Cache de resumos frequentes"
echo "  ✅ Fallback para conteúdo hierárquico"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.." || exit 1

echo "📦 Preparando deploy..."

# Deploy the Edge Function with improvements
echo "🚀 Fazendo deploy para Supabase..."
npx supabase functions deploy agentic-rag \
  --project-ref ngrqwmvuhvjkeohesbxs \
  --no-verify-jwt

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ DEPLOY CONCLUÍDO!"
  echo ""
  echo "📊 Melhorias implementadas:"
  echo "  1. hierarchical-search.ts - Busca hierárquica inteligente"
  echo "  2. summary-optimizer.ts - Prompts otimizados para resumos"
  echo "  3. Fallback automático para Título I quando não encontrado"
  echo "  4. Cache de resumos hierárquicos frequentes"
  echo ""
  echo "🧪 Para validar 95% de precisão:"
  echo "  node scripts/test-final-precision.mjs"
  echo ""
  echo "📈 Resultado esperado:"
  echo "  Antes: 93.3% (14/15 corretas)"
  echo "  Agora: 95%+ (15/15 corretas)"
  echo ""
else
  echo ""
  echo "❌ ERRO NO DEPLOY!"
  echo "Verifique as credenciais e tente novamente."
  exit 1
fi