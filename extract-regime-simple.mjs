import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

console.log('🏗️ STARTING REGIME URBANISTICO EXTRACTION...\n');

try {
  // Get all data from document_rows
  console.log('📥 Fetching data from document_rows...');
  const { data: allData, error: fetchError } = await supabase
    .from('document_rows')
    .select('*')
    .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk');
  
  if (fetchError) {
    console.error('❌ Error fetching data:', fetchError);
    process.exit(1);
  }
  
  console.log(`✅ Found ${allData.length} rows`);
  
  // Process first few rows to create import data
  const sampleData = [];
  const processed = new Set();
  
  for (const row of allData.slice(0, 10)) { // Process first 10 for testing
    if (!row.row_data || !row.row_data.Bairro) continue;
    
    const bairro = row.row_data.Bairro;
    if (processed.has(bairro)) continue;
    processed.add(bairro);
    
    const importRow = {
      bairro: bairro,
      zona: row.row_data.Zona || null,
      altura_max_m: parseFloat(row.row_data['Altura Máxima - Edificação Isolada']) || null,
      ca_max: parseFloat(row.row_data['Coeficiente de Aproveitamento - Máximo']) || null,
      to_base: parseFloat(row.row_data['Coeficiente de Aproveitamento - Básico']) || null,
      to_max: parseFloat(row.row_data['Coeficiente de Aproveitamento - Máximo']) || null,
      taxa_permeabilidade: parseFloat(row.row_data['Taxa de Permeabilidade (até 1.500 m²)']) || null,
      recuo_jardim_m: parseFloat(row.row_data['Recuo de Jardim']) || null,
      quarteirao_padrao_m: parseFloat(row.row_data['Face Máxima do Quarteirão']) || null,
      divisao_lote: parseFloat(row.row_data['Área Mínima do Lote']) || null,
      quota_ideal_m2: parseFloat(row.row_data['Testada Mínima do Lote']) || null,
      metadata: {
        source: 'document_rows_test',
        original_data: row.row_data
      }
    };
    
    sampleData.push(importRow);
    console.log(`✅ Prepared: ${bairro}`);
  }
  
  console.log(`\n📊 Ready to import ${sampleData.length} sample neighborhoods`);
  
  // Check what exists already
  const { data: existing } = await supabase
    .from('regime_urbanistico')
    .select('bairro');
  
  const existingBairros = new Set(existing?.map(r => r.bairro) || []);
  console.log(`📋 Existing neighborhoods: ${existingBairros.size}`);
  
  // Filter out existing ones
  const newData = sampleData.filter(row => !existingBairros.has(row.bairro));
  console.log(`📥 New neighborhoods to import: ${newData.length}`);
  
  if (newData.length > 0) {
    console.log('\n💾 Importing new data...');
    const { data: imported, error: importError } = await supabase
      .from('regime_urbanistico')
      .insert(newData)
      .select('bairro');
    
    if (importError) {
      console.error('❌ Import error:', importError);
    } else {
      console.log(`✅ Successfully imported ${imported.length} neighborhoods`);
      imported.forEach(row => console.log(`   - ${row.bairro}`));
    }
  }
  
  // Final check
  const { data: final } = await supabase
    .from('regime_urbanistico')
    .select('bairro')
    .order('bairro');
  
  console.log(`\n🎉 FINAL RESULT: ${final.length} total neighborhoods in regime_urbanistico table`);
  
} catch (error) {
  console.error('❌ Unexpected error:', error);
}