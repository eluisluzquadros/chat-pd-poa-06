# Sistema de Testes RAG - Plano Diretor Urbano Sustentável

Este diretório contém a suite completa de testes para validar o sistema RAG (Retrieval-Augmented Generation) do Plano Diretor de Porto Alegre.

## 📋 Visão Geral

O sistema de testes foi projetado para validar todos os componentes críticos do RAG:

- **Detecção e classificação de consultas**
- **Sistema de keywords e mapeamento de termos**
- **Scoring contextual e confiança**
- **Formatação de respostas**
- **Casos específicos (Sustentabilidade → Art. 81-III, 4º Distrito → Art. 74)**
- **Performance e precisão**

## 🗂️ Estrutura dos Testes

### Arquivos Principais

| Arquivo | Descrição | Foco |
|---------|-----------|------|
| `rag-system.test.ts` | Testes principais do sistema RAG | Integração end-to-end |
| `query-analyzer.test.ts` | Testes do analisador de consultas | Detecção de intent e entidades |
| `sql-generator.test.ts` | Testes do gerador SQL | Geração e execução de queries |
| `response-synthesizer.test.ts` | Testes do sintetizador | Formatação de respostas |
| `qa-validation.test.ts` | Testes de validação QA | Casos críticos conhecidos |

### Utilitários

| Arquivo | Descrição |
|---------|-----------|
| `test-runner.ts` | Executor de bateria completa de testes |
| `debug-tests.ts` | Testes de debug com logging verboso |
| `setup.ts` | Configuração global dos testes |
| `jest.config.js` | Configuração do Jest |

## 🚀 Como Executar

### Opção 1: Script Completo (Recomendado)
```bash
# Executa toda a suite de testes com relatórios
node run-tests.js
```

### Opção 2: Testes Individuais
```bash
# Teste específico do sistema RAG
npm test tests/rag-system.test.ts

# Teste do analisador de consultas
npm test tests/query-analyzer.test.ts

# Teste do gerador SQL
npm test tests/sql-generator.test.ts

# Teste do sintetizador de respostas
npm test tests/response-synthesizer.test.ts
```

### Opção 3: Bateria Completa com Casos Específicos
```bash
# Executa todos os casos de teste específicos
npx ts-node tests/test-runner.ts
```

### Opção 4: Testes de Debug
```bash
# Executa testes com logging verboso
npx ts-node tests/debug-tests.ts
```

## 📊 Casos de Teste Críticos

### 1. Mapeamento de Artigos
- ✅ `Certificação em Sustentabilidade Ambiental` → Art. 81-III
- ✅ `4º Distrito` → Art. 74

### 2. Consultas de Construção
- ✅ `o que posso construir no Petrópolis` (deve retornar tabela)
- ✅ `regime urbanístico do Três Figueiras` (deve mostrar ZOT 08.3 subdivisões)
- ✅ `altura máxima do Cristal` (deve usar dados reais, nunca inventar)

### 3. Queries Genéricas
- ✅ `altura máxima em Porto Alegre` (deve responder genericamente)
- ✅ `coeficiente de aproveitamento` (deve pedir especificação de bairro)

### 4. Sistema de Keywords
- ✅ `CA máximo` = `coeficiente de aproveitamento máximo`
- ✅ `gabarito` = `altura máxima`
- ✅ `TO` = `taxa de ocupação`

### 5. Validação de Dados
- ✅ Não misturar `BOA VISTA` com `BOA VISTA DO SUL`
- ✅ Usar valores exatos dos dados SQL (nunca inventar `1.0`)
- ✅ Filtrar dados apenas do bairro solicitado

## 🔍 Características dos Testes

### Validações Automáticas
- **Formato de resposta**: Tabelas markdown para consultas de construção
- **Links oficiais**: Presença obrigatória dos links do PDUS
- **Idioma**: Respostas em português brasileiro
- **Confiança**: Scoring apropriado baseado na qualidade dos dados
- **Performance**: Tempo de resposta < 10 segundos

### Casos Específicos Testados
- **Sustentabilidade Ambiental** → Deve mapear para Art. 81-III
- **4º Distrito** → Deve mapear para Art. 74
- **Três Figueiras** → Deve mostrar ZOT 08.3 com subdivisões A, B, C
- **Cristal** → Deve usar índice médio exato (3,3125)
- **Endereços sem bairro** → Deve pedir esclarecimento

### Validações de Qualidade
- ❌ Nunca usar mensagem beta quando há dados válidos
- ❌ Nunca inventar valores como `1.0` ou `X.X`
- ❌ Nunca misturar dados de bairros diferentes
- ✅ Sempre incluir 4 campos obrigatórios para construção
- ✅ Sempre usar nomes exatos das colunas SQL

## 📈 Métricas de Performance

### Benchmarks Esperados
- **Taxa de sucesso**: ≥ 85%
- **Tempo médio de resposta**: ≤ 5 segundos
- **Confiança média**: ≥ 0.8 para consultas específicas
- **Cobertura de casos críticos**: 100%

### Relatórios Gerados
- `test-summary-*.json`: Resumo executivo
- `test-report.html`: Relatório visual detalhado
- `debug-report-*.json`: Logs de debug completos
- `rag-test-report-*.html`: Análise específica do RAG

## 🛠️ Configuração de Ambiente

### Variáveis Necessárias
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Dependências
```bash
npm install --save-dev jest ts-jest @types/jest
npm install @supabase/supabase-js
```

## 🔧 Matchers Customizados

O sistema inclui matchers Jest específicos:

```typescript
// Validar tabelas markdown
expect(response).toContainTable();

// Validar resposta de ZOT
expect(response).toBeValidZOTResponse();

// Validar resposta RAG completa
expect(data).toHaveValidRAGResponse();

// Validar keywords
expect(response).toContainKeywords(['altura', 'máxima']);

// Validar range numérico
expect(responseTime).toBeWithinRange(0, 10000);
```

## 🐛 Debug e Troubleshooting

### Logs Detalhados
```bash
# Executar com logs verbosos
npx ts-node tests/debug-tests.ts
```

### Análise de Falhas Comuns
1. **Timeout**: Verificar conectividade com Supabase
2. **Dados incorretos**: Validar filtros de bairro no SQL
3. **Formato inválido**: Conferir formatação markdown
4. **Confiança baixa**: Revisar qualidade dos dados de entrada

### Variáveis de Debug
```env
SILENT_TESTS=true  # Reduzir logs durante testes
NODE_ENV=test      # Configuração de teste
```

## 📝 Como Adicionar Novos Testes

1. **Caso específico**: Adicionar em `RAG_TEST_CASES` no `test-runner.ts`
2. **Funcionalidade nova**: Criar arquivo `*.test.ts` específico
3. **Matcher customizado**: Adicionar em `setup.ts`
4. **Validação complexa**: Usar `debug-tests.ts` como modelo

## 🎯 Objetivos de Qualidade

- **Precisão**: Respostas corretas para todos os casos críticos
- **Consistência**: Mesmo resultado para mesma query
- **Performance**: Resposta rápida e eficiente
- **Usabilidade**: Formato claro e links funcionais
- **Robustez**: Lidar com edge cases apropriadamente