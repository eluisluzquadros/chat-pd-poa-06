-- Create legal_documents table
CREATE TABLE IF NOT EXISTS legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL CHECK (document_type IN ('terms', 'privacy', 'cookies')),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(document_type, version)
);

-- Create user_consents table
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_version TEXT NOT NULL,
  consented_at TIMESTAMPTZ DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  revoked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, document_id)
);

-- Create cookie_preferences table
CREATE TABLE IF NOT EXISTS cookie_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  essential_cookies BOOLEAN DEFAULT true,
  analytics_cookies BOOLEAN DEFAULT false,
  functional_cookies BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(session_id)
);

-- Alter user_accounts table
ALTER TABLE user_accounts 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cookies_accepted_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookie_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for legal_documents
CREATE POLICY "Public can read active legal documents"
  ON legal_documents FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage legal documents"
  ON legal_documents FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- RLS Policies for user_consents
CREATE POLICY "Users can view their own consents"
  ON user_consents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own consents"
  ON user_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consents"
  ON user_consents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all consents"
  ON user_consents FOR SELECT
  USING (is_admin());

-- RLS Policies for cookie_preferences
CREATE POLICY "Users can manage their own cookie preferences"
  ON cookie_preferences FOR ALL
  USING (auth.uid() = user_id OR session_id IS NOT NULL)
  WITH CHECK (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Admins can view all cookie preferences"
  ON cookie_preferences FOR SELECT
  USING (is_admin());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_document_type ON user_consents(document_type);
CREATE INDEX IF NOT EXISTS idx_cookie_preferences_user_id ON cookie_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_cookie_preferences_session_id ON cookie_preferences(session_id);
CREATE INDEX IF NOT EXISTS idx_legal_documents_type_active ON legal_documents(document_type, is_active);