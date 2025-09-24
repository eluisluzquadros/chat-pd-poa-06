-- ============================================
-- CORREÇÃO DA TABELA REGIME_URBANISTICO
-- Adicionar colunas faltantes
-- ============================================

-- Verificar estrutura atual
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'regime_urbanistico' 
ORDER BY ordinal_position;

-- Adicionar colunas que estão faltando (baseado no erro)
ALTER TABLE regime_urbanistico 
ADD COLUMN IF NOT EXISTS afastamentos__frente TEXT,
ADD COLUMN IF NOT EXISTS afastamentos__lateral TEXT,
ADD COLUMN IF NOT EXISTS afastamentos__fundos TEXT,
ADD COLUMN IF NOT EXISTS altura_mxima__edificao_isolada TEXT,
ADD COLUMN IF NOT EXISTS coeficiente_de_aproveitamento__bsico TEXT,
ADD COLUMN IF NOT EXISTS coeficiente_de_aproveitamento__mximo TEXT,
ADD COLUMN IF NOT EXISTS rea_mnima_do_lote TEXT,
ADD COLUMN IF NOT EXISTS testada_mnima_do_lote TEXT,
ADD COLUMN IF NOT EXISTS mdulo_de_fracionamento TEXT,
ADD COLUMN IF NOT EXISTS face_mxima_de_quarteiro TEXT,
ADD COLUMN IF NOT EXISTS taxa_de_ocupao TEXT,
ADD COLUMN IF NOT EXISTS gabarito__n_de_pavimentos TEXT,
ADD COLUMN IF NOT EXISTS densidade_habitacional TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Verificar se as colunas foram adicionadas
SELECT COUNT(*) as total_columns 
FROM information_schema.columns 
WHERE table_name = 'regime_urbanistico';

-- Limpar dados antigos para novo import
DELETE FROM regime_urbanistico WHERE 1=1;

-- Confirmar tabela vazia
SELECT COUNT(*) as total_records FROM regime_urbanistico;