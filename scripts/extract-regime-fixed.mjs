import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

console.log('🏗️ EXTRACTING REGIME URBANISTICO DATA - FIXED VERSION\n');

// Helper function to safely parse numeric values
function parseNumeric(value, defaultValue = null) {
  if (!value || value === 'Não se aplica' || value === 'S/L' || value === 'Isento') {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Helper function to parse boolean values
function parseBoolean(value, defaultValue = false) {
  if (!value || value === 'Não se aplica') {
    return defaultValue;
  }
  // Assuming any numeric value > 0 means true for division/remembering lots
  if (typeof value === 'string' && !isNaN(parseFloat(value))) {
    return parseFloat(value) > 0;
  }
  return defaultValue;
}

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
  
  console.log(`✅ Found ${allData.length} rows in document_rows`);
  
  // Process all neighborhoods, keeping only one row per neighborhood
  const neighborhoodMap = new Map();
  
  for (const row of allData) {
    if (!row.row_data || !row.row_data.Bairro) continue;
    
    const bairro = row.row_data.Bairro;
    
    // Keep only the first occurrence of each neighborhood
    if (!neighborhoodMap.has(bairro)) {
      neighborhoodMap.set(bairro, row.row_data);
    }
  }
  
  console.log(`✅ Found ${neighborhoodMap.size} unique neighborhoods`);
  
  // Check existing data
  const { data: existing } = await supabase
    .from('regime_urbanistico')
    .select('bairro');
  
  const existingBairros = new Set(existing?.map(r => r.bairro) || []);
  console.log(`📋 Existing neighborhoods: ${existingBairros.size}`);
  
  // Prepare import data with correct column mapping
  const importData = [];
  let processed = 0;
  
  for (const [bairro, rowData] of neighborhoodMap) {
    if (existingBairros.has(bairro)) {
      console.log(`⏭️ Skipping ${bairro} (already exists)`);
      continue;
    }
    
    // Map to the actual table structure (based on the sample data we saw)
    const importRow = {
      bairro: bairro,
      zona: rowData.Zona || 'N/A',
      altura_max_m: parseNumeric(rowData['Altura Máxima - Edificação Isolada']),
      ca_max: parseNumeric(rowData['Coeficiente de Aproveitamento - Máximo']),
      to_base: parseNumeric(rowData['Coeficiente de Aproveitamento - Básico']),
      to_max: parseNumeric(rowData['Coeficiente de Aproveitamento - Máximo']),
      taxa_permeabilidade: parseNumeric(rowData['Taxa de Permeabilidade (até 1.500 m²)']),
      recuo_jardim_m: parseNumeric(rowData['Recuo de Jardim']),
      recuo_lateral_m: rowData['Afastamentos - Laterais'] || null,
      recuo_fundos_m: rowData['Afastamentos - Fundos'] || null,
      area_total_ha: null, // Not available in source data
      populacao: null, // Not available in source data
      densidade_hab_ha: null, // Not available in source data  
      domicilios: null, // Not available in source data
      quarteirao_padrao_m: parseNumeric(rowData['Face Máxima do Quarteirão']),
      divisao_lote: parseBoolean(rowData['Área Mínima do Lote']),
      remembramento: parseBoolean(rowData['Área Máxima do Quarteirão']),
      quota_ideal_m2: parseNumeric(rowData['Testada Mínima do Lote']),
      metadata: {
        source: 'document_rows_extraction',
        dataset_id: '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk',
        original_data: rowData,
        extraction_date: new Date().toISOString()
      }
    };
    
    importData.push(importRow);
    processed++;
    
    if (processed <= 5) { // Show first 5 for debugging
      console.log(`✅ Prepared: ${bairro} (Alt: ${importRow.altura_max_m}m, CA: ${importRow.ca_max})`);
    }
  }
  
  console.log(`\n📊 Ready to import ${importData.length} neighborhoods`);
  
  if (importData.length === 0) {
    console.log('✅ No new data to import. All neighborhoods already exist.');
    process.exit(0);
  }
  
  // Import in batches to avoid timeout
  const batchSize = 20;
  let importedCount = 0;
  
  for (let i = 0; i < importData.length; i += batchSize) {
    const batch = importData.slice(i, i + batchSize);
    
    console.log(`📦 Importing batch ${Math.floor(i/batchSize) + 1} (${batch.length} neighborhoods)...`);
    
    const { data: imported, error: importError } = await supabase
      .from('regime_urbanistico')
      .insert(batch)
      .select('bairro');
    
    if (importError) {
      console.error(`❌ Import error in batch ${Math.floor(i/batchSize) + 1}:`, importError);
      console.error('Failed neighborhoods:', batch.map(b => b.bairro));
      continue;
    }
    
    console.log(`✅ Successfully imported ${imported.length} neighborhoods`);
    importedCount += imported.length;
    
    // Brief pause between batches
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Final validation
  const { data: final } = await supabase
    .from('regime_urbanistico')
    .select('bairro, zona')
    .order('bairro');
  
  console.log(`\n🎉 EXTRACTION COMPLETED!`);
  console.log(`📊 Results:`);
  console.log(`   Total neighborhoods in database: ${final.length}`);
  console.log(`   Newly imported: ${importedCount}`);
  console.log(`   Previously existing: ${existingBairros.size}`);
  
  if (final.length >= 90) {
    console.log(`✅ SUCCESS: Most/all 94 neighborhoods have been imported!`);
  } else {
    console.log(`⚠️ PARTIAL: Only ${final.length} of 94 neighborhoods imported`);
  }
  
  // Save results summary
  const fs = await import('fs');
  const summary = {
    extraction_date: new Date().toISOString(),
    source_dataset_id: '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk',
    total_found: neighborhoodMap.size,
    newly_imported: importedCount,
    previously_existing: existingBairros.size,
    final_total: final.length,
    neighborhoods: final.map(r => ({ bairro: r.bairro, zona: r.zona }))
  };
  
  await fs.promises.writeFile(
    'regime-extraction-results.json',
    JSON.stringify(summary, null, 2)
  );
  
  console.log(`\n📄 Results saved to: regime-extraction-results.json`);
  
} catch (error) {
  console.error('\n❌ UNEXPECTED ERROR:', error);
  console.error('Stack trace:', error.stack);
}