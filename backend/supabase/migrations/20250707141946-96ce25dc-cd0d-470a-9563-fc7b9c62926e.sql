-- Verificar se o usuário demo já tem uma role
SELECT * FROM public.user_roles WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid;