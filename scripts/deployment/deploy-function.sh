#!/bin/bash

# Deploy single Edge Function to Supabase
# Usage: ./deploy-function.sh function-name

FUNCTION_NAME=$1
PROJECT_REF="ngrqwmvuhvjkeohesbxs"

if [ -z "$FUNCTION_NAME" ]; then
    echo "❌ Por favor, forneça o nome da função"
    echo "Uso: ./deploy-function.sh nome-da-funcao"
    exit 1
fi

echo "🚀 Deploying $FUNCTION_NAME..."

# Check if function directory exists
if [ ! -d "supabase/functions/$FUNCTION_NAME" ]; then
    echo "❌ Função não encontrada: supabase/functions/$FUNCTION_NAME"
    exit 1
fi

# Try to deploy
npx supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ $FUNCTION_NAME deployed successfully!"
else
    echo "⚠️  Deploy via CLI falhou. Tentando alternativa..."
    echo "📝 Por favor, faça o deploy manualmente no Supabase Dashboard"
    echo "   1. Vá para: https://app.supabase.com/project/$PROJECT_REF/functions"
    echo "   2. Clique em 'Deploy Function'"
    echo "   3. Selecione: $FUNCTION_NAME"
fi