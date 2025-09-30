# Como Aplicar a Migração no Supabase

## Arquivo de Migração
`20250930_create_user_tables_and_fix_oauth.sql`

## ✨ Migração Idempotente
Esta migração pode ser executada **múltiplas vezes sem erro**. Ela:
- Não cria objetos duplicados
- Remove policies existentes antes de recriar
- Ignora inserções duplicadas
- É segura para re-executar

## Passos para Aplicar:

### Opção 1: Via Supabase Dashboard (Recomendado)

1. **Acesse o Supabase Dashboard**
   - Vá para: https://supabase.com/dashboard
   - Selecione seu projeto

2. **Navegue até SQL Editor**
   - No menu lateral, clique em "SQL Editor"
   - Clique em "New Query"

3. **Cole o Conteúdo da Migração**
   - Copie todo o conteúdo do arquivo `20250930_create_user_tables_and_fix_oauth.sql`
   - Cole no editor SQL

4. **IMPORTANTE: Atualize o Admin User ID**
   - Localize a linha: `'ADMIN_USER_ID_PLACEHOLDER'::uuid`
   - Substitua por seu UUID real de admin (obtenha do Auth > Users no dashboard)
   - Exemplo: `'d430b2b5-130a-4e02-a8aa-35ee4e8362d5'::uuid`

5. **Execute a Migração**
   - Clique em "Run" ou pressione `Ctrl/Cmd + Enter`
   - Verifique se não há erros

### Opção 2: Via Supabase CLI (Avançado)

```bash
# Se tiver o Supabase CLI instalado
supabase db push
```

## Verificação Pós-Migração

Execute estas queries para verificar:

```sql
-- Verificar se as tabelas foram criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_accounts', 'user_roles');

-- Verificar se a função foi corrigida
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'validate_oauth_access';

-- Testar a função
SELECT validate_oauth_access('admin@chat-pd-poa.org', 'd430b2b5-130a-4e02-a8aa-35ee4e8362d5'::uuid);
```

## O que Esta Migração Faz:

1. ✅ Cria tabela `user_accounts` com campos: user_id, email, full_name, role, is_active
2. ✅ Cria tabela `user_roles` para roles adicionais dos usuários
3. ✅ Cria índices para melhor performance
4. ✅ Corrige a função `validate_oauth_access` (remove ambiguidade de nomes de colunas)
5. ✅ Configura RLS (Row Level Security) nas novas tabelas
6. ✅ Insere usuário admin inicial
7. ✅ Define permissões adequadas

## Após Aplicar:

O Google OAuth deve funcionar corretamente:
- Usuários novos serão auto-provisionados com role 'citizen'
- Usuários existentes serão validados corretamente
- Não mais erro "Could not find the function public.validate_oauth_acr"
