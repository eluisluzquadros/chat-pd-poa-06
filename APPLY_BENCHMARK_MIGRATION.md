# 📊 Aplicar Migração do Sistema de Benchmark QA

## 🚀 Instruções Rápidas

1. **Abra o Supabase SQL Editor**
   - https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql/new

2. **Execute o SQL da migração**
   - O arquivo está em: `supabase/migrations/20250131_create_qa_benchmarks.sql`
   - Copie todo o conteúdo e execute no SQL Editor

3. **Verificar criação das tabelas**
   ```sql
   -- Verificar tabelas criadas
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('qa_benchmarks', 'qa_test_cases', 'llm_model_configs');
   
   -- Verificar dados inseridos
   SELECT COUNT(*) as test_cases FROM qa_test_cases;
   SELECT COUNT(*) as model_configs FROM llm_model_configs;
   ```

## ✅ Resultado Esperado

Após executar a migração, você terá:

1. **Tabelas Criadas**:
   - `qa_benchmarks` - Armazena resultados de benchmark
   - `qa_test_cases` - Casos de teste QA (5 casos padrão)
   - `llm_model_configs` - Configurações de 10+ modelos LLM

2. **View Criada**:
   - `benchmark_analysis` - Análise consolidada de performance

3. **Função Criada**:
   - `get_best_model_for_query()` - Retorna melhor modelo baseado em critérios

4. **Políticas RLS**:
   - Admins podem gerenciar tudo
   - Todos podem visualizar dados

## 🎯 Próximos Passos

Após aplicar a migração:

1. **Testar o sistema de benchmark**:
   ```bash
   node test-benchmark-system.mjs
   ```

2. **Acessar dashboard no admin**:
   - http://localhost:5173/admin/benchmark

3. **Executar benchmark completo**:
   - Use o botão "Executar Benchmark" no dashboard

## 📈 Benefícios

- **Análise automatizada** de trade-off entre modelos
- **Seleção inteligente** de modelo por tipo de query
- **Otimização de custos** com tokens
- **Métricas detalhadas** de performance

## 🔧 Troubleshooting

Se houver erro ao aplicar:

1. **Tabela já existe**: 
   - Execute `DROP TABLE IF EXISTS qa_benchmarks CASCADE;` antes
   
2. **Erro de permissão**:
   - Use o Service Role Key no SQL Editor

3. **Função não criada**:
   - Execute a função separadamente no final