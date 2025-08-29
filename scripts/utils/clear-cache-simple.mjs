import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function clearCache() {
  console.log('🧹 LIMPANDO CACHE DO SISTEMA\n');
  console.log('=' .repeat(50));
  
  try {
    // 1. Limpar query_cache
    console.log('\n📋 Limpando cache de queries...');
    const { data, error, count } = await supabase
      .from('query_cache')
      .delete()
      .neq('key', '00000000-0000-0000-0000-000000000000') // Deleta tudo exceto um ID impossível
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('   ⚠️ Tabela query_cache pode não existir ou estar vazia');
      console.log('   Detalhes:', error.message);
    } else {
      console.log(`   ✅ ${count || 'Todas as'} entradas removidas do cache`);
    }
    
    // 2. Limpar métricas antigas
    console.log('\n📊 Limpando métricas antigas...');
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const { error: metricsError, count: metricsCount } = await supabase
      .from('quality_metrics')
      .delete()
      .lt('created_at', threeDaysAgo.toISOString())
      .select('*', { count: 'exact', head: true });
    
    if (metricsError) {
      console.log('   ⚠️ Erro ao limpar métricas:', metricsError.message);
    } else {
      console.log(`   ✅ ${metricsCount || 0} métricas antigas removidas`);
    }
    
    // 3. Verificar tabela regime_urbanistico
    console.log('\n🏢 Verificando tabela regime_urbanistico...');
    const { count: regimeCount, error: regimeError } = await supabase
      .from('regime_urbanistico')
      .select('*', { count: 'exact', head: true });
    
    if (regimeError) {
      console.log('   ❌ Erro ao acessar regime_urbanistico:', regimeError.message);
    } else {
      console.log(`   ✅ Tabela contém ${regimeCount} registros`);
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Limpeza concluída!');
    console.log('\n💡 IMPORTANTE: O cache foi limpo. As próximas consultas');
    console.log('   no chat web devem buscar dados frescos do banco.');
    console.log('\n🔄 Recarregue a página do chat para garantir que');
    console.log('   não há dados em cache no navegador.');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

clearCache().catch(console.error);