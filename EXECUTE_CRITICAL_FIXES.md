# 🚨 CORREÇÕES CRÍTICAS URGENTES - Execute IMEDIATAMENTE

Estas correções são URGENTES pois estão causando respostas incorretas aos usuários e penalizando severamente o score QA (82%).

## 📋 Ordem de Execução

### 1. Corrigir dados do Bairro Cristal (índice 2.375)
```bash
# Execute no Supabase SQL Editor
# Arquivo: FIX_BAIRRO_CRISTAL_DATA.sql
```

### 2. Corrigir ZOTs com coeficiente > 4
```bash
# Execute no Supabase SQL Editor
# Arquivo: FIX_ZOTS_COEF_MAIOR_4.sql
```

### 3. Corrigir dados do Três Figueiras
```bash
# Execute no Supabase SQL Editor
# Arquivo: FIX_TRES_FIGUEIRAS_DATA.sql
```

### 4. Corrigir listagem completa de bairros ZOT 08
```bash
# Execute no Supabase SQL Editor
# Arquivo: FIX_ZOT08_BAIRROS.sql
```

## 🎯 Resultados Esperados

Após executar todos os SQLs:

1. **Bairro Cristal**: Retornará índice de aproveitamento médio = 2.375
2. **ZOTs com coef > 4**: Listará ZOT 06, 07, 08, 08.1, 08.2, 08.3, 11, 12, 13
3. **Três Figueiras**: Mostrará ZOT 04, 07 e 08.3-C com parâmetros corretos
4. **ZOT 08**: Listará todos os 55+ bairros, não apenas 3

## ⚡ Ação Imediata

1. Abra o Supabase SQL Editor
2. Execute cada arquivo SQL na ordem indicada
3. Teste no chat se as respostas estão corretas
4. Execute nova validação QA para verificar melhoria no score

## 🔍 Verificação

Após executar, teste estas perguntas no chat:
- "Qual é o índice de aproveitamento médio do bairro Cristal?"
- "Quais as ZOT com coeficiente de aproveitamento maior do que 4?"
- "O que pode ser construído no bairro Três Figueiras?"
- "zot 8 pertence a que bairro?"