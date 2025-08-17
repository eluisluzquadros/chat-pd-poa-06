# 🚀 DEPLOY MANUAL DA EDGE FUNCTION

## Opção 1: Via Terminal (Windows)

Execute os seguintes comandos no terminal:

```bash
# 1. Instalar Supabase CLI no Windows (escolha uma opção):

# Opção A - Com Scoop:
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Opção B - Download direto (PowerShell como Admin):
# Baixe de: https://github.com/supabase/cli/releases
# Escolha: supabase_windows_amd64.zip
# Extraia e adicione ao PATH

# Opção C - Usar npx (sem instalação):
npx supabase login
npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs
```

## Opção 2: Via Supabase Dashboard

1. Acesse: https://app.supabase.com/project/ngrqwmvuhvjkeohesbxs/functions

2. Encontre a função `agentic-rag`

3. Clique em "View/Edit"

4. **IMPORTANTE**: Substitua TODO o código pelo conteúdo do arquivo:
   `supabase/functions/agentic-rag/index.ts`

5. Clique em "Save" e depois "Deploy"

## Opção 3: Criar Nova Função

Se as opções acima não funcionarem:

1. No Dashboard, clique em "New Function"

2. Nome: `agentic-rag-fixed`

3. Cole o código de `supabase/functions/agentic-rag/index.ts`

4. Deploy

5. Atualize `src/services/chatServiceV2.ts`:
   ```typescript
   const endpoint = this.useAgenticRAG && options.useAgenticRAG !== false
     ? 'agentic-rag-fixed'  // Mudou aqui!
     : 'agentic-rag-fixed';  // E aqui!
   ```

## 🧪 Teste Após Deploy

Abra http://localhost:8080/chat e teste:

1. "Art. 1 da LUOS" → Deve retornar as normas de uso e ocupação
2. "Quantos bairros protegidos" → Deve retornar 25
3. "Alberta dos Morros" → Deve retornar 18m de altura

## ⚠️ Importante

O código local está 100% funcional com fallbacks implementados. 
Só precisa ser deployado no Supabase para funcionar no navegador!