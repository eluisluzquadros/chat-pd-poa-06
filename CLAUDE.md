# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chat PD POA is a legal consultation system for Porto Alegre's urban planning regulations (PDPOA 2025). It provides AI-powered assistance for understanding urban planning laws, zoning regulations, and construction parameters.

### Core Features
- **Agentic RAG System**: Multi-stage retrieval with 86.7% accuracy (target: >95%)
- **Multi-LLM Support**: Intelligent routing between OpenAI, Claude, Gemini, DeepSeek, ZhipuAI.
- **Dual Data Architecture**: Semantic search (chunks) + Structured SQL (tables)
- **QA Validation System**: 125 test cases for continuous accuracy monitoring
- **Real-time Chat**: Context-aware conversations with legal citations
- **Administrative Dashboard**: Performance metrics and quality control

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Edge Functions**: Deno runtime with TypeScript
- **AI/LLM**: OpenAI, Claude (Anthropic), Google Gemini, DeepSeek, Groq
- **Database**: PostgreSQL with pgvector extension for embeddings

## Key Commands

### Development
```bash
# Install all dependencies
npm run install:all

# Run frontend development server
npm run dev:frontend  # or just npm run dev

# Run both frontend and backend
npm run dev:all

# Type checking
cd frontend && npm run type-check

# Linting
cd frontend && npm run lint
```

### Building & Deployment
```bash
# Build frontend
npm run build

# Deploy all edge functions
npm run deploy:functions
cd scripts && npm run deploy-functions  # Alternative method

# Complete deployment
npm run deploy:all
```

### Testing
```bash
# Run frontend tests
cd frontend && npm test

# Run test with coverage
cd frontend && npm run test:coverage

# Run RAG system tests
cd scripts && npm run test:qa

# Validate API keys
cd frontend && npm run validate-keys

# Test LLM connections
cd frontend && npm run test-llm-connections
```

### Database & Knowledge Base
```bash
# Process knowledge base locally
cd frontend && npm run kb:process

# Import knowledge base to Supabase
cd frontend && npm run kb:import-full  # Full import with clear
cd frontend && npm run kb:import      # Regular import

# Generate embeddings
cd frontend && npm run kb:embeddings
cd frontend && npm run kb:embeddings-batch  # Batch processing

# Regime Urbanístico CLI
cd frontend && npm run regime:status   # Check status
cd frontend && npm run regime:setup    # Setup tables
cd frontend && npm run regime:import   # Import data
cd frontend && npm run regime:test     # Test queries
```

## Knowledge Base Architecture

### Available Data Sources - ALL DATA IS IN DATABASE ✅
The `legal_articles` table contains **1,998 records** with 4 document types:

1. **Legal Documents (✅ Active in RAG)**
   - LUOS: 398 records (19.9%)
   - PDUS: 720 records (36.0%)
   - **Status**: Being queried by agentic-rag

2. **Regime Urbanístico Data (❌ NOT QUERIED)**
   - REGIME_FALLBACK: 864 records (43.2%)
   - Contains all neighborhood/zone data
   - **PROBLEM**: agentic-rag doesn't query this type!

3. **QA Knowledge Base (❌ NOT QUERIED)**
   - QA_CATEGORY: 16 records (0.8%)
   - Validated Q&A responses
   - **PROBLEM**: agentic-rag doesn't query this type!

4. **Structured Regime Table (✅ Active)**
   - `regime_urbanistico_consolidado`: 385 records
   - SQL queries for specific parameters

5. **Test Cases (⚠️ Partial Use)**
   - `qa_test_cases` table: 125 test cases
   - Used for validation only

### Critical Discovery
- **Data in database**: 100% ✅ (All 1,998 records present)
- **Data being queried**: Only 56% (LUOS + PDUS)
- **Data IGNORED**: 44% (REGIME_FALLBACK + QA_CATEGORY)
- **Content field**: Data is in `full_content`, not `content`!

### Current System Performance
- **Accuracy**: 86.7% on 125 test cases
- **Response Time**: ~3-5 seconds average
- **Cache Hit Rate**: ~30% (24-hour TTL)
- **Knowledge Base Usage**: Only 56% of available data being queried

### RAG Pipeline Versions
- **agentic-rag** (Main - Currently Active): Integrated V3 features, handles all /chat requests
- **agentic-rag-v2**: Referenced but never implemented
- **agentic-rag-v3**: Exists separately but not used in production

## Architecture

### Directory Structure
- `frontend/` - React application
  - `components/` - Reusable UI components organized by feature
  - `pages/` - Route pages (Index, Chat, Explorer, etc.)
  - `services/` - API services and business logic
  - `hooks/` - Custom React hooks
  - `lib/` - Utility functions and helpers
  - `types/` - TypeScript type definitions

- `backend/supabase/` - Supabase configuration and functions
  - `functions/` - Edge Functions (40+ specialized functions)
    - `agentic-rag-v3/` - Main RAG orchestrator
    - `query-analyzer/` - Query understanding
    - `sql-generator/` - SQL query generation
    - `response-synthesizer/` - Response formatting
  - `migrations/` - Database migrations

- `scripts/` - Utility scripts and tools
  - `deploy/` - Deployment scripts
  - `import/` - Data import utilities
  - `tests/` - Test suites
  - `utils/` - Helper utilities
  - `sql/` - SQL scripts for manual execution

### Core Systems

1. **Agentic RAG Pipeline**
   - V3 implementation with improved accuracy
   - Hierarchical document chunking
   - Multi-stage retrieval with fallback mechanisms
   - Intelligent caching system

2. **Multi-LLM Router**
   - Automatic model selection based on query complexity
   - Fallback chains for reliability
   - Cost optimization logic

3. **QA Validation System**
   - 125 test cases covering legal queries
   - Automated accuracy benchmarking
   - Cross-validation capabilities

4. **Knowledge Base**
   - Legal articles from LUOS and PDUS
   - Regime Urbanístico data (zoning regulations)
   - Disaster risk information
   - Vector embeddings for semantic search

## Environment Variables

Required in `.env` or Supabase secrets:
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Claude API key  
- `GOOGLE_GENERATIVE_AI_API_KEY` - Gemini API key
- `GROQ_API_KEY` - Groq API key
- `DEEPSEEK_API_KEY` - DeepSeek API key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin operations)

## Database Tables

Key tables to understand:
- `legal_articles` - Legal document chunks with embeddings
- `qa_test_cases` - Test cases for validation
- `qa_runs` - Validation run history
- `regime_urbanistico_consolidado` - Zoning regulations data
- `query_cache` - Response caching
- `message_feedback` - User feedback tracking

## Testing Strategy

1. **Unit Tests**: Component and function level tests
2. **Integration Tests**: RAG pipeline and database operations
3. **E2E Tests**: Full user workflows
4. **QA Validation**: Accuracy benchmarking against ground truth

Run specific test suites:
```bash
cd scripts/tests
npm test query-analyzer.test.ts
npm test response-synthesizer.test.ts
npm test rag-system.test.ts
```

## Common Development Tasks

### Adding a New Edge Function
1. Create folder in `backend/supabase/functions/function-name/`
2. Add `index.ts` with Deno-compatible code
3. Update `backend/supabase/config.toml` if JWT verification needed
4. Deploy with `npx supabase functions deploy function-name`

### Updating the Knowledge Base
1. Place documents in `docs/knowledgebase/`
2. Run `npm run kb:process` to process locally
3. Run `npm run kb:import-full` to import to database
4. Run `npm run kb:embeddings-batch` to generate embeddings

### Running QA Validation
1. Ensure test cases are loaded: `SELECT COUNT(*) FROM qa_test_cases;`
2. Run validation from admin dashboard or via script
3. Check results in `qa_runs` and `qa_run_details` tables

## Important Patterns

- **Error Handling**: All Edge Functions return standardized error responses
- **Rate Limiting**: Implemented at Edge Function level
- **Caching**: Query results cached for 24 hours by default
- **Logging**: Metrics tracked in `llm_metrics` table
- **Security**: RLS (Row Level Security) enabled on sensitive tables

## Debugging

- Edge Functions logs: `npx supabase functions serve` locally
- Frontend logs: Browser DevTools console
- Database queries: Supabase Studio SQL editor
- Test failures: Check `test-reports/` directory

## Known Issues & Improvement Opportunities

### ⚠️ CRITICAL BUG: 44% of Data Being Ignored!
The data is 100% present in the database, but agentic-rag only queries 56% of it!

### The Real Problem
```typescript
// CURRENT (WRONG) - Only searches 2 of 4 document types
.or('document_type.eq.LUOS,document_type.eq.PDUS')  // ❌ Missing 880 records!

// SHOULD BE - Search all document types
.in('document_type', ['LUOS', 'PDUS', 'REGIME_FALLBACK', 'QA_CATEGORY'])  // ✅
```

### Quick Fix (Can improve accuracy to >95% in minutes!)
```typescript
// File: backend/supabase/functions/agentic-rag/index.ts
// Line ~568-582

// CHANGE FROM:
const { data: legalResults } = await supabase
  .from('legal_articles')
  .select('*')
  .or('document_type.eq.LUOS,document_type.eq.PDUS')

// CHANGE TO:
const { data: legalResults } = await supabase
  .from('legal_articles')
  .select('*')
  .in('document_type', ['LUOS', 'PDUS', 'REGIME_FALLBACK', 'QA_CATEGORY'])
```

### Other Issues
1. **Wrong field name**: Using `content` instead of `full_content`
2. **No fallback to qa_test_cases**: Missing opportunity for validated answers
3. **Limited context window**: Only 3 messages of history

## Performance Considerations

- Vector search uses pgvector with HNSW indexes
- Composite indexes on frequently queried columns
- Query cache reduces redundant LLM calls (24h TTL)
- Batch processing for embeddings generation
- Connection pooling for database operations
- Token limit: 3000 tokens per context window

## Critical Files to Understand

### RAG Pipeline
- `backend/supabase/functions/agentic-rag/index.ts` - Main orchestrator
- `frontend/lib/unifiedRAGService.ts` - Frontend integration
- `frontend/services/chatService.ts` - Chat service layer

### Knowledge Base
- `docs/knowledgebase/PDPOA2025-Regime_Urbanistico_Consolidado.csv` - Source data
- `scripts/import-regime-from-csv-complete.mjs` - Regime importer
- `scripts/process-knowledge-base-local.mjs` - KB processor

### Testing & Validation
- `scripts/run-qa-tests.ts` - QA test runner
- `frontend/components/admin/QADashboard.tsx` - Admin interface
