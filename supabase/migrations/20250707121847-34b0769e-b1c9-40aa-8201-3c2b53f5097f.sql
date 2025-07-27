-- Tornar campos opcionais na tabela interest_manifestations
ALTER TABLE public.interest_manifestations 
ALTER COLUMN cpf DROP NOT NULL,
ALTER COLUMN city DROP NOT NULL,
ALTER COLUMN organization DROP NOT NULL,
ALTER COLUMN organization_size DROP NOT NULL;