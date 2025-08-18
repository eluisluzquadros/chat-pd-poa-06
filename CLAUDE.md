# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chat PD POA is an AI-powered virtual assistant for Porto Alegre's Urban Development Plan (PDUS 2025). It uses RAG (Retrieval-Augmented Generation) architecture with Supabase Edge Functions and PostgreSQL + pgvector for semantic search. The system processes queries about urban regulations, construction parameters, disaster risks, and zoning information.

## Key Architecture Components

### 1. Frontend (React + Vite + TypeScript)
- **Entry**: `src/App.tsx` - Main application router
- **Pages**: `src/pages/` - Route components (Auth, Chat, Admin dashboards)
- **Components**: `src/components/` - Reusable UI components
- **Services**: `src/services/` - API integrations (multiLLMService, chatService)
- **Hooks**: `src/hooks/` - Custom React hooks for state management
- **UI Library**: shadcn/ui components in `src/components/ui/`

### 2. Backend (Supabase Edge Functions)
The RAG pipeline consists of 5 main Edge Functions that work in sequence:
1. **agentic-rag**: Main orchestrator that coordinates the entire query processing
2. **query-analyzer**: Analyzes user intent and determines search strategy
3. **sql-generator**: Converts natural language to SQL for structured data queries
4. **enhanced-vector-search**: Performs semantic search on document embeddings
5. **response-synthesizer**: Combines results into coherent Portuguese responses

### 3. Database Structure
- **document_rows**: Tabular data (zones, neighborhoods, parameters)
- **document_sections**: Document chunks with embeddings for semantic search
- **query_cache**: Performance optimization cache
- **qa_test_cases**: Quality assurance test scenarios
- **regime_urbanistico_***: Urban planning regulation tables

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Run type checking
npm run type-check

# Run tests
npm run test
npm run test:watch
npm run test:coverage

# Run integration tests
npm run test:integration

# Test LLM connections
npm run test-llm-connections

# Validate API keys
npm run validate-keys
```

## Supabase Edge Functions Deployment

```bash
# Deploy a specific function
npx supabase functions deploy [function-name] --project-ref ngrqwmvuhvjkeohesbxs

# Deploy main RAG functions
npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy query-analyzer --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy sql-generator --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy enhanced-vector-search --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs

# Deploy all functions using the script
npm run deploy-functions
```

## Database Operations

```bash
# Import regime urbanístico data
npm run regime:import

# Check regime status
npm run regime:status

# Test regime queries
npm run regime:test

# Run QA validation tests
npm run test:qa

# Clear query cache
node scripts/clear-cache-and-fix.ts
```

## Environment Setup

1. Copy `.env.example` to `.env.local`
2. Required environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for backend operations)
   - `NEXT_PUBLIC_SUPABASE_CLI_KEY`:
   - `OPENAI_API_KEY`: LLM API key
   - `ANTHROPIC_API_KEY`: LLM API key
   - `GEMINI_API_KEY`: LLM API key
   - `DEEPSEEK_API_KEY`: LLM API key
   - `ZHIPUAI_API_KEY`: LLM API key

3. Deploy environment variables to Supabase:
   ```bash
   npm run deploy-env
   ```

## Testing Strategy

### Unit Tests
- Located in `tests/` directory
- Test individual Edge Functions and services
- Run with `npm run test`

### Integration Tests
- Test full RAG pipeline end-to-end
- Located in `scripts/test-*.mjs` files
- Run with `npm run test:integration`

### QA Validation
- Automated quality checks against predefined test cases
- Run with `npm run test:qa`
- Monitor results in Admin Dashboard at `/admin/quality`

## RAG Pipeline Flow

```
User Query → agentic-rag (orchestrator)
                ↓
         query-analyzer (intent analysis)
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
sql-generator        enhanced-vector-search
(structured data)    (document embeddings)
    ↓                       ↓
    └───────────┬───────────┘
                ↓
       response-synthesizer
         (final answer)
```

## Key Data Sources

1. **Structured Data** (PostgreSQL tables):
   - Zoning information (ZOTs)
   - Neighborhood parameters
   - Construction height limits
   - Risk areas

2. **Document Embeddings** (pgvector):
   - PDUS 2025 documents
   - Urban planning regulations (LUOS)
   - Q&A knowledge base

## Multi-LLM Support

The system supports multiple LLM providers through `multiLLMService`:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude 3 Opus, Sonnet, Haiku)
- Google (Gemini Pro, Flash)
- Groq (Mixtral, Llama)
- DeepSeek (Coder, Chat)

Model selection can be configured per query or globally in the admin dashboard.

## Debugging Tips

1. **Check Edge Function Logs**:
   - Supabase Dashboard → Edge Functions → Select function → Logs tab

2. **Test Individual Functions**:
   ```bash
   # Test query analyzer
   node test-query-analyzer.mjs
   
   # Test SQL generator
   node test-sql-generator-direct.mjs
   ```

3. **Clear Cache for Fresh Results**:
   ```bash
   node scripts/clear-cache-and-fix.ts
   ```

4. **Monitor Performance**:
   - Admin Dashboard → Benchmark tab
   - Check token usage and response times

## Common Issues and Solutions

1. **"Bairro not found" errors**: Usually a cache issue. Clear cache and retry.
2. **Slow responses**: Check if query cache is working properly.
3. **Wrong LLM model**: Verify API keys in Supabase secrets.
4. **Deployment failures**: Ensure you're using `--project-ref ngrqwmvuhvjkeohesbxs`

## Security Considerations

- All Edge Functions require JWT authentication
- Service role key should only be used server-side
- API keys are stored as Supabase secrets
- Row-level security (RLS) is enabled on sensitive tables

## Performance Optimization

1. **Query Cache**: Automatic caching of common queries
2. **Hierarchical Chunking**: Optimized document splitting
3. **Composite Indexes**: Database indexes for fast lookups
4. **Token Tracking**: Monitor and optimize LLM token usage

## Admin Features

Access admin panel at `/admin` (requires admin role):

### Dashboard Routes
- `/admin` - Main dashboard with system metrics
- `/admin/users` - User management and roles
- `/admin/quality` - QA testing (121 test cases)
- `/admin/benchmark` - Compare all 21 LLM models
- `/admin/feedback` - User feedback analysis
- `/admin/knowledge` - Knowledge base management
- `/admin/test-qa` - Manual QA test execution
- `/admin/test-cases` - Manage test cases

### Key Features
- **Real-time Metrics**: Token usage, response times, error rates
- **Agent Monitoring**: Track performance of all 5 agents
- **Session Viewer**: Review conversation history with context
- **Knowledge Graph Editor**: Visual graph management
- **Benchmark Tools**: Compare model accuracy and speed
- **Test Runner**: Execute and monitor QA test runs

## Architecture Decisions

### Why Agentic-RAG v2.0?
- **Self-refinement**: Automatically improves responses when confidence < 70%
- **Specialized agents**: Each agent focuses on specific domain expertise
- **Parallel processing**: Multiple agents work simultaneously
- **Knowledge graph**: Better understanding of legal relationships
- **Session memory**: Maintains context across conversations

### Database Indexing Strategy
- Composite indexes on frequently joined columns
- GIN indexes for full-text search
- HNSW indexes for vector similarity (pgvector)
- Partial indexes for filtered queries

### Caching Strategy
- Query cache: 24-hour TTL for common queries
- Session memory: 7-day retention
- Embedding cache: Permanent for processed documents
- Agent results: 1-hour cache for identical inputs

## Project-Specific Conventions

### Error Handling
- All Edge Functions return standardized error responses
- Errors logged to `error_logs` table with correlation IDs
- Client-side retry logic for transient failures

### Testing Requirements
- All new Edge Functions must include unit tests
- QA test cases must be added for new query types
- Benchmark new LLM models before adding to production

### Deployment Checklist
1. Run `npm run test` locally
2. Deploy functions: `npm run deploy-functions`
3. Deploy environment: `npm run deploy-env`
4. Run integration tests: `npm run test:integration`
5. Verify deployment: `npm run verify-deployment`
6. Monitor logs: `supabase functions logs --project-ref ngrqwmvuhvjkeohesbxs`