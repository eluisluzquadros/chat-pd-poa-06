-- ============================================
-- ADICIONAR TODAS AS COLUNAS NECESSÁRIAS
-- Baseado nos dados do Excel
-- ============================================

-- Adicionar TODAS as colunas que podem estar no Excel
ALTER TABLE regime_urbanistico 
ADD COLUMN IF NOT EXISTS afastamentos_frente TEXT,
ADD COLUMN IF NOT EXISTS afastamentos_lateral TEXT,
ADD COLUMN IF NOT EXISTS afastamentos_fundos TEXT,
ADD COLUMN IF NOT EXISTS altura_maxima_edificacao_isolada TEXT,
ADD COLUMN IF NOT EXISTS coeficiente_de_aproveitamento_basico TEXT,
ADD COLUMN IF NOT EXISTS coeficiente_de_aproveitamento_maximo TEXT,
ADD COLUMN IF NOT EXISTS area_minima_do_lote TEXT,
ADD COLUMN IF NOT EXISTS testada_minima_do_lote TEXT,
ADD COLUMN IF NOT EXISTS modulo_de_fracionamento TEXT,
ADD COLUMN IF NOT EXISTS face_maxima_de_quarteirao TEXT,
ADD COLUMN IF NOT EXISTS taxa_de_ocupacao TEXT,
ADD COLUMN IF NOT EXISTS gabarito_n_de_pavimentos TEXT,
ADD COLUMN IF NOT EXISTS densidade_habitacional TEXT,
ADD COLUMN IF NOT EXISTS regime_de_atividades TEXT,
ADD COLUMN IF NOT EXISTS regime_volumetrico TEXT,
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS usos_permitidos TEXT,
ADD COLUMN IF NOT EXISTS usos_proibidos TEXT,
ADD COLUMN IF NOT EXISTS recuo_frontal TEXT,
ADD COLUMN IF NOT EXISTS recuo_lateral TEXT,
ADD COLUMN IF NOT EXISTS recuo_fundos TEXT,
ADD COLUMN IF NOT EXISTS taxa_permeabilidade TEXT,
ADD COLUMN IF NOT EXISTS vagas_estacionamento TEXT,
ADD COLUMN IF NOT EXISTS area_construida_maxima TEXT,
ADD COLUMN IF NOT EXISTS indice_aproveitamento TEXT,
ADD COLUMN IF NOT EXISTS quota_terreno_por_unidade TEXT,
ADD COLUMN IF NOT EXISTS quota_terreno_por_economia TEXT,
ADD COLUMN IF NOT EXISTS area_minima_lote TEXT,
ADD COLUMN IF NOT EXISTS testada_minima_lote TEXT,
ADD COLUMN IF NOT EXISTS profundidade_minima TEXT,
ADD COLUMN IF NOT EXISTS largura_minima TEXT,
ADD COLUMN IF NOT EXISTS altura_maxima_divisa TEXT,
ADD COLUMN IF NOT EXISTS altura_maxima_fachada TEXT,
ADD COLUMN IF NOT EXISTS numero_pavimentos TEXT,
ADD COLUMN IF NOT EXISTS subsolo TEXT,
ADD COLUMN IF NOT EXISTS aproveitamento_minimo TEXT,
ADD COLUMN IF NOT EXISTS aproveitamento_basico TEXT,
ADD COLUMN IF NOT EXISTS aproveitamento_maximo TEXT,
ADD COLUMN IF NOT EXISTS aproveitamento_compulsorio TEXT,
ADD COLUMN IF NOT EXISTS dispositivos_controle TEXT,
ADD COLUMN IF NOT EXISTS base TEXT,
ADD COLUMN IF NOT EXISTS torre TEXT,
ADD COLUMN IF NOT EXISTS volumetria TEXT,
ADD COLUMN IF NOT EXISTS grupamento TEXT,
ADD COLUMN IF NOT EXISTS alinhamento TEXT,
ADD COLUMN IF NOT EXISTS recuo_viario TEXT,
ADD COLUMN IF NOT EXISTS recuo_ajardinamento TEXT;

-- Criar um índice genérico para aceitar qualquer coluna de texto
CREATE INDEX IF NOT EXISTS idx_regime_text_search 
ON regime_urbanistico 
USING gin(to_tsvector('portuguese', 
  COALESCE(bairro, '') || ' ' || 
  COALESCE(zona, '') || ' ' || 
  COALESCE(altura_maxima, '') || ' ' ||
  COALESCE(observacoes, '')
));

-- Verificar total de colunas
SELECT COUNT(*) as total_columns 
FROM information_schema.columns 
WHERE table_name = 'regime_urbanistico';

-- Mostrar primeiras 20 colunas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'regime_urbanistico' 
ORDER BY ordinal_position
LIMIT 20;