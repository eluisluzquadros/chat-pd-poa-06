# PROBLEMAS CRÍTICOS ENCONTRADOS - Chat PD POA

**Data da Validação**: 2025-08-21
**Sistema Testado**: agentic-rag (versão atual, não v3)

## 1. PROBLEMA PRINCIPAL: Sistema não retorna dados de regime urbanístico

### Taxa de Falha: 80% (8 de 10 bairros testados)

**Sintoma**: Mesmo com dados disponíveis no banco, o sistema não retorna valores numéricos específicos de altura máxima e coeficientes de aproveitamento.

**Dados disponíveis no banco**:
- ✅ 10/10 bairros têm dados na tabela `regime_urbanistico_consolidado`
- ✅ 7/10 bairros têm dados fallback em `legal_articles` tipo `REGIME_FALLBACK`
- ✅ Total de 385 registros estruturados disponíveis

**Resposta típica do sistema** (incorreta):
```
"Para fornecer informações específicas sobre altura máxima e coeficientes... 
é necessário consultar o regime urbanístico..."
```

**Resposta esperada** (com dados reais):
```
"Em ABERTA DOS MORROS, os parâmetros urbanísticos são:
- ZOT 04: Altura máxima 18m, CA básico 2, CA máximo 4
- ZOT 15: Altura máxima 9m, CA básico 0,3..."
```

## 2. PROBLEMA: Nomes de colunas case-sensitive não documentados

O sistema está tentando buscar com nomes de colunas incorretos:
- ❌ Buscando: `bairro`, `zona`, `altura_maxima`
- ✅ Correto: `"Bairro"`, `"Zona"`, `"Altura_Maxima___Edificacao_Isolada"`

## 3. PROBLEMA: Sistema não tem acesso ao schema do banco

O agentic-rag não conhece:
- Quais tabelas existem
- Quais colunas estão disponíveis
- Como os dados estão estruturados
- Qual a estratégia de fallback

## 4. RESULTADOS DOS TESTES

### Teste com 15 perguntas específicas:
- **Taxa de sucesso aparente**: ~60%
- **Taxa de sucesso REAL** (com validação de conteúdo): ~40%
- **Principais falhas**:
  - Não retorna valores específicos de regime urbanístico
  - Não encontra títulos/capítulos da LUOS
  - Respostas genéricas sem dados concretos

### Teste dos 10 bairros:
```
✅ Sucessos: 2/10 (20%)
  - AUXILIADORA
  - BELA VISTA

❌ Falhas: 8/10 (80%)
  - ABERTA DOS MORROS - sem valores numéricos
  - AGRONOMIA - não menciona bairro, erro
  - ANCHIETA - sem valores numéricos
  - ARQUIPÉLAGO - sem valores numéricos
  - AZENHA - sem valores numéricos
  - BELÉM NOVO - sem valores numéricos
  - BELÉM VELHO - sem valores numéricos
  - BOA VISTA - sem valores numéricos
```

## 5. DADOS CORRETOS NO BANCO (Exemplos verificados)

### PETRÓPOLIS
- **Zona**: ZOT 07
- **Altura Máxima**: 60m
- **CA Básico**: 3,6
- **CA Máximo**: 6,5

### ABERTA DOS MORROS
- **ZOT 04**: Altura 18m, CA 2-4
- **ZOT 15**: Altura 9m, CA 0,3-0
- **ZOT 02**: Altura 9m, CA 2-3
- **ZOT 01**: Altura 9m, CA 1,5-2,5
- **ZOT 14**: Altura 9m, CA 0,5-0

### CENTRO HISTÓRICO
- **CA Máximo**: 7
- **8 registros** disponíveis com diferentes zonas

## 6. AÇÕES NECESSÁRIAS

### URGENTE - Correções no agentic-rag:

1. **Corrigir queries SQL** para usar nomes corretos das colunas:
   ```sql
   SELECT * FROM regime_urbanistico_consolidado 
   WHERE "Bairro" ILIKE '%PETROPOLIS%'  -- Com aspas duplas!
   ```

2. **Implementar fallback correto**:
   - Primeiro: buscar em `regime_urbanistico_consolidado`
   - Se não encontrar: buscar em `legal_articles` tipo `REGIME_FALLBACK`
   - Se ainda não encontrar: busca semântica com embeddings

3. **Adicionar conhecimento do schema**:
   - Disponibilizar DATABASE_SCHEMA.md para o sistema
   - Criar função para consultar metadados
   - Documentar todos os nomes de colunas

4. **Melhorar extração de dados**:
   - Extrair valores numéricos dos registros
   - Formatar resposta com dados estruturados
   - Incluir todas as zonas quando múltiplas existirem

### IMPORTANTE - Validação:

5. **Criar testes automatizados** que verificam:
   - Se o valor retornado corresponde ao valor no banco
   - Se todos os 94 bairros retornam dados quando consultados
   - Se as queries estão usando os nomes corretos das colunas

## 7. IMPACTO NO USUÁRIO

Atualmente, o sistema está **falhando em sua função principal**:
- ❌ Usuário pergunta altura máxima em um bairro → sistema não responde com o valor
- ❌ Usuário pergunta sobre regime urbanístico → resposta genérica sem dados
- ❌ 80% das consultas sobre bairros falham

## 8. PRIORIDADE: CRÍTICA

Este problema precisa ser resolvido **IMEDIATAMENTE** pois:
1. Os dados EXISTEM no banco
2. O sistema NÃO está acessando corretamente
3. A taxa de falha é de 80%
4. É a funcionalidade principal do sistema