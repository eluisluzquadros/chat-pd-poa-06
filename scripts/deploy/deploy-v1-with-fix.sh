#!/bin/bash

echo "🚀 Deploying agentic-rag (v1) with rate limit fix..."

# Navigate to project directory
cd "$(dirname "$0")/.." || exit 1

# Deploy the function
echo "📦 Deploying Edge Function..."
npx supabase functions deploy agentic-rag \
  --project-ref ngrqwmvuhvjkeohesbxs \
  --no-verify-jwt

if [ $? -eq 0 ]; then
  echo "✅ Successfully deployed agentic-rag with rate limit fix!"
  echo ""
  echo "📝 Changes included:"
  echo "  - Retry logic with exponential backoff for rate limits"
  echo "  - Embedding cache utilization (24h TTL)"
  echo "  - Fallback to text search when embeddings fail"
  echo "  - Neighborhood extractor for regime queries"
  echo ""
  echo "🔍 Test the deployment:"
  echo "  node scripts/test-v1-diagnostic.mjs"
else
  echo "❌ Deployment failed!"
  exit 1
fi