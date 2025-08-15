#!/bin/bash

# Deploy single Edge Function to Supabase
# Usage: ./deploy-single-function.sh function-name

FUNCTION_NAME=$1
PROJECT_REF="ngrqwmvuhvjkeohesbxs"

if [ -z "$FUNCTION_NAME" ]; then
    echo "❌ Erro: Nome da função é obrigatório"
    echo "Uso: ./deploy-single-function.sh <nome-da-funcao>"
    exit 1
fi

echo "🚀 Deploying $FUNCTION_NAME to Supabase..."

# Check if npx is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx não encontrado. Instale o Node.js/npm primeiro."
    exit 1
fi

# Deploy using npx
npx supabase@latest functions deploy $FUNCTION_NAME \
    --project-ref $PROJECT_REF \
    --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ $FUNCTION_NAME deployed successfully!"
else
    echo "❌ Failed to deploy $FUNCTION_NAME"
    exit 1
fi