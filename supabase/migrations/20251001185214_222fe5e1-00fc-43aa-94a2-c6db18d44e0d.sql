-- Corrigir RLS Policy para user_accounts permitir auto-provisioning OAuth
-- Drop política restritiva existente
DROP POLICY IF EXISTS "Admins can insert accounts" ON public.user_accounts;

-- Criar nova política que permite usuários autenticados criarem suas próprias contas
CREATE POLICY "Users can create their own account"
ON public.user_accounts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Garantir que a política de SELECT também funciona corretamente
DROP POLICY IF EXISTS "Admins can view all accounts" ON public.user_accounts;

CREATE POLICY "Admins can view all accounts"
ON public.user_accounts
FOR SELECT
TO authenticated
USING (
  is_admin() OR auth.uid() = user_id
);

-- Garantir que admins podem fazer UPDATE
DROP POLICY IF EXISTS "Admins can update accounts" ON public.user_accounts;

CREATE POLICY "Admins can update accounts"
ON public.user_accounts
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Garantir que admins podem fazer DELETE
DROP POLICY IF EXISTS "Admins can delete accounts" ON public.user_accounts;

CREATE POLICY "Admins can delete accounts"
ON public.user_accounts
FOR DELETE
TO authenticated
USING (is_admin());