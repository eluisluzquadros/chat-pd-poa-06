# 🚨 PLANO URGENTE - Correção do Sistema SQL

## Diagnóstico do Problema

Todas as queries SQL estão falhando, indicando um problema sistêmico. Possíveis causas:

1. **Função RPC `execute_sql_query` com erro**
2. **Tabela `document_rows` vazia ou com estrutura diferente**
3. **Problemas de permissão no banco**
4. **Dataset IDs incorretos**

## Ações Imediatas

### 1. Execute os SQLs de Debug no Supabase
```bash
# Arquivo: TEST_SQL_QUERIES_DIRECTLY.sql
# Execute cada query individualmente para identificar o problema
```

### 2. Verifique/Recrie a função execute_sql_query
```bash
# Arquivo: FIX_EXECUTE_SQL_FUNCTION.sql
# Execute no Supabase SQL Editor
```

### 3. Teste a função de debug
1. Abra `test-sql-debug.html` no navegador
2. Clique em "Test SQL Debug"
3. Verifique o resultado no console

### 4. Verifique os logs do Supabase
1. Vá para o Dashboard do Supabase
2. Functions > sql-generator > Logs
3. Procure por erros específicos

## Hipóteses Principais

### Hipótese 1: Dados não foram carregados
- Verifique se `document_rows` tem dados
- Confirme os dataset_ids corretos

### Hipótese 2: Função RPC quebrada
- A função pode estar retornando erro silencioso
- O `.limit(100)` após RPC pode estar causando problemas

### Hipótese 3: Estrutura JSONB diferente
- Os campos podem ter nomes diferentes
- O row_data pode não ser JSONB

## Solução Temporária

Se a função RPC estiver quebrada, podemos:
1. Remover o uso de `execute_sql_query`
2. Usar queries diretas com Supabase client
3. Modificar sql-generator para não usar RPC

## Próximos Passos

1. **Execute TEST_SQL_QUERIES_DIRECTLY.sql** - Identifique exatamente onde está o problema
2. **Verifique os resultados** - Tabela existe? Tem dados? Campos corretos?
3. **Corrija baseado nos resultados** - Ajuste queries ou estrutura conforme necessário
4. **Teste novamente** - Use o chat para verificar se funcionou