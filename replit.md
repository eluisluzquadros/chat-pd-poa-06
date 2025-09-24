# Chat PD-POA: Sistema de Consulta do Plano Diretor

## Overview

Chat PD-POA é um sistema de consulta inteligente para o Plano Diretor de Porto Alegre (PDPOA 2025). O sistema utiliza técnicas de Retrieval-Augmented Generation (RAG) para permitir consultas em linguagem natural sobre normativas urbanísticas, zoneamento, e regulamentações da cidade. A aplicação combina uma interface web moderna com processamento avançado de documentos e múltiplos provedores de LLM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
A aplicação frontend é construída com React e TypeScript usando Vite como bundler. Utiliza Tailwind CSS para estilização com um sistema de design personalizado focado em tons de verde (#29625D) que representa a identidade visual da cidade. O sistema de componentes é baseado em shadcn/ui, proporcionando uma interface consistente e acessível.

A arquitetura de estado é gerenciada através de hooks customizados que encapsulam a lógica de negócio, especialmente para autenticação (AuthUtils) e comunicação com APIs. O sistema suporta múltiplos tipos de usuário (admin, regular) com diferentes níveis de acesso.

### Backend Architecture
O backend utiliza Supabase como plataforma principal, combinando PostgreSQL para persistência de dados com Edge Functions para processamento serverless. A arquitetura segue o padrão de microserviços através de funções especializadas:

- **query-analyzer**: Analisa queries do usuário e determina a estratégia de resposta
- **sql-generator**: Gera consultas SQL dinâmicas baseadas na análise
- **agentic-rag**: Orquestra o fluxo completo de RAG com múltiplos agentes
- **chat**: Gerencia conversas e integração com provedores de LLM

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

### Hybrid RAG Architecture
O sistema implementa uma arquitetura RAG híbrida que combina:

1. **Busca Estruturada**: Para dados tabulares como regime urbanístico e zoneamento
2. **Busca Vetorial**: Para documentos conceituais e normativas
3. **Cache Inteligente**: Sistema de cache baseado em similarity para otimizar respostas
4. **Multi-Agent Processing**: Diferentes agentes especializados por tipo de consulta

O processamento de queries segue um pipeline de análise → geração de SQL → busca vetorial → síntese de resposta, com fallbacks e validações em cada etapa.

## External Dependencies

### AI/LLM Providers
- **OpenAI GPT Models**: Processamento principal de linguagem natural e geração de embeddings
- **Anthropic Claude**: Modelo alternativo para síntese de respostas complexas
- **Dify Platform**: Orquestração de agentes externos através de API
- **Groq**: Processamento de alta velocidade para casos específicos

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

O sistema foi projetado para alta disponibilidade e escalabilidade, com redundância em provedores de LLM e cache inteligente para otimizar custos e performance.