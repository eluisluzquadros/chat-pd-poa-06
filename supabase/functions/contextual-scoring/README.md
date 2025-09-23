# Contextual Scoring Function

Esta função implementa o Sistema de Scoring Contextual Inteligente para melhorar a relevância dos resultados do RAG.

## Deploy Manual

Para fazer o deploy desta função:

```bash
# 1. Instalar Supabase CLI (se não instalado)
npm install -g supabase

# 2. Fazer login no Supabase
supabase login

# 3. Linkar com seu projeto
supabase link --project-ref YOUR_PROJECT_ID

# 4. Deploy da função
supabase functions deploy contextual-scoring

# 5. Verificar logs
supabase functions logs contextual-scoring
```

## Configuração

Esta função requer as seguintes variáveis de ambiente:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Teste Local

```bash
# Servir localmente
supabase functions serve contextual-scoring

# Testar com curl
curl -X POST http://localhost:54321/functions/v1/contextual-scoring \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Quais são os requisitos de certificação sustentável?",
    "matches": [
      {
        "content": "Certificação verde e sustentabilidade são requisitos.",
        "similarity": 0.7,
        "document_id": "test_doc"
      }
    ]
  }'
```

## Integração

Esta função é chamada automaticamente pelo `enhanced-vector-search` e não precisa ser chamada diretamente pela aplicação.