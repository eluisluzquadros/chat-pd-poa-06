# Instalação do Supabase Local no Windows 11

## Método 1: Usando Scoop (Recomendado)

1. **Instalar Scoop** (se ainda não tiver):
   
   Abra o PowerShell como Administrador e execute:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
   ```

2. **Instalar Supabase CLI via Scoop**:
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

## Método 2: Download Direto

1. Baixe o executável do Supabase CLI:
   - Acesse: https://github.com/supabase/cli/releases
   - Baixe `supabase_windows_amd64.tar.gz`
   - Extraia o arquivo `supabase.exe`
   - Coloque em um diretório (ex: `C:\supabase`)
   - Adicione o diretório ao PATH do Windows

## Configuração do Projeto

1. **Inicializar Supabase no projeto**:
   ```bash
   cd C:\Users\User\Documents\GitHub\chat-pd-poa-06
   supabase init
   ```

2. **Iniciar Supabase localmente**:
   ```bash
   supabase start
   ```

   Isso irá baixar e iniciar os containers Docker:
   - PostgreSQL (porta 54322)
   - Supabase Studio (porta 54323)
   - GoTrue (Auth) (porta 54321)
   - Realtime (porta 54321)
   - Storage (porta 54321)
   - Kong API Gateway (porta 54321)

3. **Acessar o Supabase Studio**:
   - URL: http://localhost:54323
   - Use as credenciais fornecidas no terminal

## Executar Migrações

1. **Copiar migrações para pasta do Supabase**:
   ```bash
   mkdir supabase\migrations
   copy supabase\migrations\*.sql supabase\migrations\
   ```

2. **Aplicar migrações**:
   ```bash
   supabase db push
   ```

## Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` com as URLs locais:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key_fornecida_pelo_supabase_start>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key_fornecida_pelo_supabase_start>
```

## Comandos Úteis

- `supabase status` - Ver status dos serviços
- `supabase db reset` - Resetar banco de dados
- `supabase stop` - Parar todos os containers
- `supabase migration new <nome>` - Criar nova migração
- `supabase functions serve` - Rodar Edge Functions localmente

## Troubleshooting

### Docker não está rodando
- Certifique-se de que o Docker Desktop está iniciado
- Verifique se a virtualização está habilitada na BIOS

### Portas em uso
- Verifique se as portas 54321-54323 estão livres
- Use `netstat -an | findstr :5432` para verificar

### Permissões
- Execute o PowerShell/CMD como Administrador
- Certifique-se de que o Docker tem permissões adequadas