#!/bin/bash

# Chat PD POA - Quick Start Script

echo "🚀 Chat PD POA - Iniciando ambiente de desenvolvimento"
echo "=================================================="

# Verificar se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências do projeto..."
    npm install
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Instalando dependências do frontend..."
    cd frontend && npm install && cd ..
fi

# Verificar arquivo .env
if [ ! -f ".env" ]; then
    echo "⚠️  Arquivo .env não encontrado!"
    echo "📝 Copiando .env.example para .env..."
    cp .env.example .env
    echo "✏️  Por favor, edite o arquivo .env com suas credenciais"
    echo "   e execute este script novamente."
    exit 1
fi

# Iniciar serviços
echo ""
echo "🎯 Iniciando serviços..."
echo "------------------------"
echo "Frontend: http://localhost:8080"
echo "Supabase: http://localhost:54321"
echo ""

# Usar npm run dev:all para iniciar tudo
npm run dev:all