-- =====================================================
-- CORRIGIR APENAS A TABELA ZOTS_BAIRROS
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Fazer backup dos dados existentes (se houver)
CREATE TABLE IF NOT EXISTS zots_bairros_backup AS 
SELECT * FROM zots_bairros;

-- 2. Dropar a tabela antiga
DROP TABLE IF EXISTS zots_bairros CASCADE;

-- 3. Criar tabela zots_bairros com estrutura CORRETA baseada no Excel
CREATE TABLE zots_bairros (
    id SERIAL PRIMARY KEY,
    
    -- Campos conforme o Excel real
    bairro VARCHAR(255) NOT NULL,
    zona VARCHAR(50) NOT NULL,
    total_zonas_no_bairro INTEGER DEFAULT 0,
    tem_zona_especial VARCHAR(10) DEFAULT 'Não', -- Armazenar como texto: 'Sim' ou 'Não'
    
    -- Metadados
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Criar índices para performance
CREATE INDEX idx_zots_bairro ON zots_bairros(bairro);
CREATE INDEX idx_zots_zona ON zots_bairros(zona);
CREATE INDEX idx_zots_bairro_zona ON zots_bairros(bairro, zona);
CREATE INDEX idx_zots_tem_especial ON zots_bairros(tem_zona_especial);

-- 5. Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_zots_bairros_updated_at 
BEFORE UPDATE ON zots_bairros
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Verificar estrutura criada
SELECT 
    'ESTRUTURA DA TABELA zots_bairros:' as info;

SELECT 
    ordinal_position,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'zots_bairros'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Verificar se a tabela foi criada com sucesso
SELECT 
    'VERIFICAÇÃO FINAL:' as info;

SELECT 
    COUNT(*) as total_colunas,
    'zots_bairros criada com sucesso!' as status
FROM information_schema.columns
WHERE table_name = 'zots_bairros'
AND table_schema = 'public';