-- Inserir role de supervisor para o usuário demo
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'supervisor'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;