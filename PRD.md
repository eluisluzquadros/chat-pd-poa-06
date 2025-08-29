# PRD - Product Requirements Document
## Chat PD POA - Sistema de Consulta Urbanística

**Versão**: 2.0  
**Data**: Agosto 2025  
**Status**: Em Desenvolvimento  
**Autor**: Equipe de Desenvolvimento

---

## 1. Visão Geral do Produto

### 1.1 Propósito
Democratizar o acesso à legislação urbanística de Porto Alegre através de um assistente de IA conversacional, permitindo que cidadãos, profissionais e empresas obtenham informações precisas sobre regulamentações de construção e uso do solo.

### 1.2 Problema
- Complexidade da legislação urbanística (LUOS com 398 artigos, PDUS com 602 artigos)
- Dificuldade de interpretação por não-especialistas
- Informações dispersas em múltiplos documentos
- Alto custo de consultoria especializada
- Demora em obter respostas oficiais

### 1.3 Solução
Sistema de chat inteligente que:
- Responde perguntas em linguagem natural
- Cita fontes legais específicas
- Fornece parâmetros construtivos por nome de bairro ou código de zona
- Mantém contexto de conversação
- Valida respostas com casos de teste

## 2. Requisitos Funcionais

### 2.1 Chat Conversacional

#### RF-001: Interface de Chat
- **Prioridade**: Alta
- **Status**: ✅ Implementado
- **Descrição**: Interface de chat em tempo real com suporte a markdown
- **Critérios de Aceitação**:
  - Envio e recebimento de mensagens
  - Indicador de digitação/processamento
  - Formatação de respostas com markdown
  - Citação de fontes com links

#### RF-002: Processamento de Linguagem Natural
- **Prioridade**: Alta
- **Status**: ✅ Implementado
- **Descrição**: Interpretação de perguntas em português
- **Critérios de Aceitação**:
  - Detecção de intenção (consulta de lei, parâmetros, etc.)
  - Extração de entidades (bairros, zonas, artigos)
  - Tratamento de sinônimos e variações

#### RF-003: Busca Multi-Modal
- **Prioridade**: Alta
- **Status**: ⚠️ BUG CRÍTICO - Apenas 56% dos dados sendo consultados
- **Descrição**: Busca em múltiplas fontes de dados
- **Critérios de Aceitação**:
  - ✅ Busca vetorial em LUOS (398 registros)
  - ✅ Busca vetorial em PDUS (720 registros)
  - ❌ Busca em REGIME_FALLBACK (864 registros IGNORADOS)
  - ❌ Busca em QA_CATEGORY (16 registros IGNORADOS)
  - ✅ Consulta SQL em regime_urbanistico_consolidado

### 2.2 Base de Conhecimento

#### RF-004: Gestão de Documentos Legais
- **Prioridade**: Alta
- **Status**: ✅ Implementado
- **Descrição**: Armazenamento e indexação de LUOS e PDUS
- **Especificações**:
  - 1,998 artigos indexados
  - Embeddings de 1536 dimensões
  - Busca por similaridade coseno
  - Full-text search paralelo

#### RF-005: Dados de Regime Urbanístico
- **Prioridade**: Alta
- **Status**: ✅ Dados presentes, ❌ Não consultados
- **Descrição**: Parâmetros construtivos por zona
- **Especificações**:
  - ✅ 864 registros como REGIME_FALLBACK na base
  - ✅ 385 registros na tabela estruturada
  - ✅ 94 bairros com dados completos
  - ❌ RAG não consulta REGIME_FALLBACK

#### RF-006: Sistema de QA Validado
- **Prioridade**: Média
- **Status**: ✅ Dados presentes, ❌ Não consultados
- **Descrição**: Base de perguntas e respostas validadas
- **Especificações**:
  - ✅ 16 registros QA_CATEGORY na base
  - ✅ 125 casos em qa_test_cases
  - ❌ RAG não consulta QA_CATEGORY
  - ❌ RAG não faz fallback para qa_test_cases

### 2.3 Sistema de Validação

#### RF-007: Teste Automatizado de Acurácia
- **Prioridade**: Alta
- **Status**: ✅ Implementado
- **Descrição**: Validação contínua com casos de teste
- **Métricas Atuais**:
  - 125 casos de teste
  - 86.7% de acurácia
  - Meta: >95%

#### RF-008: Dashboard Administrativo
- **Prioridade**: Média
- **Status**: ✅ Implementado
- **Descrição**: Interface para monitoramento
- **Funcionalidades**:
  - Execução de testes
  - Visualização de métricas
  - Análise de gaps
  - Histórico de performance

### 2.4 Multi-LLM Support

#### RF-009: Roteamento Inteligente de Modelos
- **Prioridade**: Alta
- **Status**: ✅ Implementado
- **Descrição**: Seleção automática do melhor modelo
- **Modelos Suportados**:
  - OpenAI (GPT-5, GPT-4, nano,)
  - Anthropic (Claude Opus/Sonnet/Haiku)
  - Google (Gemini Pro/Flash)
  - DeepSeek (Chat/Deep/Code)
  - ZhipuAI(GLM-4.5, GLM-4.5-v)
	


## 3. Requisitos Não-Funcionais

### 3.1 Performance

#### RNF-001: Tempo de Resposta
- **Requisito**: < 5 segundos para 95% das queries
- **Atual**: 3-5 segundos média
- **Status**: ✅ Atendido

#### RNF-002: Taxa de Disponibilidade
- **Requisito**: 99.9% uptime
- **Monitoramento**: Supabase Status

#### RNF-003: Capacidade
- **Requisito**: 1000 usuários concorrentes
- **Atual**: ~100 testado

### 3.2 Qualidade

#### RNF-004: Acurácia das Respostas
- **Requisito**: >95% de precisão
- **Atual**: 86.7%
- **Status**: ❌ Abaixo da meta

#### RNF-005: Citação de Fontes
- **Requisito**: 100% das respostas com fonte
- **Status**: ✅ Atendido

### 3.3 Segurança

#### RNF-006: Autenticação
- **Requisito**: OAuth2 + JWT
- **Status**: ✅ Implementado

#### RNF-007: Rate Limiting
- **Requisito**: 100 req/min por usuário
- **Status**: ✅ Implementado

#### RNF-008: Proteção de API Keys
- **Requisito**: Secrets management
- **Status**: ✅ Via Supabase Vault

### 3.4 Usabilidade

#### RNF-009: Responsividade
- **Requisito**: Mobile-first design
- **Status**: ✅ Implementado

#### RNF-010: Acessibilidade
- **Requisito**: WCAG 2.1 AA
- **Status**: ⚠️ Parcial

## 4. Arquitetura do Sistema

### 4.1 Componentes Principais

```mermaid
graph TB
    subgraph Frontend
        UI[React UI]
        Service[Chat Service]
        RAG[Unified RAG Service]
    end
    
    subgraph Edge Functions
        ARAG[Agentic-RAG v1]
        QA[Query Analyzer]
        SQL[SQL Generator]
        RS[Response Synthesizer]
    end
    
    subgraph Database
        LA[Legal Articles]
        RU[Regime Urbanístico]
        QT[QA Test Cases]
        CH[Cache]
    end
    
    subgraph LLM Providers
        OAI[OpenAI]
        ANT[Anthropic]
        GGL[Google]
        GRQ[Groq]
    end
    
    UI --> Service
    Service --> RAG
    RAG --> ARAG
    ARAG --> QA
    ARAG --> SQL
    ARAG --> RS
    QA --> LA
    SQL --> RU
    RS --> LLM Providers
```

### 4.2 Fluxo de Dados

1. **Recepção**: Usuário envia pergunta
2. **Análise**: Query analyzer extrai intenção e entidades
3. **Busca**: 
   - Vector search em legal_articles
   - SQL query em regime_urbanistico
   - ❌ Lookup em qa_test_cases (não implementado)
4. **Síntese**: Response synthesizer gera resposta
5. **Cache**: Resultado armazenado por 24h
6. **Entrega**: Resposta formatada ao usuário

## 5. Gaps Identificados e Impacto

### 5.1 BUG CRÍTICO DESCOBERTO

**44% dos dados (880 registros) estão sendo IGNORADOS pelo sistema!**

| Problema | Registros Ignorados | Impacto | Esforço para Corrigir |
|----------|-------------------|---------|----------------------|
| RAG não busca REGIME_FALLBACK | 864 | -20% acurácia | 5 minutos |
| RAG não busca QA_CATEGORY | 16 | -5% acurácia | 5 minutos |
| Campo errado (content vs full_content) | Todos | -10% acurácia | 2 minutos |
| **TOTAL** | **880 (44%)** | **-35%** | **< 15 minutos** |

### 5.2 Projeção de Melhorias com Fix

- **Acurácia atual**: 86.7% (com apenas 56% dos dados)
- **Após incluir REGIME_FALLBACK**: ~92%
- **Após incluir QA_CATEGORY**: ~94%
- **Após corrigir campo full_content**: ~96%
- **Potencial final**: >97% com ajustes finos

## 6. Métricas de Sucesso

### 6.1 KPIs Principais

| Métrica | Atual | Meta | Prazo |
|---------|-------|------|-------|
| Acurácia | 86.7% | >95% | 30 dias |
| Tempo de resposta | 3-5s | <3s | 60 dias |
| Cache hit rate | 30% | >50% | 30 dias |
| Usuários ativos | - | 1000/mês | 90 dias |
| Satisfação (NPS) | - | >70 | 120 dias |

### 6.2 Métricas Técnicas

- Tokens por resposta: <1000 (média)
- Custo por query: <$0.05
- Embeddings gerados: 100% coverage
- Índices otimizados: 100% das queries frequentes

## 7. Roadmap de Implementação

### Sprint 1 (Semana 1-2): Quick Wins
- [ ] Importar QA chunks para legal_articles
- [ ] Criar script de importação
- [ ] Gerar embeddings
- [ ] Testar integração

### Sprint 2 (Semana 3-4): Regime Enhancement
- [ ] Processar chunks de regime urbanístico
- [ ] Indexar para busca semântica
- [ ] Implementar fallback híbrido
- [ ] Validar melhorias

### Sprint 3 (Semana 5-6): System Optimization
- [ ] Implementar lookup em qa_test_cases
- [ ] Expandir context window
- [ ] Otimizar cache strategy
- [ ] Fine-tuning de thresholds

### Sprint 4 (Semana 7-8): Quality Assurance
- [ ] Executar teste completo (125 casos)
- [ ] Documentar melhorias
- [ ] Preparar release notes
- [ ] Deploy em produção

## 8. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Degradação de performance | Média | Alto | Monitoramento contínuo, rollback rápido |
| Custos de API elevados | Baixa | Médio | Cache agressivo, modelos econômicos |
| Dados desatualizados | Média | Alto | Pipeline de atualização automatizado |
| Respostas incorretas | Baixa | Alto | Validação contínua, feedback loop |

## 9. Stakeholders

- **Product Owner**: Definição de requisitos e prioridades
- **Desenvolvedores**: Implementação e manutenção
- **QA Team**: Validação e testes
- **Usuários Finais**: Cidadãos e profissionais
- **Prefeitura**: Fornecimento de dados oficiais

## 10. Aprovações

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| Product Owner | - | - | - |
| Tech Lead | - | - | - |
| QA Lead | - | - | - |
| Stakeholder | - | - | - |

---

**Última atualização**: Agosto 2025  
**Próxima revisão**: Setembro 2025
