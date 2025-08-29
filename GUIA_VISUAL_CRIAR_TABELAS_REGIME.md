# 🎯 GUIA VISUAL - Criar Tabelas de Regime Urbanístico

## ⚡ Ação Necessária AGORA

As tabelas de regime urbanístico **NÃO EXISTEM** no banco de dados. Você precisa criá-las manualmente.

## 📋 Passo a Passo (3 minutos)

### 1️⃣ Acesse o SQL Editor do Supabase

**Link direto**: 
```
https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql
```

### 2️⃣ Copie TODO o SQL abaixo

```sql
-- Criar tabela regime_urbanistico
CREATE TABLE IF NOT EXISTS regime_urbanistico (
    id SERIAL PRIMARY KEY,
    bairro VARCHAR(255) NOT NULL,
    zona VARCHAR(50) NOT NULL,
    altura_max_m DECIMAL(10,2),
    ca_max DECIMAL(5,2),
    to_base DECIMAL(5,2),
    to_max DECIMAL(5,2),
    taxa_permeabilidade DECIMAL(5,2),
    recuo_jardim_m DECIMAL(10,2),
    recuo_lateral_m DECIMAL(10,2),
    recuo_fundos_m DECIMAL(10,2),
    area_total_ha DECIMAL(10,2),
    populacao INTEGER,
    densidade_hab_ha DECIMAL(10,2),
    domicilios INTEGER,
    quarteirao_padrao_m INTEGER,
    divisao_lote BOOLEAN,
    remembramento BOOLEAN,
    quota_ideal_m2 INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela zots_bairros
CREATE TABLE IF NOT EXISTS zots_bairros (
    id SERIAL PRIMARY KEY,
    bairro VARCHAR(255) NOT NULL,
    zona VARCHAR(50) NOT NULL,
    caracteristicas JSONB DEFAULT '{}',
    restricoes JSONB DEFAULT '{}',
    incentivos JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_regime_bairro ON regime_urbanistico(bairro);
CREATE INDEX IF NOT EXISTS idx_regime_zona ON regime_urbanistico(zona);
CREATE INDEX IF NOT EXISTS idx_regime_altura ON regime_urbanistico(altura_max_m);
CREATE INDEX IF NOT EXISTS idx_regime_bairro_zona ON regime_urbanistico(bairro, zona);

CREATE INDEX IF NOT EXISTS idx_zots_bairro ON zots_bairros(bairro);
CREATE INDEX IF NOT EXISTS idx_zots_zona ON zots_bairros(zona);

-- Habilitar RLS
ALTER TABLE regime_urbanistico ENABLE ROW LEVEL SECURITY;
ALTER TABLE zots_bairros ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura
CREATE POLICY "Enable read for all users" ON regime_urbanistico FOR SELECT USING (true);
CREATE POLICY "Enable read for all users" ON zots_bairros FOR SELECT USING (true);
```

### 3️⃣ Cole no SQL Editor e clique em "RUN"

1. **Cole** todo o SQL acima no editor
2. **Clique** no botão verde "RUN" 
3. **Aguarde** a mensagem "Success. No rows returned"

### 4️⃣ Verifique se funcionou

Execute esta query para confirmar:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('regime_urbanistico', 'zots_bairros');
```

Deve retornar 2 linhas com os nomes das tabelas.

## 🚀 Após criar as tabelas

Execute no terminal:
```bash
node import-regime-urbanistico-direct.mjs
```

Este script irá:
- ✅ Detectar que as tabelas agora existem
- ✅ Importar 3 registros de exemplo
- ✅ Mostrar o resumo da importação

## 📊 O que será criado

### Tabela `regime_urbanistico`
- Armazena dados de altura máxima, coeficientes, taxas, etc.
- Uma linha para cada combinação bairro/zona
- Total: 387 registros (após importação completa)

### Tabela `zots_bairros`  
- Mapeia bairros para suas zonas (ZOTs)
- Inclui características, restrições e incentivos
- Total: 385 registros (após importação completa)

## ⚠️ Importante

- As tabelas DEVEM ser criadas ANTES de importar os dados
- O script já tem 3 registros de exemplo prontos
- Para importar todos os 772 registros, será necessário adicionar os dados completos

## 🆘 Se houver erro

1. Verifique se está logado no Supabase
2. Confirme que está no projeto correto (ngrqwmvuhvjkeohesbxs)
3. Tente executar o SQL em partes menores

---

**Status atual**: Aguardando você executar o SQL no Dashboard do Supabase