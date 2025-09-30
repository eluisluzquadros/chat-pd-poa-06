# SDK Universal de Orquestração de Agentes - White-Label Multi-Tenant

## Overview

**SDK Universal** que permite criar plataformas de IA white-label para **qualquer domínio, setor ou organização**. Transformou de uma aplicação específica para uma **SDK agnóstica** que orquestra múltiplos agentes de IA especializados através de uma interface unificada e personalizável.

**Porto Alegre (POA) serve como estudo de caso guarda-chuva** para validar as capacidades governamentais, mas a plataforma é totalmente agnóstica e pode servir governo, empresas, ONGs, universidades, saúde, finanças, e qualquer outro setor.

### Visão Expandida: Multi-Tenant White-Label

Cada organização recebe uma **plataforma aparentemente independente** com branding completo:
- `chatpdpoa.org` → Verde POA, Plano Diretor (estudo de caso)
- `support.empresa.com` → Atendimento corporativo
- `compliance.bank.com` → Auditoria bancária  
- `help.hospital.org` → Triagem médica
- `legal.lawfirm.com` → Assistente jurídico

**Resultado**: Cada tenant parece ter sua própria plataforma, mas compartilha a mesma infraestrutura SDK.

## Recent Changes

### 2025-09-30: Google OAuth Authentication - Production Ready ✅
- **Problema Resolvido**: Google OAuth falhava com erro "Could not find the function public.validate_oauth_acr"
- **Causa Raiz**: Tabelas `user_accounts` e `user_roles` não existiam no Supabase (apenas em banco local)
- **Solução Implementada**:
  - Criadas tabelas `user_accounts` e `user_roles` no Supabase (produção)
  - Corrigida função `validate_oauth_access` com aliases SQL para eliminar ambiguidade de nomes
  - Implementadas políticas RLS (Row Level Security) com INSERT restrito a role 'citizen'
  - Prevenção de escalação de privilégios: usuários não podem se auto-promover a admin
  - Auto-provisionamento OAuth funcionando: novos usuários cadastrados automaticamente com role 'citizen'
- **Migrações SQL Aplicadas**:
  - `20250930_create_user_tables_and_fix_oauth.sql` - Estrutura base de usuários
  - `20250930_fix_oauth_insert_policies.sql` - Políticas de segurança INSERT
- **Segurança**: Validação dupla (email + user_id) previne impersonação, RLS garante isolamento
- **Status**: Google OAuth 100% funcional em produção

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
A aplicação frontend é construída com React e TypeScript usando Vite como bundler. Utiliza Tailwind CSS para estilização com um sistema de design personalizado focado em tons de verde (#29625D) que representa a identidade visual da cidade. O sistema de componentes é baseado em shadcn/ui, proporcionando uma interface consistente e acessível.

A arquitetura de estado é gerenciada através de hooks customizados que encapsulam a lógica de negócio, especialmente para autenticação (AuthUtils) e comunicação com APIs. O sistema suporta múltiplos tipos de usuário (admin, regular) com diferentes níveis de acesso.

### Backend Architecture - Orquestração de Agentes
O backend funciona como um **hub orquestrador** que utiliza Supabase como plataforma principal. A nova arquitetura implementa **5 pilares de orquestração**:

1. **ORQUESTRA E GERENCIA**: Sistema CRUD completo para agentes via `AgentsConfig.tsx`
2. **CONECTA E INTEGRA**: Adapters especializados (`difyAdapter.ts`, `langflowAdapter.ts`, `crewaiAdapter.ts`) 
3. **MONITORA E OBSERVA**: Dashboards de métricas e performance em tempo real
4. **VALIDA E GOVERNA**: Suite de QA automatizada com compliance financeiro/negócio  
5. **SERVE E ENTREGA**: Interface unificada com roteamento inteligente de agentes

- **External Agent Gateway**: Orquestra múltiplos provedores de IA externos
- **Agent Selection Engine**: Seleciona automaticamente o melhor agente por contexto
- **Conversation Mapping**: Mantém contexto entre diferentes agentes
- **Quality Monitoring**: Valida compliance e performance continuamente

### Data Storage Solutions
O sistema utiliza PostgreSQL como base de dados principal com extensões específicas para vector search (pgvector). A estrutura de dados inclui:

- **documents**: Armazena metadados dos documentos processados
- **document_sections**: Contém chunks de texto com embeddings vetoriais
- **regime_urbanistico**: Dados estruturados do regime urbanístico de Porto Alegre
- **qa_test_cases**: Casos de teste para validação de qualidade
- **query_cache**: Cache de consultas para otimização de performance

O sistema processa documentos DOCX do PDPOA 2025 e dados Excel de zoneamento, convertendo-os em representações vetoriais para busca semântica eficiente.

### Authentication and Authorization
A autenticação é gerenciada pelo Supabase Auth com suporte a múltiplos provedores. O sistema implementa um modelo de autorização baseado em roles:

- **Admin**: Acesso completo incluindo configuração de agentes, casos de teste e métricas
- **User**: Acesso a consultas e histórico pessoal
- **Demo**: Modo limitado para demonstrações públicas

A autorização é validada tanto no frontend (AuthUtils) quanto nas Edge Functions, garantindo segurança em múltiplas camadas.

### Agent Orchestration Architecture
O sistema implementa uma **arquitetura de orquestração** que coordena múltiplos agentes externos:

1. **Agent Discovery**: Registro automático e descoberta de novos agentes
2. **Intelligent Routing**: Seleção automática do agente ideal baseada em contexto
3. **Session Management**: Mapeamento inteligente entre sessões da plataforma e conversações dos agentes
4. **Multi-Agent Synthesis**: Combinação de respostas de múltiplos agentes quando necessário
5. **Fallback Orchestration**: Sistema de fallbacks automáticos entre agentes

O processamento segue: **Análise de Contexto** → **Seleção de Agente** → **Roteamento Inteligente** → **Síntese de Resposta** → **Validação de Qualidade**.

## External Dependencies

### External Agent Platforms (Orquestrados)
- **Dify Platform**: Agentes low-code para workflows complexos via API REST
- **Langflow**: Agentes visuais baseado em fluxos drag-and-drop  
- **CrewAI**: Agentes colaborativos especializados em tarefas específicas
- **OpenAI Assistants**: Agentes nativos OpenAI com ferramentas personalizadas
- **Extensibilidade**: Arquitetura permite integração com qualquer plataforma de IA

### Development & Deployment
- **Supabase**: Plataforma principal (database, auth, edge functions, storage)
- **Vite**: Build tool e desenvolvimento frontend
- **Drizzle ORM**: Mapeamento objeto-relacional e migrações
- **TypeScript**: Tipagem estática para frontend e backend
- **Tailwind CSS + shadcn/ui**: Sistema de componentes e estilização

### Document Processing
- **mammoth.js**: Conversão de documentos DOCX para HTML/texto
- **xlsx**: Processamento de planilhas Excel do regime urbanístico
- **node-html-parser**: Análise e extração de conteúdo HTML

### Testing & Quality Assurance
- **Jest**: Framework de testes automatizados
- **Custom QA System**: Sistema próprio de validação de respostas com métricas de qualidade
- **ESLint**: Análise estática de código
- **Benchmark Scripts**: Automação de testes de performance

### Monitoring & Analytics
- **Custom Metrics System**: Coleta de métricas de performance e qualidade
- **Query Analytics**: Análise de padrões de uso e otimização
- **Error Tracking**: Sistema de logs e monitoramento de erros

O sistema foi projetado como **plataforma orquestradora** com alta disponibilidade, escalabilidade automática de agentes, balanceamento de carga inteligente entre provedores, e otimização contínua de custos através de métricas de performance por agente.