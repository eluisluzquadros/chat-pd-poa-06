# 🔍 Instruções para Debug do Chat

## Passos para Diagnosticar o Problema

### 1. Abrir o Console do Navegador
1. Acesse http://localhost:8080/chat
2. Pressione **F12** para abrir as ferramentas de desenvolvedor
3. Vá para a aba **Console**
4. Limpe o console (ícone de lixeira ou Ctrl+L)

### 2. Tentar Enviar uma Mensagem
1. Digite "Olá" no chat
2. Selecione qualquer modelo
3. Clique em enviar
4. **OBSERVE O CONSOLE**

### 3. O que Procurar no Console

Você deve ver logs como:

```
🎯 MultiLLMService.processMessage called with: {...}
📤 Calling edge function: agentic-rag {...}
📥 Response from agentic-rag: {...}
```

### 4. Possíveis Erros e Soluções

#### A) Se aparecer erro de CORS:
```
Access to fetch at 'https://...' from origin 'http://localhost:8080' has been blocked by CORS
```
**Solução**: O Supabase está bloqueando requisições locais

#### B) Se aparecer erro 401 (Unauthorized):
```
Error calling agentic-rag: {message: "Unauthorized"}
```
**Solução**: Problema de autenticação - verifique se está logado

#### C) Se aparecer erro 500:
```
Error calling agentic-rag: {message: "Internal Server Error"}
```
**Solução**: Erro na edge function - verifique logs do Supabase

#### D) Se não aparecer nenhum log:
**Problema**: O código não está sendo executado
**Solução**: Verifique se o projeto foi reiniciado após as mudanças

### 5. Teste Rápido no Console

Cole este código no console para testar diretamente:

```javascript
// Teste direto da edge function
fetch('https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/agentic-rag', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + (window.localStorage.getItem('sb-ngrqwmvuhvjkeohesbxs-auth-token') || '').replace(/['"]/g, '')
  },
  body: JSON.stringify({
    message: "Olá teste direto",
    model: "openai/gpt-3.5-turbo",
    sessionId: "test-" + Date.now()
  })
})
.then(r => r.json())
.then(data => console.log('✅ Resposta:', data))
.catch(err => console.error('❌ Erro:', err));
```

### 6. Verificar Token de Autenticação

No console, digite:

```javascript
localStorage.getItem('sb-ngrqwmvuhvjkeohesbxs-auth-token')
```

Se retornar `null`, você não está autenticado.

### 7. Verificar Supabase Client

No console, digite:

```javascript
// Verifica se o Supabase está configurado
console.log(window.location.origin);
console.log(document.cookie);
```

## 📊 Resumo de Diagnóstico

Com base no que você encontrar:

1. **Se o test-edge-functions.html funciona** → Edge functions estão OK
2. **Se aparecem logs no console** → Frontend está executando
3. **Se há erro específico** → Podemos corrigir baseado no erro
4. **Se não há logs** → Problema de build/cache do React

## 🚀 Próximos Passos

1. Execute os passos acima
2. Copie os logs do console
3. Identifique qual tipo de erro está ocorrendo
4. Se necessário, verifique os logs do Supabase em:
   https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/logs/edge-functions

## 💡 Dica Final

Se nada funcionar, tente:

1. Parar o servidor (`Ctrl+C`)
2. Limpar o cache: `rm -rf node_modules/.vite`
3. Reiniciar: `npm run dev`
4. Fazer login novamente no chat