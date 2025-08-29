import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

/**
 * Extract and Import Regime Urbanistico Data from document_rows to regime_urbanistico table
 * This script processes all 94 neighborhoods of Porto Alegre
 */

// Helper function to safely parse numeric values
function parseNumeric(value, defaultValue = null) {
  if (!value || value === 'Não se aplica' || value === 'S/L' || value === 'Isento') {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Helper function to normalize text values
function normalizeText(value) {
  if (!value || typeof value !== 'string') return null;
  return value.trim();
}

// Map document_rows data to regime_urbanistico table structure
function mapRegimeData(rowData) {
  const mapped = {
    bairro: normalizeText(rowData.Bairro),
    zona: normalizeText(rowData.Zona),
    
    // Heights and coefficients
    altura_max_m: parseNumeric(rowData['Altura Máxima - Edificação Isolada']),
    ca_max: parseNumeric(rowData['Coeficiente de Aproveitamento - Máximo']),
    to_base: parseNumeric(rowData['Coeficiente de Aproveitamento - Básico']),
    to_max: parseNumeric(rowData['Coeficiente de Aproveitamento - Máximo']),
    
    // Permeability rates (using the smaller lot requirement)
    taxa_permeabilidade: parseNumeric(rowData['Taxa de Permeabilidade (até 1.500 m²)']),
    
    // Setbacks
    recuo_jardim_m: parseNumeric(rowData['Recuo de Jardim']),
    recuo_lateral_m: normalizeText(rowData['Afastamentos - Laterais']),
    recuo_fundos_m: normalizeText(rowData['Afastamentos - Fundos']),
    
    // Lot specifications
    area_total_ha: null, // Not available in source data
    populacao: null, // Not available in source data
    densidade_hab_ha: null, // Not available in source data
    domicilios: null, // Not available in source data
    
    // Quarter block specifications
    quarteirao_padrao_m: parseNumeric(rowData['Face Máxima do Quarteirão']),
    divisao_lote: parseNumeric(rowData['Área Mínima do Lote']),
    remembramento: parseNumeric(rowData['Área Máxima do Quarteirão']),
    quota_ideal_m2: parseNumeric(rowData['Testada Mínima do Lote']),
    
    // Store all original data as metadata for reference
    metadata: {
      source: 'document_rows_extraction',
      dataset_id: '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk',
      original_data: rowData,
      extraction_date: new Date().toISOString(),
      
      // Additional fields that don't map directly
      area_minima_lote: parseNumeric(rowData['Área Mínima do Lote']),
      testada_minima_lote: parseNumeric(rowData['Testada Mínima do Lote']),
      modulo_fracionamento: parseNumeric(rowData['Módulo de Fracionamento']),
      face_maxima_quarteirao: parseNumeric(rowData['Face Máxima do Quarteirão']),
      area_maxima_quarteirao: parseNumeric(rowData['Área Máxima do Quarteirão']),
      
      // Permeability info
      taxa_permeabilidade_ate_1500: parseNumeric(rowData['Taxa de Permeabilidade (até 1.500 m²)']),
      taxa_permeabilidade_acima_1500: parseNumeric(rowData['Taxa de Permeabilidade (acima de 1.500 m²)']),
      fator_conversao_permeabilidade: normalizeText(rowData['Fator de Conversão da Taxa de Permeabilidade']),
      
      // Setback details
      afastamentos_frente: normalizeText(rowData['Afastamentos - Frente']),
      afastamentos_laterais: normalizeText(rowData['Afastamentos - Laterais']),
      afastamentos_fundos: normalizeText(rowData['Afastamentos - Fundos']),
      
      // Commercial and industrial restrictions
      comercio_varejista_ia1: normalizeText(rowData['Comércio Varejista IA1 – Restrição / Porte']),
      comercio_varejista_ia2: normalizeText(rowData['Comércio Varejista IA2 – Restrição / Porte']),
      comercio_atacadista_ia1: normalizeText(rowData['Comércio Atacadista IA1 – Restrição / Porte']),
      comercio_atacadista_ia2: normalizeText(rowData['Comércio Atacadista IA2 – Restrição / Porte']),
      comercio_atacadista_ia3: normalizeText(rowData['Comércio Atacadista IA3 – Restrição / Porte']),
      comercio_varejista_inocuo: normalizeText(rowData['Comércio Varejista Inócuo – Restrição / Porte']),
      servico_ia1: normalizeText(rowData['Serviço IA1 – Restrição / Porte']),
      servico_ia2: normalizeText(rowData['Serviço IA2 – Restrição / Porte']),
      servico_ia3: normalizeText(rowData['Serviço IA3 – Restrição / Porte']),
      servico_inocuo: normalizeText(rowData['Serviço Inócuo – Restrição / Porte']),
      industria_inocua: normalizeText(rowData['Indústria Inócua – Restrição / Porte']),
      industria_interferencia_ambiental: normalizeText(rowData['Indústria com Interferência Ambiental – Restrição / Porte']),
      
      // Entertainment control
      nivel_controle_entretenimento_noturno: normalizeText(rowData['Nível de Controle de Polarização de Entretenimento Noturno']),
      
      // Public area requirements
      area_publica_equipamentos_loteamento: parseNumeric(rowData['Área Pública – Equipamentos (Loteamento)']),
      area_publica_malha_viaria_loteamento: parseNumeric(rowData['Área Pública – Malha Viária (Loteamento)']),
      
      // Subdivision requirements
      enquadramento_loteamento: normalizeText(rowData['Enquadramento (Loteamento)']),
      enquadramento_fracionamento: normalizeText(rowData['Enquadramento (Fracionamento)']),
      enquadramento_desmembramento_tipo1: normalizeText(rowData['Enquadramento (Desmembramento Tipo 1)']),
      enquadramento_desmembramento_tipo2: normalizeText(rowData['Enquadramento (Desmembramento Tipo 2)']),
      enquadramento_desmembramento_tipo3: normalizeText(rowData['Enquadramento (Desmembramento Tipo 3)'])
    }
  };
  
  return mapped;
}

async function extractAndImportRegimeData() {
  console.log('🏗️ EXTRACTING REGIME URBANISTICO DATA FROM DOCUMENT_ROWS');
  console.log('📊 Dataset ID: 17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk');
  console.log('🎯 Target: All 94 neighborhoods of Porto Alegre\n');
  
  try {
    // Step 1: Fetch all regime data from document_rows
    console.log('📥 Step 1: Fetching all regime data from document_rows...');
    const { data: allRegimeData, error: fetchError } = await supabase
      .from('document_rows')
      .select('*')
      .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
      .order('id');
    
    if (fetchError) {
      throw new Error(`Error fetching data: ${fetchError.message}`);
    }
    
    console.log(`✅ Found ${allRegimeData.length} rows in document_rows`);
    
    // Step 2: Extract unique neighborhoods and prepare data
    console.log('\n📋 Step 2: Processing neighborhood data...');
    const neighborhoodMap = new Map();
    const zonesPerNeighborhood = new Map();
    
    allRegimeData.forEach(row => {
      if (row.row_data && row.row_data.Bairro) {
        const bairro = row.row_data.Bairro;
        const zona = row.row_data.Zona;
        
        if (!neighborhoodMap.has(bairro)) {
          neighborhoodMap.set(bairro, []);
          zonesPerNeighborhood.set(bairro, new Set());
        }
        
        neighborhoodMap.get(bairro).push(row.row_data);
        if (zona) {
          zonesPerNeighborhood.get(bairro).add(zona);
        }
      }
    });
    
    console.log(`✅ Found ${neighborhoodMap.size} unique neighborhoods`);
    
    // Step 3: Check existing data
    console.log('\n🔍 Step 3: Checking existing data in regime_urbanistico...');
    const { data: existingData, error: existingError } = await supabase
      .from('regime_urbanistico')
      .select('bairro');
    
    if (existingError) {
      throw new Error(`Error checking existing data: ${existingError.message}`);
    }
    
    const existingBairros = new Set(existingData?.map(r => r.bairro) || []);
    console.log(`✅ Found ${existingBairros.size} existing neighborhoods in regime_urbanistico`);
    
    // Step 4: Prepare import data
    console.log('\n⚙️ Step 4: Preparing data for import...');
    const dataToImport = [];
    let processedCount = 0;
    let skippedCount = 0;
    
    for (const [bairro, rowsData] of neighborhoodMap) {
      if (existingBairros.has(bairro)) {
        console.log(`⏭️ Skipping ${bairro} (already exists)`);
        skippedCount++;
        continue;
      }
      
      // Use the first row of data for each neighborhood
      // (some neighborhoods might have multiple zone entries)
      const representativeData = rowsData[0];
      const mappedData = mapRegimeData(representativeData);
      
      // Add zones information to metadata
      mappedData.metadata.zones = Array.from(zonesPerNeighborhood.get(bairro));
      mappedData.metadata.total_zone_entries = rowsData.length;
      
      dataToImport.push(mappedData);
      processedCount++;
      
      console.log(`✅ Prepared data for ${bairro} (${zonesPerNeighborhood.get(bairro).size} zones)`);
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total neighborhoods found: ${neighborhoodMap.size}`);
    console.log(`   Already exist: ${skippedCount}`);
    console.log(`   Ready to import: ${processedCount}`);
    
    if (dataToImport.length === 0) {
      console.log('\n✅ No new data to import. All neighborhoods already exist.');
      return;
    }
    
    // Step 5: Import data
    console.log(`\n💾 Step 5: Importing ${dataToImport.length} neighborhoods...`);
    
    // Import in batches of 50 to avoid timeout
    const batchSize = 50;
    let importedCount = 0;
    
    for (let i = 0; i < dataToImport.length; i += batchSize) {
      const batch = dataToImport.slice(i, i + batchSize);
      
      console.log(`📦 Importing batch ${Math.floor(i/batchSize) + 1} (${batch.length} items)...`);
      
      const { data: insertedData, error: insertError } = await supabase
        .from('regime_urbanistico')
        .insert(batch)
        .select('bairro');
      
      if (insertError) {
        console.error(`❌ Error importing batch: ${insertError.message}`);
        console.error('Failed batch data:', batch.map(b => b.bairro));
        continue;
      }
      
      console.log(`✅ Successfully imported ${insertedData.length} neighborhoods in this batch`);
      importedCount += insertedData.length;
      
      // Brief pause between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Step 6: Validation
    console.log(`\n🔍 Step 6: Validating import results...`);
    const { data: finalData, error: finalError } = await supabase
      .from('regime_urbanistico')
      .select('bairro, zona')
      .order('bairro');
    
    if (finalError) {
      throw new Error(`Error validating results: ${finalError.message}`);
    }
    
    console.log(`\n🎉 IMPORT COMPLETED SUCCESSFULLY!`);
    console.log(`📊 Final Results:`);
    console.log(`   Total neighborhoods in regime_urbanistico: ${finalData.length}`);
    console.log(`   Newly imported: ${importedCount}`);
    console.log(`   Previously existing: ${skippedCount}`);
    
    // Show list of all neighborhoods
    console.log(`\n📋 All neighborhoods in regime_urbanistico table:`);
    finalData.forEach((row, index) => {
      console.log(`   ${(index + 1).toString().padStart(2)}: ${row.bairro} (${row.zona || 'N/A'})`);
    });
    
    // Save summary to file
    const summary = {
      extraction_date: new Date().toISOString(),
      source_dataset_id: '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk',
      total_neighborhoods_found: neighborhoodMap.size,
      neighborhoods_imported: importedCount,
      neighborhoods_skipped: skippedCount,
      final_total_in_table: finalData.length,
      all_neighborhoods: finalData.map(r => ({ bairro: r.bairro, zona: r.zona }))
    };
    
    // Write summary file
    const fs = await import('fs');
    await fs.promises.writeFile(
      'regime-urbanistico-import-summary.json',
      JSON.stringify(summary, null, 2)
    );
    
    console.log(`\n📄 Import summary saved to: regime-urbanistico-import-summary.json`);
    
  } catch (error) {
    console.error('\n❌ ERROR during extraction and import:');
    console.error(error.message);
    console.error('\nStack trace:', error.stack);
  }
}

// Run the extraction and import
if (import.meta.url === `file://${process.argv[1]}`) {
  extractAndImportRegimeData();
}

export { extractAndImportRegimeData, mapRegimeData };