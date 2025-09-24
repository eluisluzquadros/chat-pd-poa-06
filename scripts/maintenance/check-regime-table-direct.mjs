import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRegimeTable() {
  console.log('🔍 VERIFICANDO TABELA regime_urbanistico DIRETAMENTE\n');
  console.log('=' .repeat(70));
  
  // 1. Verificar quantos registros existem
  const { count: totalCount, error: countError } = await supabase
    .from('regime_urbanistico')
    .select('*', { count: 'exact', head: true });
  
  if (!countError) {
    console.log(`✅ Total de registros na tabela: ${totalCount}\n`);
  } else {
    console.log(`❌ Erro ao contar registros: ${countError.message}\n`);
  }
  
  // 2. Buscar alguns registros de exemplo
  console.log('📊 AMOSTRA DE DADOS:\n');
  
  const { data: sample, error: sampleError } = await supabase
    .from('regime_urbanistico')
    .select('*')
    .limit(5);
  
  if (!sampleError && sample) {
    sample.forEach((row, index) => {
      console.log(`Registro ${index + 1}:`);
      Object.keys(row).forEach(key => {
        if (row[key] !== null && row[key] !== '') {
          console.log(`  ${key}: ${row[key]}`);
        }
      });
      console.log('---');
    });
  } else {
    console.log('❌ Erro ao buscar amostra:', sampleError?.message);
  }
  
  // 3. Buscar Petrópolis especificamente
  console.log('\n🔍 BUSCANDO PETRÓPOLIS:\n');
  
  // Tentar diferentes colunas possíveis
  const columnsToTry = ['bairro', 'nome_bairro', 'nome', 'neighborhood'];
  
  for (const column of columnsToTry) {
    console.log(`Tentando coluna: ${column}`);
    
    const { data: petropolis, error: petroError } = await supabase
      .from('regime_urbanistico')
      .select('*')
      .ilike(column, '%Petrópolis%')
      .limit(5);
    
    if (!petroError && petropolis && petropolis.length > 0) {
      console.log(`  ✅ ENCONTRADO! ${petropolis.length} registros`);
      petropolis.forEach(p => {
        console.log(`    Bairro: ${p[column]}`);
        console.log(`    Dados completos:`, JSON.stringify(p, null, 2));
      });
      break;
    } else if (petroError) {
      console.log(`  ⚠️ Coluna ${column} não existe ou erro: ${petroError.message}`);
    } else {
      console.log(`  ❌ Nenhum resultado para ${column}`);
    }
  }
  
  // 4. Listar todos os bairros únicos
  console.log('\n📋 LISTA DE BAIRROS ÚNICOS (primeiros 20):\n');
  
  const { data: allData, error: allError } = await supabase
    .from('regime_urbanistico')
    .select('*');
  
  if (!allError && allData) {
    // Extrair bairros únicos de qualquer coluna que contenha nomes
    const bairrosSet = new Set();
    
    allData.forEach(row => {
      ['bairro', 'nome_bairro', 'nome', 'neighborhood'].forEach(col => {
        if (row[col] && typeof row[col] === 'string' && row[col].trim() !== '') {
          bairrosSet.add(row[col]);
        }
      });
    });
    
    const bairrosArray = Array.from(bairrosSet).sort();
    console.log(`Total de bairros únicos encontrados: ${bairrosArray.length}\n`);
    
    bairrosArray.slice(0, 20).forEach(bairro => {
      console.log(`  - ${bairro}`);
    });
    
    // Verificar se Petrópolis está na lista
    const hasPetropolis = bairrosArray.some(b => 
      b.toLowerCase().includes('petrópolis') || 
      b.toLowerCase().includes('petropolis')
    );
    
    if (hasPetropolis) {
      console.log('\n✅ Petrópolis está na lista de bairros!');
      const petropolisVariants = bairrosArray.filter(b => 
        b.toLowerCase().includes('petróp') || 
        b.toLowerCase().includes('petrop')
      );
      console.log('Variantes encontradas:', petropolisVariants);
    } else {
      console.log('\n❌ Petrópolis NÃO está na lista de bairros');
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Verificação concluída!');
  
  console.log('\n⚠️ PROBLEMA IDENTIFICADO:');
  console.log('O sistema precisa usar a tabela regime_urbanistico');
  console.log('com as colunas corretas para buscar dados dos bairros.');
}

checkRegimeTable().catch(console.error);