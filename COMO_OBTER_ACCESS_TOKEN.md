# 🔑 Como Obter Access Token do Supabase

## Por que preciso disso?
O Supabase CLI precisa de um **Access Token pessoal** para fazer deploy/deletar Edge Functions via linha de comando.

## 📋 Passos para obter o Access Token:

### 1. Acesse sua conta Supabase
https://app.supabase.com/account/tokens

### 2. Crie um novo Access Token
- Clique em **"Generate new token"**
- Dê um nome (ex: "CLI Deploy")
- Copie o token gerado (aparece apenas uma vez!)

### 3. Configure o token no ambiente

#### Opção A: Variável de ambiente (Windows CMD)
```cmd
set SUPABASE_ACCESS_TOKEN=seu_token_aqui
```

#### Opção B: Variável de ambiente (PowerShell)
```powershell
$env:SUPABASE_ACCESS_TOKEN="seu_token_aqui"
```

#### Opção C: Adicionar ao .env
```
SUPABASE_ACCESS_TOKEN=seu_token_aqui
```

### 4. Teste o acesso
```bash
npx supabase projects list
```

## 🚀 Comandos úteis após configurar

### Listar Edge Functions
```bash
npx supabase functions list --project-ref ngrqwmvuhvjkeohesbxs
```

### Deletar uma função
```bash
npx supabase functions delete nome-da-funcao --project-ref ngrqwmvuhvjkeohesbxs
```

### Deploy de uma função
```bash
npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs
```

## 🔧 Script automatizado para deletar múltiplas funções

Depois de configurar o token, você pode usar este script:

```bash
# delete-obsolete-functions.sh
#!/bin/bash

# Lista de funções para deletar
FUNCTIONS_TO_DELETE=(
  "agentic-rag-debug"
  "agentic-rag-v2"
  "agentic-rag-v3"
  "cache-debug"
  "test-minimal"
  # adicione mais aqui
)

# Deletar cada função
for func in "${FUNCTIONS_TO_DELETE[@]}"
do
  echo "Deletando $func..."
  npx supabase functions delete $func --project-ref ngrqwmvuhvjkeohesbxs
done
```

## ⚠️ Alternativa sem CLI

Se não conseguir usar o CLI, faça tudo via Dashboard:
1. https://app.supabase.com/project/ngrqwmvuhvjkeohesbxs
2. Edge Functions
3. Delete manualmente cada função obsoleta

## 🎯 Por que não consigo usar o CLI diretamente?

1. **Ambiente non-TTY**: Estou em um ambiente que não permite login interativo
2. **Sem access token**: Preciso de um token pessoal que só você pode gerar
3. **Segurança**: O access token é pessoal e não deve ser compartilhado

---

**Resumo**: Você precisa gerar um Access Token em https://app.supabase.com/account/tokens e configurá-lo como variável de ambiente para usar o Supabase CLI.