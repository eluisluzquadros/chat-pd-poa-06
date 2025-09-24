# Sistema de Importação de Regime Urbanístico

Este sistema importa e gerencia os dados de regime urbanístico processados a partir dos arquivos Excel do PDPOA 2025.

## 📊 Dados Processados

- **387 registros** de regime urbanístico (PDPOA2025-Regime_Urbanistico.xlsx)
- **385 registros** de ZOTs vs Bairros (PDPOA2025-ZOTs_vs_Bairros.xlsx)
- **Total: 772 registros**

## 🚀 Uso Rápido

### Configuração Completa (Primeira Vez)
```bash
npm run regime:full-setup
```

### Comandos Individuais
```bash
# Verificar status atual
npm run regime:status

# Importar dados
npm run regime:import

# Testar dados importados
npm run regime:test

# Ver exemplos de uso
npm run regime:help
```

## 📋 Scripts Disponíveis

### 1. **import-regime-urbanistico.mjs** (Completo)
Script principal com logging detalhado, rollback e relatórios.

**Características:**
- ✅ Validação completa de arquivos
- ✅ Importação em lotes com retry
- ✅ Logging detalhado em arquivo
- ✅ Relatórios de importação
- ✅ Re-execução segura (idempotente)
- ✅ Rollback em caso de erro

**Uso:**
```bash
node scripts/import-regime-urbanistico.mjs
```

### 2. **import-regime-direct.mjs** (Simplificado)
Versão simplificada e mais estável para importação direta.

**Características:**
- ✅ Execução mais rápida
- ✅ Menos dependências externas
- ✅ Melhor compatibilidade
- ✅ Lotes menores (25 registros)
- ✅ Criação de tabelas integrada

**Uso:**
```bash
node scripts/import-regime-direct.mjs
```

### 3. **test-regime-import.mjs**
Testes abrangentes para validar dados importados.

**Testes inclusos:**
- ✅ Existência das tabelas
- ✅ Contagem de registros
- ✅ Integridade dos dados
- ✅ Tipos de dados corretos
- ✅ Índices funcionais
- ✅ Queries específicas

**Uso:**
```bash
node scripts/test-regime-import.mjs
```

### 4. **regime-urbanistico-cli.mjs**
CLI principal para gerenciar todo o processo.

**Comandos:**
```bash
node scripts/regime-urbanistico-cli.mjs <comando> [opções]

Comandos:
  status                 Verifica status atual
  setup                  Configura funções necessárias
  import [--force] [--direct]  Importa dados
  test                   Executa testes de validação
  clean [--yes]          Remove todos os dados
  full-setup [--force]   Configuração completa
  help-examples          Mostra exemplos de uso
```

## 🏗️ Estrutura do Banco de Dados

### Tabela `regime_urbanistico`
```sql
CREATE TABLE regime_urbanistico (
  id SERIAL PRIMARY KEY,
  bairro TEXT NOT NULL,
  zona TEXT NOT NULL,
  altura_maxima_edificacao_isolada TEXT,
  coeficiente_aproveitamento_basico TEXT,
  coeficiente_aproveitamento_maximo TEXT,
  -- ... (48 campos total)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_regime_bairro ON regime_urbanistico(bairro);
CREATE INDEX idx_regime_zona ON regime_urbanistico(zona);
```

### Tabela `zots_bairros`
```sql
CREATE TABLE zots_bairros (
  id SERIAL PRIMARY KEY,
  bairro TEXT NOT NULL,
  zona TEXT NOT NULL,
  total_zonas_no_bairro INTEGER,
  tem_zona_especial BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_zots_bairro ON zots_bairros(bairro);
CREATE INDEX idx_zots_zona ON zots_bairros(zona);
CREATE INDEX idx_zots_zona_especial ON zots_bairros(tem_zona_especial);
```

## 📁 Arquivos Processados

Os scripts leem os seguintes arquivos da pasta `processed-data/`:

- `regime-urbanistico-processed.json` - Dados de regime urbanístico
- `zots-bairros-processed.json` - Dados de ZOTs vs Bairros
- `database-schema.sql` - Schema das tabelas
- `supabase-import.sql` - SQL de importação (gerado)

## 🔧 Configuração

### Variáveis de Ambiente
```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your_anon_key_here
```

### Dependências
```bash
npm install
```

## 📊 Logging e Relatórios

O script principal gera logs detalhados em `logs/`:

- `import-regime-urbanistico-TIMESTAMP.log` - Log completo
- `import-report-TIMESTAMP.json` - Relatório estruturado

**Exemplo de log:**
```
[2025-07-31T19:00:00.000Z] INFO: 🚀 Iniciando importação de dados de regime urbanístico
[2025-07-31T19:00:01.000Z] SUCCESS: ✅ Arquivo encontrado: regime-urbanistico-processed.json
[2025-07-31T19:00:02.000Z] INFO: 📦 Processando lote 1/16 (25 registros)
[2025-07-31T19:00:03.000Z] SUCCESS: ✅ Lote importado com sucesso: 25 registros
```

## 🧪 Validação e Testes

### Testes Automáticos
O sistema executa os seguintes testes:

1. **Estrutura das Tabelas**
   - Existência das tabelas
   - Presença das colunas esperadas

2. **Contagem de Registros**
   - regime_urbanistico: 387 registros
   - zots_bairros: 385 registros

3. **Integridade dos Dados**
   - Campos obrigatórios preenchidos
   - Consistência de tipos de dados

4. **Funcionalidade**
   - Índices funcionais
   - Queries específicas funcionando

### Exemplos de Queries de Teste
```sql
-- Buscar por bairro
SELECT * FROM regime_urbanistico WHERE bairro = 'CAVALHADA';

-- Buscar por zona
SELECT * FROM regime_urbanistico WHERE zona = 'ZOT 01';

-- Zonas especiais
SELECT * FROM zots_bairros WHERE tem_zona_especial = true;
```

## 🚨 Solução de Problemas

### Problema: Tabelas não existem
```bash
# Criar tabelas manualmente
npm run regime:setup
```

### Problema: Dados incompletos
```bash
# Limpar e reimportar
npm run regime:clean -- --yes
npm run regime:import
```

### Problema: Erro de permissão
```bash
# Verificar variáveis de ambiente
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

### Problema: Dados corrompidos
```bash
# Validar dados processados
ls -la processed-data/
# Reimportar com força
npm run regime:import-force
```

## 🔄 Re-execução Segura

Todos os scripts são idempotentes:

- ✅ Podem ser executados múltiplas vezes
- ✅ Limpam dados existentes antes de importar
- ✅ Verificam condições antes de executar
- ✅ Relatam status atual

## 📈 Performance

### Configurações Otimizadas
- **Lotes de 25-50 registros** para estabilidade
- **3 tentativas** com retry automático
- **2 segundos** de delay entre tentativas
- **Transações** para consistência

### Métricas Típicas
- **Importação completa**: ~30-60 segundos
- **Validação**: ~10-15 segundos
- **Memory usage**: <100MB

## 🎯 Próximos Passos

Após importação bem-sucedida:

1. ✅ Verificar com `npm run regime:test`
2. ✅ Integrar com sistema de consultas RAG
3. ✅ Configurar cache para queries frequentes
4. ✅ Monitorar performance de consultas

## 📞 Suporte

Em caso de problemas:

1. Execute `npm run regime:status` para diagnóstico
2. Verifique logs em `logs/`
3. Execute `npm run regime:help` para exemplos
4. Use `npm run regime:full-setup` para reset completo