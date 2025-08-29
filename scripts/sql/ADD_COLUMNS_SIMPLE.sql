-- ============================================
-- ADICIONAR COLUNAS DE FORMA SIMPLES
-- ============================================

-- Adicionar colunas uma por uma para evitar erros
ALTER TABLE regime_urbanistico ADD COLUMN IF NOT EXISTS afastamentos_frente TEXT;
ALTER TABLE regime_urbanistico ADD COLUMN IF NOT EXISTS afastamentos_lateral TEXT;
ALTER TABLE regime_urbanistico ADD COLUMN IF NOT EXISTS afastamentos_fundos TEXT;
ALTER TABLE regime_urbanistico ADD COLUMN IF NOT EXISTS altura_maxima_edificacao_isolada TEXT;
ALTER TABLE regime_urbanistico ADD COLUMN IF NOT EXISTS coeficiente_de_aproveitamento_basico TEXT;
ALTER TABLE regime_urbanistico ADD COLUMN IF NOT EXISTS coeficiente_de_aproveitamento_maximo TEXT;
ALTER TABLE regime_urbanistico ADD COLUMN IF NOT EXISTS area_minima_do_lote TEXT;
ALTER TABLE regime_urbanistico ADD COLUMN IF NOT EXISTS testada_minima_do_lote TEXT;
ALTER TABLE regime_urbanistico ADD COLUMN IF NOT EXISTS modulo_de_fracionamento TEXT;
ALTER TABLE regime_urbanistico ADD COLUMN IF NOT EXISTS face_maxima_de_quarteirao TEXT;
ALTER TABLE regime_urbanistico ADD COLUMN IF NOT EXISTS taxa_de_ocupacao TEXT;
ALTER TABLE regime_urbanistico ADD COLUMN IF NOT EXISTS gabarito_n_de_pavimentos TEXT;
ALTER TABLE regime_urbanistico ADD COLUMN IF NOT EXISTS densidade_habitacional TEXT;
ALTER TABLE regime_urbanistico ADD COLUMN IF NOT EXISTS regime_de_atividades TEXT;
ALTER TABLE regime_urbanistico ADD COLUMN IF NOT EXISTS regime_volumetrico TEXT;
ALTER TABLE regime_urbanistico ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Verificar colunas criadas
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'regime_urbanistico'
ORDER BY ordinal_position;