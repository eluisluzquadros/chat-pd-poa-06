#!/bin/bash

# Auto-generated Supabase environment deployment script
# Sistema RAG Multi-LLM - Porto de Outono
# Run: chmod +x supabase-env-deploy.sh && ./supabase-env-deploy.sh

set -e  # Exit on any error

echo "🚀 Deploying environment variables to Supabase Edge Functions..."
echo "======================================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found!${NC}"
    echo "Install it: npm install -g supabase"
    echo "Or: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Supabase${NC}"
    echo "Please login: supabase login"
    exit 1
fi

# Load environment variables from .env.local
if [ -f .env.local ]; then
    echo -e "${GREEN}📄 Loading variables from .env.local${NC}"
    export $(grep -v '^#' .env.local | xargs)
else
    echo -e "${RED}❌ .env.local file not found!${NC}"
    echo "Please run: cp .env.example .env.local"
    exit 1
fi

echo ""
echo "🔧 Setting OpenAI configuration..."
if [ ! -z "$OPENAI_API_KEY" ]; then
    supabase secrets set OPENAI_API_KEY="$OPENAI_API_KEY"
    echo -e "${GREEN}✅ OPENAI_API_KEY${NC}"
else
    echo -e "${YELLOW}⚠️  OPENAI_API_KEY not set${NC}"
fi

if [ ! -z "$OPENAI_ORG_ID" ]; then
    supabase secrets set OPENAI_ORG_ID="$OPENAI_ORG_ID"
    echo -e "${GREEN}✅ OPENAI_ORG_ID${NC}"
fi

echo ""
echo "🧠 Setting Anthropic Claude configuration..."
if [ ! -z "$CLAUDE_API_KEY" ]; then
    supabase secrets set CLAUDE_API_KEY="$CLAUDE_API_KEY"
    supabase secrets set ANTHROPIC_API_KEY="$CLAUDE_API_KEY"
    echo -e "${GREEN}✅ CLAUDE_API_KEY${NC}"
    echo -e "${GREEN}✅ ANTHROPIC_API_KEY${NC}"
else
    echo -e "${YELLOW}⚠️  CLAUDE_API_KEY not set${NC}"
fi

echo ""
echo "🌟 Setting Google Gemini configuration..."
if [ ! -z "$GEMINI_API_KEY" ]; then
    supabase secrets set GEMINI_API_KEY="$GEMINI_API_KEY"
    supabase secrets set GOOGLE_AI_API_KEY="$GEMINI_API_KEY"
    echo -e "${GREEN}✅ GEMINI_API_KEY${NC}"
    echo -e "${GREEN}✅ GOOGLE_AI_API_KEY${NC}"
else
    echo -e "${YELLOW}⚠️  GEMINI_API_KEY not set${NC}"
fi

if [ ! -z "$GOOGLE_CLOUD_PROJECT_ID" ]; then
    supabase secrets set GOOGLE_CLOUD_PROJECT_ID="$GOOGLE_CLOUD_PROJECT_ID"
    echo -e "${GREEN}✅ GOOGLE_CLOUD_PROJECT_ID${NC}"
fi

echo ""
echo "⚡ Setting Groq configuration..."
if [ ! -z "$GROQ_API_KEY" ]; then
    supabase secrets set GROQ_API_KEY="$GROQ_API_KEY"
    echo -e "${GREEN}✅ GROQ_API_KEY${NC}"
else
    echo -e "${YELLOW}⚠️  GROQ_API_KEY not set${NC}"
fi

echo ""
echo "💻 Setting DeepSeek configuration..."
if [ ! -z "$DEEPSEEK_API_KEY" ]; then
    supabase secrets set DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY"
    echo -e "${GREEN}✅ DEEPSEEK_API_KEY${NC}"
else
    echo -e "${YELLOW}⚠️  DEEPSEEK_API_KEY not set${NC}"
fi

echo ""
echo "🦙 Setting Llama/HuggingFace configuration..."
if [ ! -z "$HUGGINGFACE_API_TOKEN" ]; then
    supabase secrets set HUGGINGFACE_API_TOKEN="$HUGGINGFACE_API_TOKEN"
    echo -e "${GREEN}✅ HUGGINGFACE_API_TOKEN${NC}"
else
    echo -e "${YELLOW}⚠️  HUGGINGFACE_API_TOKEN not set${NC}"
fi

if [ ! -z "$REPLICATE_API_TOKEN" ]; then
    supabase secrets set REPLICATE_API_TOKEN="$REPLICATE_API_TOKEN"
    echo -e "${GREEN}✅ REPLICATE_API_TOKEN${NC}"
fi

echo ""
echo "⚙️ Setting system configuration..."

# Rate Limits
supabase secrets set OPENAI_RATE_LIMIT="${OPENAI_RATE_LIMIT:-3500}"
supabase secrets set CLAUDE_RATE_LIMIT="${CLAUDE_RATE_LIMIT:-1000}"
supabase secrets set GEMINI_RATE_LIMIT="${GEMINI_RATE_LIMIT:-1500}"
supabase secrets set GROQ_RATE_LIMIT="${GROQ_RATE_LIMIT:-30000}"
supabase secrets set DEEPSEEK_RATE_LIMIT="${DEEPSEEK_RATE_LIMIT:-1000}"

# Cost and Token Limits
supabase secrets set MAX_DAILY_COST_USD="${MAX_DAILY_COST_USD:-50.00}"
supabase secrets set MAX_TOKENS_PER_REQUEST="${MAX_TOKENS_PER_REQUEST:-4000}"

# Default Configuration
supabase secrets set DEFAULT_LLM_PROVIDER="${DEFAULT_LLM_PROVIDER:-openai}"
supabase secrets set DEFAULT_MODEL="${DEFAULT_MODEL:-gpt-4o-mini}"

# Cache Configuration
supabase secrets set ENABLE_LLM_CACHE="${ENABLE_LLM_CACHE:-true}"
supabase secrets set LLM_CACHE_TTL="${LLM_CACHE_TTL:-3600}"

# Logging and Monitoring
supabase secrets set ENABLE_LLM_METRICS="${ENABLE_LLM_METRICS:-true}"
supabase secrets set LOG_LEVEL="${LOG_LEVEL:-info}"
supabase secrets set DEBUG_MODE="${DEBUG_MODE:-false}"

# Security
if [ ! -z "$JWT_SECRET" ]; then
    supabase secrets set JWT_SECRET="$JWT_SECRET"
    echo -e "${GREEN}✅ JWT_SECRET${NC}"
fi

if [ ! -z "$API_KEYS_ENCRYPTION_KEY" ]; then
    supabase secrets set API_KEYS_ENCRYPTION_KEY="$API_KEYS_ENCRYPTION_KEY"
    echo -e "${GREEN}✅ API_KEYS_ENCRYPTION_KEY${NC}"
fi

if [ ! -z "$CORS_ORIGINS" ]; then
    supabase secrets set CORS_ORIGINS="$CORS_ORIGINS"
    echo -e "${GREEN}✅ CORS_ORIGINS${NC}"
fi

# Model specific configurations
echo ""
echo "🤖 Setting model-specific configurations..."

# GPT-4 models
supabase secrets set GPT4_TURBO_MODEL="${GPT4_TURBO_MODEL:-gpt-4-turbo-preview}"
supabase secrets set GPT4_TURBO_MAX_TOKENS="${GPT4_TURBO_MAX_TOKENS:-4000}"
supabase secrets set GPT4_TURBO_TEMPERATURE="${GPT4_TURBO_TEMPERATURE:-0.7}"

# Claude models
supabase secrets set CLAUDE_3_OPUS_MODEL="${CLAUDE_3_OPUS_MODEL:-claude-3-opus-20240229}"
supabase secrets set CLAUDE_3_SONNET_MODEL="${CLAUDE_3_SONNET_MODEL:-claude-3-5-sonnet-20241022}"
supabase secrets set CLAUDE_3_HAIKU_MODEL="${CLAUDE_3_HAIKU_MODEL:-claude-3-haiku-20240307}"

# Gemini models
supabase secrets set GEMINI_PRO_MODEL="${GEMINI_PRO_MODEL:-gemini-1.5-pro}"
supabase secrets set GEMINI_FLASH_MODEL="${GEMINI_FLASH_MODEL:-gemini-1.5-flash}"
supabase secrets set GEMINI_VISION_MODEL="${GEMINI_VISION_MODEL:-gemini-1.5-pro-vision}"

# Groq models
supabase secrets set GROQ_MIXTRAL_MODEL="${GROQ_MIXTRAL_MODEL:-mixtral-8x7b-32768}"
supabase secrets set GROQ_LLAMA_MODEL="${GROQ_LLAMA_MODEL:-llama3.1-70b-versatile}"

# DeepSeek models
supabase secrets set DEEPSEEK_CODER_MODEL="${DEEPSEEK_CODER_MODEL:-deepseek-coder}"
supabase secrets set DEEPSEEK_CHAT_MODEL="${DEEPSEEK_CHAT_MODEL:-deepseek-chat}"

echo -e "${GREEN}✅ System configuration deployed${NC}"

echo ""
echo "🔄 Setting backup and fallback configuration..."
supabase secrets set BACKUP_LLM_PROVIDER="${BACKUP_LLM_PROVIDER:-claude}"
supabase secrets set BACKUP_MODEL="${BACKUP_MODEL:-claude-3-5-sonnet-20241022}"
supabase secrets set ENABLE_AUTO_FALLBACK="${ENABLE_AUTO_FALLBACK:-true}"

echo ""
echo "======================================================================"
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Verify deployment: supabase secrets list"
echo "2. Test edge functions: npm run test-llm-connections"
echo "3. Monitor usage in Supabase dashboard"
echo ""
echo "🔍 Troubleshooting:"
echo "- Check logs: supabase functions logs <function-name>"
echo "- List secrets: supabase secrets list"
echo "- Delete secret: supabase secrets unset <secret-name>"
echo ""
echo "📄 Generated deployment report:"
date > deployment-report.txt
echo "Deployment completed successfully" >> deployment-report.txt
echo "Environment variables deployed to Supabase Edge Functions" >> deployment-report.txt

echo -e "${GREEN}✅ Deployment report saved to: deployment-report.txt${NC}"