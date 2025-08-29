# 📚 Exemplos Práticos - Supabase CLI

## 🚀 Deploy de Funções

### Deploy Individual
```bash
# Deploy de uma função específica
npx supabase functions deploy query-analyzer --project-ref ngrqwmvuhvjkeohesbxs
```

### Deploy em Lote
```bash
# Deploy de todas as funções principais (executar uma por vez)
npx supabase functions deploy query-analyzer --project-ref ngrqwmvuhvjkeohesbxs && \
npx supabase functions deploy sql-generator --project-ref ngrqwmvuhvjkeohesbxs && \
npx supabase functions deploy qa-validator --project-ref ngrqwmvuhvjkeohesbxs && \
npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs && \
npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs
```

## 🔍 Queries SQL via Node.js

### 1. Buscar Dados de um Bairro Específico
```javascript
// arquivo: check_bairro.mjs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

const bairro = 'CAVALHADA'; // Altere para o bairro desejado

const { data, error } = await supabase
  .from('document_rows')
  .select('row_data')
  .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
  .ilike('row_data->>Bairro', `%${bairro}%`)
  .limit(10);

if (error) {
  console.error('Erro:', error);
} else {
  console.log(`Encontrados ${data.length} registros para ${bairro}:`);
  data.forEach((row, i) => {
    console.log(`\n--- Registro ${i + 1} ---`);
    console.log(`ZOT: ${row.row_data.Zona}`);
    console.log(`Altura Máxima: ${row.row_data['Altura Máxima - Edificação Isolada']}`);
    console.log(`CA Básico: ${row.row_data['Coeficiente de Aproveitamento - Básico']}`);
    console.log(`CA Máximo: ${row.row_data['Coeficiente de Aproveitamento - Máximo']}`);
  });
}
```

### 2. Listar Todos os Bairros
```javascript
// arquivo: list_all_bairros.mjs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

const { data, error } = await supabase
  .from('document_rows')
  .select('row_data->>Bairro')
  .eq('dataset_id', '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY')
  .order('row_data->>Bairro');

if (!error) {
  const bairros = [...new Set(data.map(d => d.Bairro))].filter(Boolean);
  console.log(`Total de bairros: ${bairros.length}`);
  bairros.forEach((bairro, i) => console.log(`${i + 1}. ${bairro}`));
}
```

## 🗑️ Gerenciamento de Cache

### 1. Limpar Todo o Cache
```javascript
// arquivo: clear_all_cache.mjs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

const { data: cacheCount } = await supabase
  .from('query_cache')
  .select('id', { count: 'exact', head: true });

console.log(`Entradas no cache: ${cacheCount.length}`);

const { error } = await supabase
  .from('query_cache')
  .delete()
  .gte('id', 0);

console.log(error ? `Erro: ${error.message}` : 'Cache limpo com sucesso!');
```

### 2. Limpar Cache de Queries Antigas
```javascript
// arquivo: clear_old_cache.mjs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

// Deletar cache com mais de 7 dias
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const { error } = await supabase
  .from('query_cache')
  .delete()
  .lt('created_at', sevenDaysAgo.toISOString());

console.log(error ? `Erro: ${error.message}` : 'Cache antigo limpo!');
```

## 🧪 Testar Edge Functions

### 1. Testar Query Analyzer
```javascript
// arquivo: test_query_analyzer.mjs
const response = await fetch('https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/query-analyzer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg'
  },
  body: JSON.stringify({
    query: 'o que posso construir no bairro cavalhada?',
    sessionId: 'test-' + Date.now()
  })
});

const result = await response.json();
console.log('Análise:', JSON.stringify(result, null, 2));
```

### 2. Testar RAG Completo
```javascript
// arquivo: test_rag.mjs
const response = await fetch('https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/agentic-rag', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg'
  },
  body: JSON.stringify({
    message: 'o que posso construir no bairro cavalhada?',
    sessionId: 'test-' + Date.now(),
    bypassCache: true // Forçar nova resposta
  })
});

const result = await response.json();
console.log('Resposta:', result.response);
console.log('Confiança:', result.confidence);
```

## 💡 Dicas Úteis

1. **Para executar scripts .mjs**: 
   ```bash
   node nome_do_arquivo.mjs
   ```

2. **Para debug de queries SQL**:
   - Use o Dashboard: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql
   - Adicione `.explain()` antes de executar para ver o plano de execução

3. **Para monitorar logs das funções**:
   - Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions

4. **Chaves de API**:
   - **Anon Key** (pública): Para operações do cliente
   - **Service Role Key** (privada): Para operações administrativas - NUNCA exponha!

---

**Última atualização:** 30/07/2025