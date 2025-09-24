# Plano de Migração - Sistema Agnóstico de Agentes

## ✅ FASE 1: LIMPEZA CRÍTICA - CONCLUÍDA

### Páginas V3 Deletadas
- ❌ `src/pages/admin/QualityV3.tsx` (651 linhas) - DELETADO
- ❌ `src/pages/admin/BenchmarkV3.tsx` (436 linhas) - DELETADO
- ❌ `src/components/admin/QualityMetricsV3.tsx` - DELETADO
- ❌ `src/components/admin/BenchmarkConfigV3.tsx` - DELETADO

### Componentes Obsoletos Removidos
- ❌ `src/components/admin/QADashboard.tsx` - DELETADO
- ❌ `src/components/admin/FeedbackDashboard.tsx` - DELETADO
- ❌ `src/components/admin/FeedbackNotifications.tsx` - DELETADO
- ❌ `src/components/admin/IntelligentGapDetector.tsx` - DELETADO
- ❌ `src/components/admin/GapDetectionDashboard.tsx` - DELETADO
- ❌ `src/components/admin/CostProjectionDashboard.tsx` - DELETADO

### Rotas V3 Removidas
- ❌ `/admin/quality-v3` - DELETADO
- ❌ `/admin/benchmark-v3` - DELETADO

### Sistema Tornado Agnóstico
- ✅ Dashboard renomeado de "Agentic-RAG V3" para "Dashboard de Monitoramento"
- ✅ Referências V3 alteradas para V1 no monitoring
- ✅ Validador atualizado para "Validador de Agentes RAG"
- ✅ Interface não menciona mais tecnologias específicas

## 📊 ESTADO ATUAL DO SISTEMA

### Agentes Registrados
1. **agentic-v1** 
   - Status: ✅ Registrado na interface `/admin/agents-config`
   - Endpoint: `/functions/v1/agentic-rag`
   - Modelo: `anthropic/claude-3-5-sonnet-20241022`
   - Status: Ativo

2. **agentic-rag-v2**
   - Status: ⚠️ Edge Function existe mas NÃO está registrado na interface
   - Endpoint: `/functions/v1/agentic-rag-v2`
   - Precisa ser cadastrado via `/admin/agents-config`

### Edge Functions Disponíveis
- ✅ `agentic-rag` (V1)
- ✅ `agentic-rag-v2` (V2) 
- ✅ `agentic-rag-dify` (Em desenvolvimento)
- ✅ `test-api-connection` (Para testes de conectividade)

## 🎯 PRÓXIMAS FASES

### FASE 2: REGISTRO DE AGENTES EXISTENTES
- [ ] Cadastrar `agentic-rag-v2` via interface administrativa
- [ ] Configurar API endpoints corretamente
- [ ] Testar conectividade usando botão "Testar Conexão"
- [ ] Ativar agente V2 no sistema

### FASE 3: REFATORAÇÃO /admin/quality
- [ ] Modificar para usar APENAS agentes registrados na tabela `dify_agents`
- [ ] Remover lógica hardcoded de endpoints Supabase
- [ ] Implementar seleção dinâmica de agentes
- [ ] Sistema de download/upload de casos de teste (CSV/XLSX)

### FASE 4: SISTEMA DE CASOS DE TESTE
- [ ] Função de download da tabela `qa_test_cases`
- [ ] Função de upload para importação automática
- [ ] Validação de integridade dos dados
- [ ] Histórico detalhado de execuções

### FASE 5: REFATORAÇÃO /admin/benchmark
- [ ] Análise de benchmark para agentes registrados
- [ ] Comparação de performance entre agentes
- [ ] Métricas de custo e qualidade
- [ ] Relatórios exportáveis

## 🏗️ ARQUITETURA AGNÓSTICA ATUAL

### Tabela `dify_agents`
```sql
id                 UUID
name              TEXT (ex: "agentic-v1", "agentic-rag-v2")
display_name      TEXT (ex: "Agentic RAG V1", "Agentic RAG V2")
description       TEXT
model             TEXT (ex: "custom-workflow")
api_config        JSONB {
  base_url: "https://ngrqwmvuhvjkeohesbxs.supabase.co",
  endpoint: "/functions/v1/agentic-rag",
  api_key: "...",
  app_id: "..."
}
status            TEXT (active/inactive)
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

### Interface Unificada
- **Localização**: `/admin/agents-config`
- **Funcionalidade**: Cadastro, edição, teste e ativação de qualquer agente
- **Teste de Conectividade**: Botão integrado para validar configurações
- **Agnóstico**: Funciona com Supabase, Dify ou qualquer API externa

## ✨ BENEFÍCIOS ATINGIDOS

1. **Sistema Agnóstico**: Interface única para qualquer tipo de agente
2. **Código Limpo**: Removidas 1000+ linhas de código obsoleto
3. **Manutenibilidade**: Arquitetura simples e focada
4. **Escalabilidade**: Fácil adição de novos agentes via interface
5. **Transparência**: Usuários não sabem se agente é Supabase, Dify ou outro

## 🚀 COMANDO PARA PRÓXIMA FASE

Para continuar a migração, execute:
```bash
# FASE 2: Cadastrar agentic-rag-v2
# Acessar /admin/agents-config e cadastrar:
# - Nome: agentic-rag-v2
# - Display Name: Agentic RAG V2  
# - Endpoint: /functions/v1/agentic-rag-v2
# - Testar conexão e ativar
```