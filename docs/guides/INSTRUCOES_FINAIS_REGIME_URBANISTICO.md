# 📋 Instruções Finais - Importação de Regime Urbanístico

## ⚠️ Status Atual

As tabelas de regime urbanístico **ainda não existem** no banco de dados. É necessário criá-las manualmente.

## 🎯 Passos para Completar a Importação

### 1️⃣ Criar as Tabelas no Supabase Dashboard

1. **Acesse o SQL Editor**:
   https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql

2. **Copie todo o conteúdo** do arquivo:
   `CREATE_REGIME_TABLES.sql`

3. **Cole no SQL Editor** e clique em **"Run"**

4. **Verifique** se aparece a mensagem de sucesso

### 2️⃣ Importar os Dados

Após criar as tabelas, execute:

```bash
node scripts/execute-regime-tables-sql.mjs
```

Este script irá:
- Verificar se as tabelas foram criadas
- Importar 387 registros de regime urbanístico
- Importar 385 registros de ZOTs vs Bairros
- Total: 772 registros

### 3️⃣ Verificar a Importação

```bash
node scripts/verify-deployment.mjs
```

## 📊 O que será importado

### Tabela `regime_urbanistico` (387 registros)
- Dados de todos os bairros de Porto Alegre
- Altura máxima permitida
- Coeficientes de aproveitamento
- Taxas de permeabilidade
- Recuos obrigatórios

### Tabela `zots_bairros` (385 registros)
- Mapeamento de bairros para zonas (ZOTs)
- Características especiais
- Restrições e incentivos

## 🚀 Alternativas

### Opção A: SQL Editor (Recomendado)
- Mais simples e direto
- Interface visual
- Feedback imediato

### Opção B: psql (Avançado)
```bash
psql "postgresql://postgres.ngrqwmvuhvjkeohesbxs:[SERVICE_KEY]@aws-0-us-west-1.pooler.supabase.com:5432/postgres" -f CREATE_REGIME_TABLES.sql
```

### Opção C: Supabase CLI (Requer link)
```bash
npx supabase link --project-ref ngrqwmvuhvjkeohesbxs
npx supabase db push < CREATE_REGIME_TABLES.sql
```

## ✅ Checklist Final

- [ ] Tabelas criadas no Supabase
- [ ] Script de importação executado
- [ ] 772 registros importados
- [ ] Sistema verificado e funcionando

## 📞 Suporte

Se houver problemas:
1. Verifique os logs no Supabase Dashboard
2. Confirme que o SQL foi executado corretamente
3. Verifique as permissões das tabelas

---

**Status**: Aguardando execução manual do SQL no Dashboard do Supabase