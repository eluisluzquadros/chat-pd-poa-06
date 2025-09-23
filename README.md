# Chat PD POA - Assistente Virtual do Plano Diretor de Porto Alegre

## 🎯 Status: Sistema Operacional - 100% Funcionalidade Admin

### 📊 Últimas Atualizações (01/02/2025)
- ✅ **Sistema Admin Completamente Funcional**
- ✅ **Benchmark Multi-LLM com 16 modelos**
- ✅ **Dashboard Admin sem erros**
- ✅ **Validação QA operacional**

### 🆕 Funcionalidades Admin Disponíveis
- **Dashboard Administrativo** - Métricas completas em tempo real
- **Benchmark de Modelos** - Compare 16 LLMs diferentes
- **Validação QA** - Sistema de qualidade com casos de teste
- **Seleção de Modelos** - Escolha quais modelos testar

## 📚 Documentação Importante

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

1. **Frontend (Next.js + React)**
   - Interface de chat responsiva
   - Sistema de autenticação
   - Dashboard administrativo
   - Componentes de visualização de dados

2. **Backend (Supabase Edge Functions)**
   - `agentic-rag`: Orquestrador principal do processamento de consultas
   - `query-analyzer`: Analisa e classifica as intenções das perguntas
   - `sql-generator`: Gera consultas SQL para dados tabulares
   - `enhanced-vector-search`: Busca em documentos conceituais
   - `response-synthesizer`: Sintetiza respostas finais
   - `multiLLMService`: Gerencia interações com diferentes modelos de IA

3. **Banco de Dados (PostgreSQL + pgvector)**
   - Armazenamento de dados tabulares (ZOTs, bairros, parâmetros)
   - Embeddings vetoriais para busca semântica
   - Histórico de conversas e analytics

### Fluxo de Processamento

```
Usuário → Frontend → multiLLMService → agentic-rag
                                           ↓
                                    query-analyzer
                                           ↓
                              ┌────────────┴────────────┐
                              ↓                        ↓
                        sql-generator          enhanced-vector-search
                              ↓                        ↓
                         Execução SQL          Busca Vetorial
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
- ✅ **Consultas sobre regulamentação**: Artigos da LUOS, certificações ambientais
- ✅ **Informações sobre riscos**: Bairros com risco de inundação/alagamento
- ✅ **Parâmetros construtivos**: Altura máxima, coeficientes de aproveitamento
- ✅ **Regras especiais**: 4º Distrito, ZOTs específicas
- ✅ **Busca inteligente**: Por artigo, bairro ou palavra-chave
- ✅ **Dados das enchentes 2024**: Bairros afetados e níveis de risco

### Para Administradores
- ✅ Dashboard de analytics
- ✅ Gestão de documentos e chunks
- ✅ Monitoramento de Edge Functions
- ✅ Histórico de consultas
- ✅ Monitoramento de uso
- ✅ Gestão de dados
- ✅ Logs de sistema
- ✅ Métricas de desempenho

## 🔒 Segurança

- Autenticação via Supabase Auth
- Rate limiting em APIs
- Validação de entrada
- Sanitização de dados
- Logs de auditoria

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