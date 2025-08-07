-- Corrigir erros de segurança: Habilitar RLS nas tabelas QA
ALTER TABLE qa_validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_validation_results ENABLE ROW LEVEL SECURITY;