-- FASE 1.1: Criar tabela secrets
-- Execute este script no SQL Editor do Supabase Dashboard

-- Criar tabela para armazenar as API keys de forma segura
CREATE TABLE IF NOT EXISTS secrets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar Row Level Security para proteção
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir acesso apenas ao service role
CREATE POLICY "Service role only" ON secrets
    FOR ALL USING (auth.role() = 'service_role');

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_secrets_updated_at BEFORE UPDATE
    ON secrets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();