# Configuração do Login com Google

## Configurações no Google Cloud Console

1. **Acesse o Google Cloud Console**: https://console.cloud.google.com/
2. **Selecione ou crie um projeto**
3. **Vá para "APIs & Services" > "Credentials"**
4. **Clique em "Create Credentials" > "OAuth Client ID"**
5. **Configure o tipo de aplicação como "Web application"**
6. **Configure as URLs autorizadas**:
   - **JavaScript origins**: Adicione sua URL do site (ex: `https://seu-app.lovable.app`)
   - **Redirect URIs**: Adicione a URL de callback do Supabase (veja abaixo)

## Configurações no Supabase

### 1. URL Configuration
No painel do Supabase, vá para **Authentication > URL Configuration** e configure:

- **Site URL**: URL principal da sua aplicação
  - Exemplo: `https://seu-app.lovable.app`
  
- **Redirect URLs**: URLs permitidas para redirecionamento após login
  - Adicione: `https://seu-app.lovable.app/auth/callback`
  - Adicione também: `https://seu-app.lovable.app`

### 2. Google Provider
No painel do Supabase, vá para **Authentication > Providers** e configure o Google:

1. **Habilite o Google Provider**
2. **Adicione as credenciais do Google Cloud Console**:
   - **Client ID**: Copie do Google Cloud Console
   - **Client Secret**: Copie do Google Cloud Console
3. **Salve as configurações**

### 3. URL de Callback do Supabase
A URL de callback do Supabase que você deve adicionar no Google Cloud Console é:
```
https://ngrqwmvuhvjkeohesbxs.supabase.co/auth/v1/callback
```

## Testando o Login

1. **Verifique se todas as URLs estão corretas**
2. **Teste o fluxo de login**:
   - Clique no botão "Continuar com Google"
   - Deve redirecionar para o Google
   - Após autorização, deve retornar para sua aplicação
   - Usuários autorizados devem ser redirecionados para `/chat`
   - Usuários não autorizados devem ver mensagem de acesso restrito

## Solução de Problemas

### Erro: "requested path is invalid"
- Verifique se a **Site URL** está configurada corretamente no Supabase
- Verifique se a **Redirect URL** está na lista de URLs autorizadas

### Erro de CORS ou domínio não autorizado
- Verifique se o domínio está na lista de **JavaScript origins** no Google Cloud Console
- Verifique se a URL de callback está na lista de **Redirect URIs**

### Login funciona mas usuário não consegue acessar
- Verifique se o email do usuário está cadastrado no sistema
- O sistema possui validação de acesso que permite apenas usuários previamente autorizados

## URLs de Configuração Rápida

- **Supabase Auth Settings**: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/auth/providers
- **Supabase URL Configuration**: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/auth/url-configuration
- **Google Cloud Console**: https://console.cloud.google.com/apis/credentials