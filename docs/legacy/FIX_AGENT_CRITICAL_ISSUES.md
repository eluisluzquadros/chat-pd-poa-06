# 🔧 Correção das Falhas Críticas no Agente RAG

## Problemas Identificados

### 1. Bairro Cristal - Índice 2.375
- **Problema**: Agente diz que Cristal não está no escopo do PDUS
- **Causa Provável**: Query não está encontrando o bairro na base
- **SQL Debug**: 
```sql
-- Verificar se Cristal existe
SELECT DISTINCT row_data->>'Bairro' as bairro
FROM document_rows 
WHERE dataset_id = '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'
AND UPPER(row_data->>'Bairro') = 'CRISTAL';
```

### 2. ZOTs com Coeficiente > 4
- **Problema**: Query retorna vazio quando deveria retornar 9 ZOTs
- **Causa Provável**: Conversão numérica ou filtro incorreto
- **SQL Debug**:
```sql
SELECT DISTINCT
    row_data->>'Zona' as zona,
    (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric as ca_maximo
FROM document_rows 
WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
AND (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric > 4;
```

### 3. Três Figueiras - Construção
- **Problema**: Não encontra dados específicos do bairro
- **Causa Provável**: Nome do bairro com acentuação
- **SQL Debug**:
```sql
-- Testar variações do nome
SELECT DISTINCT row_data->>'Bairro' as bairro
FROM document_rows 
WHERE dataset_id = '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY'
AND UPPER(row_data->>'Bairro') LIKE '%FIGUEIRAS%';
```

### 4. ZOT 08 - Lista Incompleta
- **Problema**: Retorna apenas 3 bairros ao invés de 55+
- **Causa Provável**: Query com LIMIT ou filtro incorreto

## Plano de Correção

### 1. Atualizar sql-generator/index.ts

```typescript
// Adicionar regras específicas para casos problemáticos:

// Para índice de aproveitamento médio:
if (query.toLowerCase().includes('índice de aproveitamento médio')) {
  // Força query específica para média
  const bairroMatch = query.match(/bairro\s+(\w+)/i);
  if (bairroMatch) {
    return `
      SELECT 
        AVG(((row_data->>'Coeficiente de Aproveitamento - Básico')::numeric + 
             (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric) / 2) as indice_aproveitamento_medio
      FROM document_rows 
      WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
      AND UPPER(row_data->>'Bairro') = UPPER('${bairroMatch[1]}')
      AND row_data->>'Coeficiente de Aproveitamento - Básico' IS NOT NULL
      AND row_data->>'Coeficiente de Aproveitamento - Máximo' IS NOT NULL;
    `;
  }
}

// Para ZOTs com coeficiente > 4:
if (query.match(/zot.*coeficiente.*maior.*4/i)) {
  return `
    SELECT DISTINCT
        row_data->>'Zona' as zona,
        (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric as ca_maximo
    FROM document_rows 
    WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
    AND (row_data->>'Coeficiente de Aproveitamento - Máximo')::numeric > 4
    ORDER BY row_data->>'Zona';
  `;
}
```

### 2. Melhorar query-analyzer/index.ts

```typescript
// Adicionar detecção de "índice médio"
const isAverageQuery = query.toLowerCase().includes('médio') || 
                      query.toLowerCase().includes('média');

// Melhorar normalização de bairros
const normalizeBairro = (bairro: string): string => {
  return bairro
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
};
```

### 3. Corrigir response-synthesizer

- Adicionar validação para garantir que dados foram encontrados
- Melhorar mensagens de erro quando não encontra dados
- Evitar dizer "não está no escopo" quando é erro de query

## Ação Imediata

1. Execute os SQLs de debug no Supabase para confirmar que os dados existem
2. Implemente as correções no sql-generator 
3. Teste novamente as 4 perguntas críticas
4. Monitore logs para identificar onde as queries estão falhando