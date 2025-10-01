-- Adicionar política RLS para permitir que admins excluam usuários
CREATE POLICY "Admins can delete user accounts"
ON public.user_accounts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  )
);

-- Corrigir dados inconsistentes: marcar manifestações que já têm contas criadas
UPDATE public.interest_manifestations
SET 
  account_created = true,
  status = 'converted',
  updated_at = NOW()
WHERE 
  account_created = false
  AND email IN (
    SELECT email FROM public.user_accounts
  );