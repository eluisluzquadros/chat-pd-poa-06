-- Migration to ensure admin@chat-pd-poa.org has admin role and apply platform_settings if not exists

-- First, create platform_settings table if it doesn't exist (idempotent operation)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'platform_settings' AND schemaname = 'public') THEN
    -- Create platform settings table for system-wide configurations
    CREATE TABLE public.platform_settings (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value JSONB NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_by UUID REFERENCES auth.users(id),
      is_active BOOLEAN NOT NULL DEFAULT true
    );

    -- Enable RLS
    ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Admins can manage platform settings" 
    ON public.platform_settings 
    FOR ALL 
    USING (is_admin());

    CREATE POLICY "All authenticated users can read active platform settings" 
    ON public.platform_settings 
    FOR SELECT 
    USING (auth.role() = 'authenticated' AND is_active = true);

    -- Create indexes for performance
    CREATE INDEX idx_platform_settings_key ON public.platform_settings(key);
    CREATE INDEX idx_platform_settings_category ON public.platform_settings(category);
    CREATE INDEX idx_platform_settings_active ON public.platform_settings(is_active);

    -- Create update timestamp trigger
    CREATE OR REPLACE FUNCTION update_platform_settings_timestamp()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    CREATE TRIGGER platform_settings_updated_at
      BEFORE UPDATE ON public.platform_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_platform_settings_timestamp();

    -- Insert default settings
    INSERT INTO public.platform_settings (key, value, description, category) VALUES
    ('default_llm_model', '"anthropic/claude-3-5-sonnet-20241022"', 'Modelo LLM padrão para usuários não-admin', 'llm'),
    ('allow_user_model_selection', 'false', 'Permite que usuários não-admin selecionem modelos LLM', 'llm'),
    ('max_conversation_history', '10', 'Máximo de mensagens no histórico de conversa', 'chat'),
    ('enable_chat_cache', 'true', 'Habilita cache de respostas do chat', 'performance');

    RAISE NOTICE 'Platform settings table created successfully';
  ELSE
    RAISE NOTICE 'Platform settings table already exists';
  END IF;
END $$;

-- Ensure admin@chat-pd-poa.org has admin role
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the user ID for admin@chat-pd-poa.org
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@chat-pd-poa.org'
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    -- Insert or update in user_roles table
    INSERT INTO public.user_roles (user_id, role, assigned_at)
    VALUES (admin_user_id, 'admin', now())
    ON CONFLICT (user_id) DO UPDATE SET 
      role = 'admin',
      assigned_at = now();

    -- Insert or update in user_accounts table if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_accounts' AND schemaname = 'public') THEN
      INSERT INTO public.user_accounts (user_id, role, created_at, updated_at)
      VALUES (admin_user_id, 'admin', now(), now())
      ON CONFLICT (user_id) DO UPDATE SET 
        role = 'admin',
        updated_at = now();
    END IF;

    -- Create profile if it doesn't exist
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'profiles' AND schemaname = 'public') THEN
      INSERT INTO public.profiles (id, updated_at)
      VALUES (admin_user_id, now())
      ON CONFLICT (id) DO UPDATE SET updated_at = now();
    END IF;

    RAISE NOTICE 'Admin role assigned to admin@chat-pd-poa.org successfully';
  ELSE
    RAISE NOTICE 'User admin@chat-pd-poa.org not found in auth.users table';
  END IF;
END $$;

-- Verify the setup
DO $$
DECLARE
  admin_user_id UUID;
  user_role TEXT;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@chat-pd-poa.org' LIMIT 1;
  
  IF admin_user_id IS NOT NULL THEN
    SELECT role INTO user_role FROM public.user_roles WHERE user_id = admin_user_id LIMIT 1;
    RAISE NOTICE 'Verification: admin@chat-pd-poa.org has role: %', COALESCE(user_role, 'NO ROLE FOUND');
  END IF;
END $$;