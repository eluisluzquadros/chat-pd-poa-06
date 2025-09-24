# Guia Supabase CLI - Chat PD POA

## 🔑 Informações do Projeto

- **Project ID:** ngrqwmvuhvjkeohesbxs
- **Dashboard:** https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs
- **URL:** https://ngrqwmvuhvjkeohesbxs.supabase.co

## 📋 Comandos Essenciais

### 1. Deploy de Edge Functions

```bash
# Deploy de uma função específica
npx supabase functions deploy [nome-da-funcao] --project-ref ngrqwmvuhvjkeohesbxs

# Exemplos:
npx supabase functions deploy query-analyzer --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy sql-generator --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy qa-validator --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs

# Deploy de todas as funções de uma vez
npx supabase functions deploy --project-ref ngrqwmvuhvjkeohesbxs
```

### 2. Listar Functions Disponíveis

```bash
# Ver todas as functions locais
ls supabase/functions/
```

### 3. Criar Nova Function

```bash
# Criar nova edge function
npx supabase functions new [nome-da-funcao]
```

### 4. Invocar Function (Teste)

```bash
# Exemplo de invocação
curl -L -X POST 'https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/[nome-da-funcao]' \
  -H 'Authorization: Bearer [YOUR ANON KEY]' \
  -H 'Content-Type: application/json' \
  --data '{"key":"value"}'
```

## 🗄️ Comandos de Banco de Dados

### 1. Executar Queries SQL

```bash
# Via Node.js com Supabase Client
node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);
// Sua query aqui
const { data, error } = await supabase
  .from('document_rows')
  .select('*')
  .limit(5);
console.log(data);
"

# Via Dashboard (Recomendado para queries complexas)
# Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql
```

### 2. Executar Migrações

```bash
# Via Dashboard (Recomendado)
# Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql

# Via CLI (necessita connection string)
npx supabase db push --db-url "postgresql://[user]:[password]@[host]/[database]"
```

### 3. Criar Nova Migração

```bash
# Criar arquivo de migração
npx supabase migration new [nome-da-migracao]

# Exemplo:
npx supabase migration new add_user_preferences
```

### 4. Limpar Cache de Queries

```bash
# Script para limpar cache
node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);
// Limpar todo o cache
const { error } = await supabase.from('query_cache').delete().gte('id', 0);
console.log(error ? 'Erro: ' + error.message : 'Cache limpo com sucesso!');
"
```

## 🚀 Workflow de Deploy Completo

### Para Edge Functions:

1. **Fazer alterações** no código da função
2. **Testar localmente** (se possível)
3. **Deploy:**
   ```bash
   npx supabase functions deploy [nome-da-funcao] --project-ref ngrqwmvuhvjkeohesbxs
   ```
4. **Verificar no dashboard:** https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions

### Para SQL/Migrations:

1. **Criar arquivo** em `supabase/migrations/`
2. **Executar via Dashboard** (mais seguro)
3. **Ou via CLI** com connection string

## ⚠️ Notas Importantes

1. **Sempre use** `--project-ref ngrqwmvuhvjkeohesbxs` nos comandos
2. **Docker warning** pode ser ignorado para deploys simples
3. **Para SQL complexo**, prefira o Dashboard para evitar erros
4. **Guarde este arquivo** - contém informações críticas do projeto
5. **Service role key** incluído neste arquivo tem acesso total - use com cuidado

## 📝 Checklist de Deploy

- [ ] Código testado localmente
- [ ] Backup do banco (se alterando estrutura)
- [ ] Deploy da function com project-ref correto
- [ ] Verificar logs no dashboard
- [ ] Testar função em produção

## 🔧 Troubleshooting

### Erro: "Cannot find project ref"
```bash
# Use sempre:
--project-ref ngrqwmvuhvjkeohesbxs
```

### Erro: "Docker is not running"
- Pode ignorar para deploys simples
- Functions ainda serão deployadas

### Erro: "unknown flag"
- Verifique a sintaxe do comando
- Use `npx supabase [comando] --help` para ver opções

## 🎯 Comandos Úteis Recentes

### Deploy Rápido de Funções Principais
```bash
# Deploy das 5 funções principais do sistema
npx supabase functions deploy query-analyzer --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy sql-generator --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy qa-validator --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs
```

### Verificar Dados de um Bairro
```bash
# Criar arquivo test_bairro.mjs com:
node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);
const { data } = await supabase
  .from('document_rows')
  .select('row_data')
  .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
  .ilike('row_data->>Bairro', '%CAVALHADA%')
  .limit(5);
console.log('Encontrados:', data?.length || 0, 'registros');
data?.forEach(d => console.log(d.row_data));
"
```

### Limpar Cache de Query Específica
```bash
# Limpar cache de uma query específica
node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);
const { error } = await supabase
  .from('query_cache')
  .delete()
  .ilike('query', '%cavalhada%');
console.log(error ? 'Erro' : 'Cache limpo para queries com cavalhada');
"
```

---

**Última atualização:** 30/07/2025
**Mantido por:** Claude & Team