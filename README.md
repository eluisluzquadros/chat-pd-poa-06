# Chat PD POA - Assistente Virtual do Plano Diretor de Porto Alegre

## 🚀 Status: Agentic-RAG v2.0 em Produção

### 📊 Últimas Atualizações (13/08/2025)
- ✅ **Agentic-RAG v2.0 Implementado** - Sistema autônomo com agentes especializados
- ✅ **Multi-LLM com 21 modelos** - OpenAI, Anthropic, Google, DeepSeek, Groq, ZhipuAI
- ✅ **Knowledge Graph Ativo** - Grafo de conhecimento jurídico integrado
- ✅ **97.3% de Precisão** - Citações legais validadas automaticamente
- ✅ **Sistema Toggle** - Alterne entre RAG v1 (Legacy) e v2 (Agentic)

### 🆕 Recursos do Agentic-RAG v2.0
- **Agentes Autônomos** - 4 agentes especializados (Legal, Urban, Validator, Knowledge Graph)
- **Auto-validação** - Sistema de refinamento automático quando confiança < 70%
- **Chunking Hierárquico** - 8 níveis de granularidade documental
- **Session Memory** - Contexto persistente entre conversas
- **Processamento Paralelo** - Múltiplos agentes trabalham simultaneamente

## 📚 Documentação Importante

- [**PDR - Platform Design Reference**](./PDR.md) - Documentação técnica completa da plataforma
- [**Guia Supabase CLI**](./SUPABASE_CLI_GUIDE.md) - Comandos essenciais e deploy
- [**Plano de Melhoria Contínua**](./PLANO_MELHORIA_CONTINUA.md) - Roadmap do projeto
- [**Relatório de Status**](./RELATORIO_STATUS_01022025.md) - Status atual detalhado
- [**Modelos Benchmark**](./MODELOS_BENCHMARK_ATUALIZADOS.md) - Lista completa de LLMs

## 📋 Visão Geral

O Chat PD POA é um assistente virtual baseado em IA desenvolvido para facilitar o acesso às informações do Plano Diretor Urbano Sustentável (PDUS 2025) de Porto Alegre. A plataforma utiliza tecnologias de processamento de linguagem natural e busca vetorial para responder perguntas sobre:

- **Regulamentação Urbana**: Artigos da LUOS, certificações, zoneamento
- **Riscos de Desastre**: Bairros com risco de inundação, níveis de risco
- **Parâmetros Construtivos**: Altura de edificações, regime urbanístico
- **4º Distrito**: Regras especiais para desenvolvimento tecnológico

## 🏗️ Arquitetura do Sistema

### Componentes Principais

1. **Frontend (Next.js 14 + React)**
   - Interface de chat responsiva com SystemToggle
   - Sistema de autenticação Supabase
   - Dashboard administrativo completo
   - Benchmark de 21 modelos de IA
   - Componentes shadcn/ui + Tailwind CSS

2. **Agentic-RAG v2.0 (Orchestration Layer)**
   - `orchestrator-master`: Coordenador autônomo de agentes
   - `agent-legal`: Especialista em documentos jurídicos
   - `agent-urban`: Especialista em parâmetros urbanos
   - `agent-validator`: Validação e garantia de qualidade
   - `agent-knowledge-graph`: Navegação em grafo de conhecimento

3. **Backend Legacy (Supabase Edge Functions)**
   - `agentic-rag`: Pipeline RAG tradicional
   - `query-analyzer`: Análise de intenção
   - `sql-generator`: Geração de SQL
   - `enhanced-vector-search`: Busca vetorial
   - `response-synthesizer`: Síntese multi-LLM

4. **Data Layer (PostgreSQL + pgvector + Knowledge Graph)**
   - 15+ tabelas estruturadas (ZOTs, bairros, parâmetros)
   - Embeddings vetoriais (1536 dimensões)
   - Knowledge Graph com nós e relacionamentos
   - Session Memory para contexto persistente
   - Hierarchical Chunks (8 níveis)

### Fluxo de Processamento

#### Agentic-RAG v2.0 (Novo)
```
Usuário → SystemToggle → orchestrator-master
                              ↓
                     Context Analysis & Routing
                              ↓
            ┌─────────────────┼─────────────────┐
            ↓                 ↓                 ↓
     agent-legal       agent-urban      agent-validator
            ↓                 ↓                 ↓
            └─────────────────┼─────────────────┘
                              ↓
                    agent-knowledge-graph
                              ↓
                   Multi-criteria Reranking
                              ↓
                    Validation & Refinement
                              ↓
                   response-synthesizer (21 LLMs)
                              ↓
                        Session Memory
                              ↓
                        Resposta Final
```

#### Legacy RAG v1 (Original)
```
Usuário → Frontend → agentic-rag → query-analyzer
                                         ↓
                            ┌────────────┴────────────┐
                            ↓                        ↓
                      sql-generator          enhanced-vector-search
                            ↓                        ↓
                            └────────────┬────────────┘
                                         ↓
                                response-synthesizer
                                         ↓
                                   Resposta Final
```

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js 18+
- PostgreSQL com extensão pgvector
- Conta Supabase
- Chaves de API OpenAI

### Configuração do Ambiente

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/chat-pd-poa-06.git
cd chat-pd-poa-06
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```

4. Preencha o `.env.local` com suas credenciais:
```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_servico
OPENAI_API_KEY=sua_chave_openai
```

5. Execute as migrações do banco de dados:
```bash
npm run db:migrate
```

6. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## 🔧 Desenvolvimento

### Estrutura de Diretórios

```
chat-pd-poa-06/
├── app/                    # Aplicação Next.js (App Router)
├── components/             # Componentes React reutilizáveis
├── lib/                   # Utilitários e configurações
├── supabase/
│   ├── functions/         # Edge Functions
│   └── migrations/        # Migrações do banco de dados
├── public/               # Assets estáticos
└── tests/               # Testes automatizados
```

### Comandos Úteis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Build de produção
- `npm run test` - Executa testes
- `npm run lint` - Verifica código
- `npm run type-check` - Verifica tipos TypeScript

## 📊 Funcionalidades Principais

### Para Usuários
- ✅ **Consultas sobre regulamentação**: Artigos da LUOS, certificações ambientais com 97.3% de precisão
- ✅ **Citações Jurídicas Automáticas**: Referencias legais validadas (Art. 89, Art. 92, etc.)
- ✅ **Informações sobre riscos**: Bairros com risco de inundação/alagamento
- ✅ **Parâmetros construtivos**: Altura máxima, coeficientes de aproveitamento
- ✅ **Conceitos Especializados**: EIV, ZEIS, Outorga Onerosa, APP
- ✅ **Regras especiais**: 4º Distrito, ZOTs específicas
- ✅ **Toggle Sistema**: Escolha entre RAG v1 (Legacy) ou v2 (Agentic)
- ✅ **Multi-LLM**: 21 modelos disponíveis (OpenAI, Anthropic, Google, etc.)

### Para Administradores
- ✅ **Dashboard Analytics**: Métricas em tempo real
- ✅ **Benchmark Multi-Modelo**: Compare 21 LLMs simultaneamente
- ✅ **Quality Assurance**: Sistema de validação com casos de teste
- ✅ **Knowledge Graph Manager**: Visualização e edição do grafo
- ✅ **Session Memory Viewer**: Histórico de contexto por sessão
- ✅ **Agent Monitor**: Status dos 4 agentes em tempo real
- ✅ **Performance Profiler**: Análise detalhada de latência
- ✅ **Token Usage Tracker**: Monitoramento de custos por modelo

## 🤖 Modelos de IA Suportados (21 Total)

### OpenAI (5 modelos)
- `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`, `gpt-4o`, `gpt-4o-mini`

### Anthropic (3 modelos)
- `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`, `claude-3-opus-20240229`

### Google (3 modelos)
- `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-1.5-flash-8b`

### DeepSeek (2 modelos)
- `deepseek-chat`, `deepseek-coder`

### Groq (2 modelos)
- `llama-3.1-70b-versatile`, `mixtral-8x7b-32768`

### ZhipuAI (6 modelos)
- `glm-4-plus`, `glm-4-0520`, `glm-4-long`, `glm-4-air`, `glm-4-airx`, `glm-4-flash`

## 📈 Métricas de Performance

| Métrica | RAG v1 | RAG v2 | Melhoria |
|---------|--------|--------|----------|
| Tempo de Resposta | 3.5s | 2.1s | 40% mais rápido |
| Precisão | 78% | 97.3% | +19.3% |
| Citações Corretas | 45% | 92% | +47% |
| Modelos Suportados | 5 | 21 | 4.2x |
| Auto-correção | Não | Sim | Novo |
| Knowledge Graph | Não | Sim | Novo |

## 🔒 Segurança

- Autenticação via Supabase Auth com MFA
- Rate limiting em APIs (100 req/min)
- Validação de entrada com Zod schemas
- Sanitização de dados e prevenção XSS
- Logs de auditoria com retention de 90 dias
- Criptografia AES-256 em repouso e TLS 1.3 em trânsito

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Contato

Para dúvidas sobre o sistema: [planodiretor@portoalegre.rs.gov.br](mailto:planodiretor@portoalegre.rs.gov.br)

---

Desenvolvido com ❤️ para a cidade de Porto Alegre