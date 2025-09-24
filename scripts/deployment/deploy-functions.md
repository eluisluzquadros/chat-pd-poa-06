# Deploy das Edge Functions no Supabase Cloud

## Importante: Edge Functions no Supabase Cloud

As Edge Functions que estão na pasta `supabase/functions` precisam ser deployadas no seu projeto Supabase Cloud.

### Opção 1: Deploy via Dashboard (Mais Fácil)

1. Acesse seu projeto em https://supabase.com/dashboard
2. Vá para **Functions** no menu lateral
3. Clique em **Create a new function**
4. Para cada função, crie com os seguintes nomes:
   - `agentic-rag`
   - `query-analyzer`
   - `sql-generator`
   - `response-synthesizer`
   - `enhanced-vector-search`
   - `multiLLMService`

5. Copie o código de cada arquivo `.ts` correspondente em `supabase/functions/[nome-da-funcao]/index.ts`

### Opção 2: Use o SQL Query Proxy (Alternativa Temporária)

Enquanto não faz o deploy das functions, você pode usar as functions através do SQL Query Proxy:

1. No dashboard do Supabase, vá para **SQL Editor**
2. Execute as migrações SQL que estão em:
   - `supabase/migrations/20240729000001_quality_metrics.sql`
   - `supabase/migrations/20240729000002_query_cache.sql`
   - `supabase/migrations/20240729000003_message_feedback.sql`

### Configuração das Secrets

No dashboard do Supabase:
1. Vá para **Settings** > **Edge Functions**
2. Adicione as seguintes secrets:
   - `OPENAI_API_KEY` = sua chave OpenAI

## Teste Rápido

Após configurar, acesse: http://localhost:8080

Se aparecer algum erro relacionado às Edge Functions, você pode temporariamente usar o modo de desenvolvimento local ou fazer o deploy manual das functions.

## Alternativa: Modo Desenvolvimento Simplificado

Se preferir testar sem as Edge Functions por enquanto, posso criar uma versão simplificada que funciona apenas com as APIs diretas.