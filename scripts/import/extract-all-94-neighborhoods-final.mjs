import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

console.log('🏗️ FINAL EXTRACTION: ALL 94 NEIGHBORHOODS FROM DOCUMENT_ROWS');
console.log('📄 Target: regime_urbanistico_raw table (TEXT columns)\n');

async function createRawTableIfNeeded() {
  console.log('🔧 Checking if regime_urbanistico_raw table exists...');
  
  try {
    const { data, error } = await supabase
      .from('regime_urbanistico_raw')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('📋 Table does not exist. You need to create it first.');
      console.log('💡 Run this SQL in Supabase Dashboard:');
      console.log('   Execute the SQL from: create-regime-raw-table.sql');
      return false;
    } else if (error) {
      console.error('❌ Error checking table:', error);
      return false;
    } else {
      console.log('✅ Table exists and is accessible');
      return true;
    }
  } catch (error) {
    console.error('❌ Unexpected error checking table:', error);
    return false;
  }
}

try {
  // Check if target table exists
  const tableExists = await createRawTableIfNeeded();
  if (!tableExists) {
    console.log('\n❌ Cannot proceed without the regime_urbanistico_raw table.');
    console.log('📋 NEXT STEPS:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Execute the SQL from: create-regime-raw-table.sql');
    console.log('   3. Then run this script again');
    process.exit(1);
  }
  
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
  console.log(`📋 Neighborhoods found:`, Array.from(neighborhoodMap.keys()).sort());
  
  // Check existing data in raw table
  const { data: existing } = await supabase
    .from('regime_urbanistico_raw')
    .select('bairro');
  
  const existingBairros = new Set(existing?.map(r => r.bairro) || []);
  console.log(`\\n📊 Already in regime_urbanistico_raw: ${existingBairros.size}`);
  
  // Prepare import data with complete field mapping
  const importData = [];
  
  for (const [bairro, rowData] of neighborhoodMap) {
    if (existingBairros.has(bairro)) {
      console.log(`⏭️ Skipping ${bairro} (already exists)`);
      continue;
    }
    
    // Map ALL fields from the original data as TEXT (no conversion issues)
    const importRow = {
      bairro: bairro,
      zona: rowData.Zona || null,
      
      // Core zoning parameters
      altura_maxima_edificacao_isolada: rowData['Altura Máxima - Edificação Isolada'] || null,
      coeficiente_aproveitamento_basico: rowData['Coeficiente de Aproveitamento - Básico'] || null,
      coeficiente_aproveitamento_maximo: rowData['Coeficiente de Aproveitamento - Máximo'] || null,
      
      // Permeability
      taxa_permeabilidade_ate_1500m2: rowData['Taxa de Permeabilidade (até 1.500 m²)'] || null,
      taxa_permeabilidade_acima_1500m2: rowData['Taxa de Permeabilidade (acima de 1.500 m²)'] || null,
      fator_conversao_taxa_permeabilidade: rowData['Fator de Conversão da Taxa de Permeabilidade'] || null,
      
      // Setbacks
      recuo_jardim: rowData['Recuo de Jardim'] || null,
      afastamentos_frente: rowData['Afastamentos - Frente'] || null,
      afastamentos_laterais: rowData['Afastamentos - Laterais'] || null,
      afastamentos_fundos: rowData['Afastamentos - Fundos'] || null,
      
      // Lot specifications
      area_minima_lote: rowData['Área Mínima do Lote'] || null,
      testada_minima_lote: rowData['Testada Mínima do Lote'] || null,
      modulo_fracionamento: rowData['Módulo de Fracionamento'] || null,
      
      // Block specifications
      face_maxima_quarteirao: rowData['Face Máxima do Quarteirão'] || null,
      area_maxima_quarteirao: rowData['Área Máxima do Quarteirão'] || null,
      area_minima_quarteirao: rowData['Área Mínima do Quarteirão'] || null,
      
      // Subdivision frameworks
      enquadramento_loteamento: rowData['Enquadramento (Loteamento)'] || null,
      enquadramento_fracionamento: rowData['Enquadramento (Fracionamento)'] || null,
      enquadramento_desmembramento_tipo_1: rowData['Enquadramento (Desmembramento Tipo 1)'] || null,
      enquadramento_desmembramento_tipo_2: rowData['Enquadramento (Desmembramento Tipo 2)'] || null,
      enquadramento_desmembramento_tipo_3: rowData['Enquadramento (Desmembramento Tipo 3)'] || null,
      
      // Public areas - Loteamento
      area_publica_equipamentos_loteamento: rowData['Área Pública – Equipamentos (Loteamento)'] || null,
      area_publica_malha_viaria_loteamento: rowData['Área Pública – Malha Viária (Loteamento)'] || null,
      
      // Public areas - Desmembramento
      area_publica_equipamentos_desmembramento_tipo_1: rowData['Área Pública – Equipamentos (Desmembramento Tipo 1)'] || null,
      area_publica_malha_viaria_desmembramento_tipo_1: rowData['Área Pública – Malha Viária (Desmembramento Tipo 1)'] || null,
      area_publica_equipamentos_desmembramento_tipo_2: rowData['Área Pública – Equipamentos (Desmembramento Tipo 2)'] || null,
      area_publica_malha_viaria_desmembramento_tipo_2: rowData['Área Pública – Malha Viária (Desmembramento Tipo 2)'] || null,
      area_publica_equipamentos_desmembramento_tipo_3: rowData['Área Pública – Equipamentos (Desmembramento Tipo 3)'] || null,
      area_publica_malha_viaria_desmembramento_tipo_3: rowData['Área Pública – Malha Viária (Desmembramento Tipo 3)'] || null,
      
      // Public areas - Fracionamento
      area_destinacao_publica_equipamentos_fracionamento: rowData['Área de Destinação Pública – Equipamentos (Fracionamento)'] || null,
      area_destinacao_publica_malha_viaria_fracionamento: rowData['Área de Destinação Pública – Malha Viária (Fracionamento)'] || null,
      
      // +4D coefficients
      coeficiente_aproveitamento_basico_4d: rowData['Coeficiente de Aproveitamento Básico +4D'] || null,
      coeficiente_aproveitamento_maximo_4d: rowData['Coeficiente de Aproveitamento Máximo +4D'] || null,
      
      // Commercial restrictions
      comercio_varejista_inocuo_restricao_porte: rowData['Comércio Varejista Inócuo – Restrição / Porte'] || null,
      comercio_varejista_ia1_restricao_porte: rowData['Comércio Varejista IA1 – Restrição / Porte'] || null,
      comercio_varejista_ia2_restricao_porte: rowData['Comércio Varejista IA2 – Restrição / Porte'] || null,
      comercio_atacadista_ia1_restricao_porte: rowData['Comércio Atacadista IA1 – Restrição / Porte'] || null,
      comercio_atacadista_ia2_restricao_porte: rowData['Comércio Atacadista IA2 – Restrição / Porte'] || null,
      comercio_atacadista_ia3_restricao_porte: rowData['Comércio Atacadista IA3 – Restrição / Porte'] || null,
      
      // Service restrictions
      servico_inocuo_restricao_porte: rowData['Serviço Inócuo – Restrição / Porte'] || null,
      servico_ia1_restricao_porte: rowData['Serviço IA1 – Restrição / Porte'] || null,
      servico_ia2_restricao_porte: rowData['Serviço IA2 – Restrição / Porte'] || null,
      servico_ia3_restricao_porte: rowData['Serviço IA3 – Restrição / Porte'] || null,
      
      // Industrial restrictions
      industria_inocua_restricao_porte: rowData['Indústria Inócua – Restrição / Porte'] || null,
      industria_interferencia_ambiental_restricao_porte: rowData['Indústria com Interferência Ambiental – Restrição / Porte'] || null,
      
      // Entertainment control
      nivel_controle_polarizacao_entretenimento_noturno: rowData['Nível de Controle de Polarização de Entretenimento Noturno'] || null,
      
      // Metadata
      dataset_id: '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk',
      metadata: {
        source: 'document_rows_complete_extraction',
        extraction_date: new Date().toISOString(),
        row_id: rowData.id,
        all_original_fields: Object.keys(rowData)
      }
    };
    
    importData.push(importRow);
  }
  
  console.log(`\\n📊 Ready to import ${importData.length} new neighborhoods`);
  
  if (importData.length === 0) {
    console.log('✅ All neighborhoods already imported!');
  } else {
    // Import in smaller batches to avoid timeout
    const batchSize = 15;
    let importedCount = 0;
    
    for (let i = 0; i < importData.length; i += batchSize) {
      const batch = importData.slice(i, i + batchSize);
      
      console.log(`📦 Importing batch ${Math.floor(i/batchSize) + 1} (${batch.length} neighborhoods)...`);
      console.log(`   Neighborhoods: ${batch.map(b => b.bairro).join(', ')}`);
      
      const { data: imported, error: importError } = await supabase
        .from('regime_urbanistico_raw')
        .insert(batch)
        .select('bairro');
      
      if (importError) {
        console.error(`❌ Import error in batch ${Math.floor(i/batchSize) + 1}:`, importError);
        continue;
      }
      
      console.log(`✅ Successfully imported ${imported.length} neighborhoods`);
      importedCount += imported.length;
      
      // Brief pause between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\\n🎉 IMPORT COMPLETED!`);
    console.log(`   Newly imported: ${importedCount}`);
    console.log(`   Previously existing: ${existingBairros.size}`);
  }
  
  // Final validation
  const { data: final } = await supabase
    .from('regime_urbanistico_raw')
    .select('bairro, zona')
    .order('bairro');
  
  console.log(`\\n📊 FINAL RESULTS:`);
  console.log(`   Total neighborhoods in regime_urbanistico_raw: ${final.length}`);
  
  if (final.length >= 94) {
    console.log(`🎉 SUCCESS! All 94 neighborhoods have been imported!`);
  } else {
    console.log(`⚠️ PARTIAL: ${final.length} of 94 neighborhoods imported`);
  }
  
  console.log(`\\n📋 All neighborhoods in table:`);
  final.forEach((row, index) => {
    console.log(`   ${(index + 1).toString().padStart(2)}: ${row.bairro} (${row.zona || 'N/A'})`);
  });
  
  // Save results
  const fs = await import('fs');
  const results = {
    extraction_date: new Date().toISOString(),
    source_dataset_id: '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk',
    total_found_in_source: neighborhoodMap.size,
    total_in_table: final.length,
    success: final.length >= 94,
    neighborhoods: final.map(r => ({ bairro: r.bairro, zona: r.zona }))
  };
  
  await fs.promises.writeFile(
    'all-94-neighborhoods-extraction-results.json',
    JSON.stringify(results, null, 2)
  );
  
  console.log(`\\n📄 Results saved to: all-94-neighborhoods-extraction-results.json`);
  
} catch (error) {
  console.error('\\n❌ UNEXPECTED ERROR:', error);
}