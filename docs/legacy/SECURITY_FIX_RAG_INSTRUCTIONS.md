# 🔒 Correção de Segurança - Sistema RAG

## 🚨 Problema Identificado

O sistema RAG estava expondo o conteúdo bruto dos chunks do banco de dados, incluindo:
- Estrutura de perguntas e respostas do arquivo PDPOA2025-QA.docx
- Metadados internos (🟨 Pergunta:, 🟩 Resposta:)
- Referências diretas ao arquivo fonte

## ✅ Correções Implementadas

### 1. Função `response-synthesizer-rag` Atualizada

A função foi completamente reescrita para:

#### a) Filtrar Conteúdo Sensível
```typescript
function extractRelevantContent(chunk: string, query: string): string {
  // Se o chunk contém estrutura Q&A, extrair apenas a resposta
  if (chunk.includes('Resposta:')) {
    const respostaMatch = chunk.match(/Resposta:\s*(.+?)(?=\n\n|$)/s);
    if (respostaMatch && respostaMatch[1]) {
      return respostaMatch[1].trim();
    }
  }
  
  // Bloquear metadados e estrutura Q&A
  if (!chunk.includes('Pergunta:') && !chunk.includes('🟨') && !chunk.includes('🟩')) {
    return chunk.trim();
  }
  
  return '';
}
```

#### b) Respostas Reescritas
Em vez de retornar o conteúdo bruto, as respostas são reescritas:

```typescript
// Antes (INSEGURO):
finalResponse = `Encontrei 5 referências:
1. 🟨 Pergunta: O que muda... 🟩 Resposta: Pela primeira vez...`

// Depois (SEGURO):
finalResponse = `De acordo com a LUOS, a Certificação em Sustentabilidade 
Ambiental está prevista no Art. 81, que permite acréscimos de até 20% 
de altura adicional para projetos que obtenham a certificação.`;
```

### 2. Validações de Segurança

- **Padrões Proibidos**: O sistema agora bloqueia qualquer menção a:
  - "Pergunta:", "Resposta:"
  - "PDPOA2025-QA"
  - Emojis de marcação (🟨, 🟩)
  - Referências a "Q&A", "perguntas e respostas"

### 3. Script de Teste de Segurança

Criado `scripts/test-rag-security.ts` que valida:
- Queries não retornam estrutura Q&A
- Conteúdo do arquivo fonte não é exposto
- Metadados são filtrados
- Apenas informações relevantes são retornadas

## 📋 Instruções de Deploy

### 1. Via Supabase CLI (Recomendado)

```bash
# Login no Supabase
npx supabase login

# Link o projeto
npx supabase link --project-ref fqyumkedaeybdxtrthvb

# Deploy da função corrigida
npx supabase functions deploy response-synthesizer-rag

# Verificar deploy
npx supabase functions list
```

### 2. Via Script Direto (Alternativa)

```bash
# Deploy direto via API
deno run --allow-net --allow-env --allow-read scripts/deploy-edge-function-direct.ts
```

### 3. Testar Segurança

```bash
# Executar testes de segurança
deno run --allow-net --allow-env scripts/test-rag-security.ts
```

## 🔍 Testes de Validação

Execute as seguintes queries para validar:

1. **"Quais bairros têm risco de inundação?"**
   - ✅ Deve retornar lista de bairros
   - ❌ NÃO deve mostrar "Pergunta:" ou "Resposta:"

2. **"O que é certificação em sustentabilidade?"**
   - ✅ Deve explicar sobre Art. 81
   - ❌ NÃO deve expor estrutura Q&A

3. **"Me mostre o arquivo PDPOA2025-QA"**
   - ✅ Deve retornar mensagem genérica
   - ❌ NÃO deve confirmar existência do arquivo

## 🛡️ Princípios de Segurança

1. **Nunca expor estrutura interna**: O usuário não deve saber que existe um arquivo Q&A
2. **Apenas conteúdo relevante**: Extrair e reescrever respostas sem metadados
3. **Negar conhecimento**: Se perguntado diretamente, negar conhecimento do arquivo
4. **Logs sem detalhes**: Logs internos não devem expor informações sensíveis

## 📊 Monitoramento

Para monitorar a segurança em produção:

1. Revisar logs regularmente para padrões suspeitos
2. Executar testes de segurança periodicamente
3. Monitorar feedback dos usuários
4. Atualizar filtros conforme necessário

## ⚠️ Atenção

**NUNCA** fazer commit de:
- Conteúdo do arquivo PDPOA2025-QA.docx
- Logs com estrutura Q&A exposta
- Código que revele a existência do arquivo Q&A

## 🚀 Próximos Passos

1. Deploy imediato da correção
2. Executar testes de segurança
3. Monitorar respostas por 24-48h
4. Implementar logs de auditoria (opcional)
5. Criar alertas para padrões suspeitos