#!/bin/bash

echo "🚨 DEPLOY EMERGENCIAL - Sistema Funcional sem Embeddings"
echo "========================================================="
echo ""
echo "Este deploy implementa:"
echo "  ✅ Busca textual como fallback principal"
echo "  ✅ Extração genérica de entidades (sem hardcoding)"
echo "  ✅ Múltiplas estratégias de busca"
echo "  ✅ Funciona mesmo com rate limits"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.." || exit 1

echo "📦 Preparando Edge Function com correções..."

# Create backup of current function
echo "📋 Criando backup da função atual..."
cp -r supabase/functions/agentic-rag supabase/functions/agentic-rag.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Deploy the updated function
echo "🚀 Fazendo deploy para Supabase..."
npx supabase functions deploy agentic-rag \
  --project-ref ngrqwmvuhvjkeohesbxs \
  --no-verify-jwt

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
  echo ""
  echo "📊 Mudanças aplicadas:"
  echo "  1. Busca textual sem dependência de embeddings"
  echo "  2. Fallback automático quando embeddings falham"
  echo "  3. Extração genérica de entidades"
  echo "  4. Busca em múltiplas tabelas simultaneamente"
  echo ""
  echo "🧪 Para testar o sistema:"
  echo "  node scripts/test-chat-endpoint.mjs"
  echo ""
  echo "📈 Resultado esperado:"
  echo "  Antes: 0% (100% HTTP 500)"
  echo "  Agora: 20-30% funcional"
  echo ""
else
  echo ""
  echo "❌ ERRO NO DEPLOY!"
  echo "Verifique as credenciais e tente novamente."
  exit 1
fi