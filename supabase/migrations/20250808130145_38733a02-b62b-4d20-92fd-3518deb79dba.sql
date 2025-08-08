-- Create ZOTs x Bairros table and indexes if not exist
CREATE TABLE IF NOT EXISTS public.zots_bairros (
  id SERIAL PRIMARY KEY,
  bairro TEXT NOT NULL,
  zona TEXT NOT NULL,
  total_zonas_no_bairro INTEGER,
  tem_zona_especial VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Uniqueness and helpful indexes
CREATE UNIQUE INDEX IF NOT EXISTS zots_bairros_bairro_zona_key ON public.zots_bairros (bairro, zona);
CREATE INDEX IF NOT EXISTS zots_bairros_bairro_idx ON public.zots_bairros (bairro);
CREATE INDEX IF NOT EXISTS zots_bairros_zona_idx ON public.zots_bairros (zona);

-- Keep updated_at fresh
DROP TRIGGER IF EXISTS update_zots_bairros_updated_at ON public.zots_bairros;
CREATE TRIGGER update_zots_bairros_updated_at
BEFORE UPDATE ON public.zots_bairros
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Performance index for regime_urbanistico lookups by (bairro, zona)
CREATE INDEX IF NOT EXISTS idx_regime_urbanistico_bairro_zona ON public.regime_urbanistico (bairro, zona);
