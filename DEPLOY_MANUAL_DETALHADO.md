# Guia Detalhado de Deploy Manual das Edge Functions

## Passo a Passo Completo

### 1. Acessar o Dashboard
- Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs
- Faça login se necessário

### 2. Navegar para Functions
- No menu lateral esquerdo, clique em **"Edge Functions"**

### 3. Para cada função, siga EXATAMENTE estes passos:

#### A. Function: query-analyzer
1. Encontre a função `query-analyzer` na lista
2. Clique nos **3 pontinhos** → **"Edit function"**
3. **DELETE TODO** o código existente (Ctrl+A, Delete)
4. Abra o arquivo `deploy/query-analyzer.ts` no seu editor
5. Copie **TODO** o conteúdo (Ctrl+A, Ctrl+C)
6. Cole no editor do Supabase (Ctrl+V)
7. Clique em **"Save"** (botão azul)
8. Aguarde a mensagem "Function saved"
9. Clique em **"Deploy"** (botão verde)
10. Aguarde a mensagem "Function deployed successfully"

#### B. Function: sql-generator
1. Repita o mesmo processo para `sql-generator`
2. Use o arquivo `deploy/sql-generator.ts`

#### C. Function: agentic-rag
1. Repita o mesmo processo para `agentic-rag`
2. Use o arquivo `deploy/agentic-rag.ts`

#### D. Function: multiLLMService
1. Repita o mesmo processo para `multiLLMService`
2. Use o arquivo `deploy/multiLLMService.ts`

### 4. Verificar o Deploy
Após cada deploy bem-sucedido:
- Clique na aba **"Logs"** da função
- Verifique se não há erros vermelhos
- O status deve mostrar "Deployed"

### 5. Testar as Funções
No chat da aplicação, teste:
1. "Quantos bairros tem Porto Alegre?"
2. "O que posso construir na Rua Luiz Voelker n.55?"

## Troubleshooting

### Se o código não está sendo salvo:
1. Verifique se você clicou em "Save" antes de "Deploy"
2. Tente usar outro navegador
3. Limpe o cache do navegador (Ctrl+Shift+Delete)

### Se houver erro de compilação:
1. Verifique os logs de erro
2. Geralmente são problemas de importação ou tipos
3. Me informe o erro específico para eu corrigir

### Se a função foi deployada mas não funciona:
1. Verifique se as secrets estão configuradas:
   - Settings → Edge Functions → Secrets
   - OPENAI_API_KEY deve estar presente
2. Verifique os logs em tempo real:
   - Na função, clique em "Logs"
   - Faça uma requisição no chat
   - Veja se aparecem erros