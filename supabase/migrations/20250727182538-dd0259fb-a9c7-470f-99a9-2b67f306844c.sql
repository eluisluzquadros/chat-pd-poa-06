-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create user_accounts table
CREATE TABLE public.user_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE(user_id)
);

-- Create user roles table with enum
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'user', 'analyst');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE(user_id, role)
);

-- Create chat sessions table
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create chat history table
CREATE TABLE public.chat_history (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  message JSONB NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create secrets table for secure credential storage
CREATE TABLE public.secrets (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  secret_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Add user_id column to existing tables for RLS
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.document_metadata ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.document_rows ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.n8n_chat_histories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (SELECT role::TEXT FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1),
    (SELECT role FROM public.user_accounts WHERE user_id = auth.uid() LIMIT 1),
    'user'
  );
$$;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT public.get_current_user_role() = 'admin';
$$;

-- Create security definer function to check if user is supervisor or admin
CREATE OR REPLACE FUNCTION public.is_supervisor_or_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT public.get_current_user_role() IN ('admin', 'supervisor');
$$;

-- RLS POLICIES FOR PROFILES
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS POLICIES FOR USER_ACCOUNTS
CREATE POLICY "Admins can view all user accounts"
  ON public.user_accounts FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can view their own account"
  ON public.user_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert user accounts"
  ON public.user_accounts FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update user accounts"
  ON public.user_accounts FOR UPDATE
  USING (public.is_admin());

-- RLS POLICIES FOR USER_ROLES
CREATE POLICY "Admins can manage all user roles"
  ON public.user_roles FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- RLS POLICIES FOR CHAT_SESSIONS
CREATE POLICY "Users can manage their own chat sessions"
  ON public.chat_sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all chat sessions"
  ON public.chat_sessions FOR SELECT
  USING (public.is_supervisor_or_admin());

-- RLS POLICIES FOR CHAT_HISTORY
CREATE POLICY "Users can manage their own chat history"
  ON public.chat_history FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all chat history"
  ON public.chat_history FOR SELECT
  USING (public.is_supervisor_or_admin());

-- RLS POLICIES FOR SECRETS (Admin only)
CREATE POLICY "Only admins can manage secrets"
  ON public.secrets FOR ALL
  USING (public.is_admin());

-- RLS POLICIES FOR DOCUMENTS
CREATE POLICY "Users can manage their own documents"
  ON public.documents FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all documents"
  ON public.documents FOR SELECT
  USING (public.is_supervisor_or_admin());

-- RLS POLICIES FOR DOCUMENT_METADATA
CREATE POLICY "Users can manage their own document metadata"
  ON public.document_metadata FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all document metadata"
  ON public.document_metadata FOR SELECT
  USING (public.is_supervisor_or_admin());

-- RLS POLICIES FOR DOCUMENT_ROWS
CREATE POLICY "Users can manage their own document rows"
  ON public.document_rows FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all document rows"
  ON public.document_rows FOR SELECT
  USING (public.is_supervisor_or_admin());

-- RLS POLICIES FOR N8N_CHAT_HISTORIES
CREATE POLICY "Users can manage their own n8n chat histories"
  ON public.n8n_chat_histories FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all n8n chat histories"
  ON public.n8n_chat_histories FOR SELECT
  USING (public.is_supervisor_or_admin());

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  
  -- Create user account
  INSERT INTO public.user_accounts (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'user'
  );
  
  -- Create user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_accounts_updated_at
  BEFORE UPDATE ON public.user_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_secrets_updated_at
  BEFORE UPDATE ON public.secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();