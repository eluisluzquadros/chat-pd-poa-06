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
npx supabase functions deploy qa-validator --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs
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

### 1. Executar Migrações

```bash
# Via Dashboard (Recomendado)
# Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql

# Via CLI (necessita connection string)
npx supabase db push --db-url "postgresql://[user]:[password]@[host]/[database]"
```

### 2. Criar Nova Migração

```bash
# Criar arquivo de migração
npx supabase migration new [nome-da-migracao]

# Exemplo:
npx supabase migration new add_user_preferences
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

---

**Última atualização:** 29/07/2025
**Mantido por:** Claude & Team