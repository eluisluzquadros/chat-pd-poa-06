import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

console.log('🏗️ EXTRACTING ALL 94 NEIGHBORHOODS TO EXISTING TABLE');
console.log('🎯 Working with current regime_urbanistico table structure\n');

// Helper function to safely parse numeric values
function parseNumeric(value, defaultValue = null) {
  if (!value || value === 'Não se aplica' || value === 'S/L' || value === 'Isento') {
    return defaultValue;
  }
  
  // Handle percentage-based rules like "18% da altura total..."
  if (typeof value === 'string' && value.includes('%')) {
    return defaultValue; // Can't convert percentage rules to numbers
  }
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Helper function to parse boolean from numeric values
function parseBoolean(value, defaultValue = false) {
  const num = parseNumeric(value);
  return num !== null ? num > 0 : defaultValue;
}

// Helper function to clean text values for the recuo fields
function cleanTextValue(value) {
  if (!value) return null;
  if (value === 'Não se aplica' || value === 'S/L') return null;
  return String(value);
}

try {
  // Get all data from document_rows
  console.log('📥 Fetching ALL regime data from document_rows...');
  const { data: allData, error: fetchError } = await supabase
    .from('document_rows')
    .select('*')
    .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
    .order('id');
  
  if (fetchError) {
    console.error('❌ Error fetching data:', fetchError);
    process.exit(1);
  }
  
  console.log(`✅ Found ${allData.length} rows in document_rows`);
  
  // Group by neighborhood to get unique neighborhoods
  const neighborhoodMap = new Map();
  
  for (const row of allData) {
    if (!row.row_data || !row.row_data.Bairro) continue;
    
    const bairro = row.row_data.Bairro;
    
    // Keep the first occurrence of each neighborhood
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
  console.log(`📊 Already in regime_urbanistico: ${existingBairros.size}`);
  
  // Prepare import data, being very careful with data types
  const importData = [];
  
  for (const [bairro, rowData] of neighborhoodMap) {
    if (existingBairros.has(bairro)) {
      console.log(`⏭️ Skipping ${bairro} (already exists)`);
      continue;
    }
    
    // Map to existing table structure with careful type handling
    const importRow = {
      bairro: bairro,
      zona: rowData.Zona || 'N/A',
      
      // Numeric fields - only if they're actually numeric
      altura_max_m: parseNumeric(rowData['Altura Máxima - Edificação Isolada']),
      ca_max: parseNumeric(rowData['Coeficiente de Aproveitamento - Máximo']),
      to_base: parseNumeric(rowData['Coeficiente de Aproveitamento - Básico']),
      to_max: parseNumeric(rowData['Coeficiente de Aproveitamento - Máximo']),
      taxa_permeabilidade: parseNumeric(rowData['Taxa de Permeabilidade (até 1.500 m²)']),
      recuo_jardim_m: parseNumeric(rowData['Recuo de Jardim']),
      
      // Text fields - can handle complex rules
      recuo_lateral_m: cleanTextValue(rowData['Afastamentos - Laterais']),
      recuo_fundos_m: cleanTextValue(rowData['Afastamentos - Fundos']),
      
      // Set to null since not available in source
      area_total_ha: null,
      populacao: null,
      densidade_hab_ha: null,
      domicilios: null,
      
      // More numeric fields
      quarteirao_padrao_m: parseNumeric(rowData['Face Máxima do Quarteirão']),
      quota_ideal_m2: parseNumeric(rowData['Testada Mínima do Lote']),
      
      // Boolean fields based on numeric values
      divisao_lote: parseBoolean(rowData['Área Mínima do Lote']),
      remembramento: parseBoolean(rowData['Área Máxima do Quarteirão']),
      
      // Comprehensive metadata with all original data
      metadata: {
        source: 'document_rows_final_extraction',
        dataset_id: '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk',
        extraction_date: new Date().toISOString(),
        original_data: {
          // Store all the original values for reference
          altura_maxima_original: rowData['Altura Máxima - Edificação Isolada'],
          ca_basico_original: rowData['Coeficiente de Aproveitamento - Básico'],
          ca_maximo_original: rowData['Coeficiente de Aproveitamento - Máximo'],
          taxa_permeabilidade_original: rowData['Taxa de Permeabilidade (até 1.500 m²)'],
          afastamentos_frente: rowData['Afastamentos - Frente'],
          afastamentos_laterais: rowData['Afastamentos - Laterais'],
          afastamentos_fundos: rowData['Afastamentos - Fundos'],
          area_minima_lote: rowData['Área Mínima do Lote'],
          testada_minima_lote: rowData['Testada Mínima do Lote'],
          face_maxima_quarteirao: rowData['Face Máxima do Quarteirão'],
          area_maxima_quarteirao: rowData['Área Máxima do Quarteirão'],
          enquadramento_loteamento: rowData['Enquadramento (Loteamento)'],
          comercial_restrictions: {
            comercio_varejista_ia1: rowData['Comércio Varejista IA1 – Restrição / Porte'],
            comercio_varejista_ia2: rowData['Comércio Varejista IA2 – Restrição / Porte'],
            comercio_atacadista_ia1: rowData['Comércio Atacadista IA1 – Restrição / Porte'],
            comercio_atacadista_ia2: rowData['Comércio Atacadista IA2 – Restrição / Porte'],
            comercio_atacadista_ia3: rowData['Comércio Atacadista IA3 – Restrição / Porte']
          },
          service_restrictions: {
            servico_ia1: rowData['Serviço IA1 – Restrição / Porte'],
            servico_ia2: rowData['Serviço IA2 – Restrição / Porte'],
            servico_ia3: rowData['Serviço IA3 – Restrição / Porte'],
            servico_inocuo: rowData['Serviço Inócuo – Restrição / Porte']
          },
          industrial_restrictions: {
            industria_inocua: rowData['Indústria Inócua – Restrição / Porte'],
            industria_interferencia: rowData['Indústria com Interferência Ambiental – Restrição / Porte']
          },
          entertainment_control: rowData['Nível de Controle de Polarização de Entretenimento Noturno']
        }
      }
    };
    
    importData.push(importRow);
  }
  
  console.log(`\\n📊 Ready to import ${importData.length} new neighborhoods`);
  
  if (importData.length === 0) {
    console.log('✅ All neighborhoods already imported!');
  } else {
    // Import one by one to see which ones fail
    let successCount = 0;
    let failureCount = 0;
    const failed = [];
    
    for (const neighborhood of importData) {
      try {
        console.log(`📦 Importing ${neighborhood.bairro}...`);
        
        const { data: imported, error: importError } = await supabase
          .from('regime_urbanistico')
          .insert([neighborhood])
          .select('bairro');
        
        if (importError) {
          console.error(`❌ Failed ${neighborhood.bairro}:`, importError.message);
          failed.push({ bairro: neighborhood.bairro, error: importError.message });
          failureCount++;
        } else {
          console.log(`✅ Success ${neighborhood.bairro}`);
          successCount++;
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Unexpected error with ${neighborhood.bairro}:`, error.message);
        failureCount++;
      }
    }
    
    console.log(`\\n📊 IMPORT RESULTS:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    
    if (failed.length > 0) {
      console.log(`\\n❌ Failed neighborhoods:`);
      failed.forEach(f => console.log(`   - ${f.bairro}: ${f.error}`));
    }
  }
  
  // Final count
  const { data: final } = await supabase
    .from('regime_urbanistico')
    .select('bairro, zona')
    .order('bairro');
  
  console.log(`\\n🎉 FINAL RESULTS:`);
  console.log(`   Total neighborhoods in regime_urbanistico: ${final.length}`);
  
  if (final.length >= 90) {
    console.log(`🎉 SUCCESS! Almost all neighborhoods imported!`);
  } else {
    console.log(`⚠️ PARTIAL: ${final.length} of 94 neighborhoods imported`);
  }
  
  // Save complete results
  const fs = await import('fs');
  const results = {
    extraction_date: new Date().toISOString(),
    source_dataset_id: '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk',
    total_found_in_source: neighborhoodMap.size,
    total_in_table: final.length,
    success_rate: `${final.length}/94`,
    all_neighborhoods: final.map(r => ({ bairro: r.bairro, zona: r.zona }))
  };
  
  await fs.promises.writeFile(
    'final-regime-extraction-results.json',
    JSON.stringify(results, null, 2)
  );
  
  console.log(`\\n📄 Complete results saved to: final-regime-extraction-results.json`);
  
} catch (error) {
  console.error('\\n❌ UNEXPECTED ERROR:', error);
}