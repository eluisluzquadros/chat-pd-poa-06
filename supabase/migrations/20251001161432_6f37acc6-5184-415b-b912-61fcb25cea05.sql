-- Investigar e limpar dados inconsistentes
-- Esta migration identifica e corrige situações onde há registros órfãos

-- Log de emails órfãos (existem em auth mas não em user_accounts)
-- Nota: Não podemos fazer SELECT direto de auth.users em uma migration,
-- mas podemos preparar a estrutura para identificação manual

-- Criar tabela temporária para rastrear inconsistências
CREATE TABLE IF NOT EXISTS public.data_consistency_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL,
  details JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE
);

-- Adicionar RLS para que apenas admins vejam
ALTER TABLE public.data_consistency_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view consistency log"
ON public.data_consistency_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  )
);

-- Atualizar manifestações onde já existe conta criada mas o flag está errado
UPDATE public.interest_manifestations
SET 
  account_created = true,
  status = 'converted',
  updated_at = NOW()
WHERE 
  account_created = false
  AND email IN (
    SELECT email FROM public.user_accounts WHERE email IS NOT NULL
  );

-- Log das atualizações feitas
INSERT INTO public.data_consistency_log (check_type, details)
SELECT 
  'interest_manifestation_fixed',
  jsonb_build_object(
    'count', COUNT(*),
    'timestamp', NOW()
  )
FROM public.interest_manifestations
WHERE account_created = true 
  AND status = 'converted'
  AND updated_at > NOW() - INTERVAL '1 minute';