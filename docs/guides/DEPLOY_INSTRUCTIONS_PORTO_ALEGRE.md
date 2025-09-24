# INSTRUÇÕES PARA DEPLOY MANUAL

## 1. Via Dashboard Supabase
1. Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions
2. Encontre a função "query-analyzer"
3. Clique em "Edit"
4. Cole o código atualizado de: supabase/functions/query-analyzer/index.ts
5. Clique em "Save and Deploy"

## 2. Correções Aplicadas
- Adicionada regra para NÃO tratar "Porto Alegre" como bairro
- Pós-processamento remove "PORTO ALEGRE" da lista de bairros
- Queries genéricas sobre a cidade agora retornam intent: "conceptual"

## 3. Resultado Esperado
- "altura máxima em porto alegre" → Consulta conceitual sobre a cidade
- "coeficiente de aproveitamento de porto alegre" → Consulta conceitual
- NÃO deve mais retornar dados específicos de Petrópolis
