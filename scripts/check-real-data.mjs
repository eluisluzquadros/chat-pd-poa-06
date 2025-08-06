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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkData() {
  // 1. Verificar dados de Três Figueiras
  console.log('🔍 VERIFICANDO DADOS DO BAIRRO TRÊS FIGUEIRAS\n');
  
  const { data: tresFigueiras, error: tfError } = await supabase
    .from('regime_urbanistico')
    .select('*')
    .ilike('bairro', '%TRÊS FIGUEIRAS%')
    .order('zona');
  
  if (!tfError && tresFigueiras) {
    console.log('Registros encontrados:', tresFigueiras.length);
    tresFigueiras.forEach(r => {
      console.log(`- Zona: ${r.zona}, Altura: ${r.altura_maxima}m, CA básico: ${r.coef_aproveitamento_basico}, CA máximo: ${r.coef_aproveitamento_maximo}`);
    });
  } else {
    console.log('Erro ou nenhum registro:', tfError);
  }
  
  // 2. Verificar altura máxima mais alta
  console.log('\n🏢 VERIFICANDO ALTURA MÁXIMA MAIS ALTA\n');
  
  const { data: maxAltura, error: maxError } = await supabase
    .from('regime_urbanistico')
    .select('*')
    .order('altura_maxima', { ascending: false })
    .limit(5);
  
  if (!maxError && maxAltura) {
    console.log('Top 5 alturas máximas:');
    maxAltura.forEach(r => {
      console.log(`- Bairro: ${r.bairro}, Zona: ${r.zona}, Altura: ${r.altura_maxima}m`);
    });
  }
  
  // 3. Verificar Centro Histórico
  console.log('\n🏛️ VERIFICANDO CENTRO HISTÓRICO\n');
  
  const { data: centro, error: centroError } = await supabase
    .from('regime_urbanistico')
    .select('*')
    .ilike('bairro', '%CENTRO HISTÓRICO%')
    .order('zona');
  
  if (!centroError && centro) {
    console.log('Registros encontrados:', centro.length);
    centro.forEach(r => {
      console.log(`- Zona: ${r.zona}, Altura: ${r.altura_maxima}m, CA básico: ${r.coef_aproveitamento_basico}, CA máximo: ${r.coef_aproveitamento_maximo}`);
    });
  } else {
    console.log('Nenhum registro ou erro:', centroError);
  }
  
  // 4. Verificar Petrópolis com detalhes
  console.log('\n🏘️ VERIFICANDO PETRÓPOLIS COM DETALHES\n');
  
  const { data: petropolis, error: petropolisError } = await supabase
    .from('regime_urbanistico')
    .select('*')
    .ilike('bairro', '%PETRÓPOLIS%')
    .order('zona');
  
  if (!petropolisError && petropolis) {
    console.log('Registros encontrados:', petropolis.length);
    petropolis.forEach(r => {
      console.log(`- Zona: ${r.zona}`);
      console.log(`  Altura: ${r.altura_maxima}m`);
      console.log(`  CA básico: ${r.coef_aproveitamento_basico}`);
      console.log(`  CA máximo: ${r.coef_aproveitamento_maximo}`);
      console.log('');
    });
  }
}

checkData().catch(console.error);