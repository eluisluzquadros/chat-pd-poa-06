# 📋 Checklist de Verificação Pós-Deploy - Edge Functions

## ✅ Verificações Essenciais

### 1. Status das Functions
- [ ] Todas as functions críticas deployadas com sucesso
- [ ] Logs das functions não mostram erros críticos
- [ ] Status HTTP 200/204 para requests OPTIONS (CORS)
- [ ] URLs das functions respondem corretamente

### 2. Configurações de Ambiente
- [ ] Variáveis de ambiente configuradas no Supabase
- [ ] API keys válidas e funcionando
- [ ] Configurações JWT corretas no config.toml
- [ ] Timeouts apropriados configurados

### 3. Testes de Conectividade

#### Functions Críticas
- [ ] **feedback-processor**: Teste de processamento de feedback
- [ ] **gap-detector**: Teste de detecção de lacunas
- [ ] **knowledge-updater**: Teste de atualização de conhecimento
- [ ] **paginated-search**: Teste de busca paginada
- [ ] **cursor-pagination**: Teste de paginação por cursor

#### Multi-LLM Functions
- [ ] **claude-chat**: Teste com API Anthropic
- [ ] **gemini-chat**: Teste com API Google
- [ ] **openai-advanced-chat**: Teste com API OpenAI
- [ ] **deepseek-chat**: Teste com API DeepSeek
- [ ] **groq-chat**: Teste com API Groq

#### Core RAG System
- [ ] **enhanced-vector-search**: Teste de busca vetorial
- [ ] **response-synthesizer**: Teste de síntese de resposta
- [ ] **contextual-scoring**: Teste de pontuação contextual
- [ ] **query-analyzer**: Teste de análise de query

## 🧪 Scripts de Teste

### Teste Básico CORS
```bash
# Testar CORS para todas as functions críticas
curl -X OPTIONS -H "Origin: http://localhost:3000" \
  https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/feedback-processor

curl -X OPTIONS -H "Origin: http://localhost:3000" \
  https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/gap-detector
```

### Teste de Function com Payload
```bash
# Teste feedback-processor
curl -X POST \
  https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/feedback-processor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message_id": "test-msg-123",
    "session_id": "test-session-456",
    "model": "test-model",
    "helpful": true,
    "comment": "Teste de deployment"
  }'
```

### Teste de Busca Paginada
```bash
# Teste paginated-search  
curl -X POST \
  https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/paginated-search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "zoneamento",
    "pagination": {
      "page": 1,
      "limit": 10
    }
  }'
```

## 📊 Monitoramento e Logs

### Verificar Logs das Functions
```bash
# Logs em tempo real
npx supabase functions logs feedback-processor --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions logs gap-detector --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions logs knowledge-updater --project-ref ngrqwmvuhvjkeohesbxs

# Logs com filtro
npx supabase functions logs enhanced-vector-search --project-ref ngrqwmvuhvjkeohesbxs --filter "ERROR"
```

### Métricas de Performance
- [ ] Tempo de resposta médio < 5 segundos
- [ ] Taxa de erro < 1%
- [ ] Taxa de sucesso CORS > 99%
- [ ] Memory usage within limits
- [ ] No timeout errors

## 🔐 Verificações de Segurança

### Autenticação e Autorização
- [ ] Functions com `verify_jwt: true` requerem autenticação
- [ ] Functions públicas funcionam sem JWT
- [ ] Tokens inválidos retornam 401
- [ ] CORS configurado corretamente

### API Keys e Secrets
- [ ] API keys não expostas nos logs
- [ ] Secrets configurados como environment variables
- [ ] Rate limiting funcionando (se aplicável)

## 🚨 Resolução de Problemas Comuns

### Function não responde (504 Timeout)
1. [ ] Verificar timeout configuration
2. [ ] Verificar se API externa está respondendo
3. [ ] Verificar logs para deadlocks
4. [ ] Considerar aumentar memory allocation

### Erro CORS (403/405)
1. [ ] Verificar headers CORS na function
2. [ ] Verificar se method OPTIONS está implementado
3. [ ] Verificar origin allowed

### Erro de Autenticação (401/403)
1. [ ] Verificar se JWT está sendo enviado
2. [ ] Verificar validade do token
3. [ ] Verificar configuração `verify_jwt` no config.toml

### API Key Issues
1. [ ] Verificar se API key está configurada
2. [ ] Verificar validade da API key
3. [ ] Verificar quota/rate limits da API externa

## 📈 Testes de Carga (Opcional)

### Teste de Concorrência
```bash
# Usar ferramenta como ab ou wrk
ab -n 100 -c 10 https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/paginated-search

# Ou usar curl em loop
for i in {1..10}; do
  curl -X OPTIONS https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/feedback-processor &
done
wait
```

## ✅ Checklist Final

### Deployment Status
- [ ] Todas as functions críticas deployadas: feedback-processor, gap-detector, knowledge-updater, paginated-search, cursor-pagination
- [ ] Functions Multi-LLM deployadas: claude-chat, gemini-chat, openai-advanced-chat, etc.
- [ ] Functions Core RAG deployadas: enhanced-vector-search, response-synthesizer, contextual-scoring
- [ ] Functions de suporte deployadas: process-document, generate-embedding, match-documents
- [ ] Functions administrativas deployadas: create-admin-user, set-user-role

### Configuration
- [ ] config.toml atualizado com todas as functions
- [ ] Environment variables configuradas
- [ ] Secrets configurados no Supabase
- [ ] JWT verification configurada apropriadamente

### Testing
- [ ] CORS funcionando para todas as functions
- [ ] Autenticação funcionando para functions protegidas
- [ ] APIs externas respondendo (OpenAI, Gemini, Claude, etc.)
- [ ] Database connections funcionando
- [ ] Error handling funcionando apropriadamente

### Monitoring
- [ ] Logs configurados e acessíveis
- [ ] Performance metrics dentro dos limites
- [ ] Error alerts configurados (se aplicável)
- [ ] Documentation atualizada

## 🎯 Próximos Passos

Após completar este checklist:

1. **Integrar com Frontend**: Testar chamadas do frontend para as functions
2. **Configurar Monitoring**: Setup de alertas e dashboards
3. **Documentar APIs**: Atualizar documentação das functions
4. **Backup Strategy**: Configurar backup das functions e configurations
5. **Rollback Plan**: Preparar plano de rollback se necessário

---

## 📞 Suporte

Em caso de problemas:

1. **Logs**: Sempre verificar logs primeiro
2. **Documentation**: Consultar documentação do Supabase
3. **Community**: Supabase Discord/GitHub Issues
4. **Professional**: Suporte pago do Supabase se necessário

---

**Data do Deploy**: _______________  
**Responsável**: _______________  
**Status Final**: _______________