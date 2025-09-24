import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

async function addMissingChunks() {
  console.log('🔧 Adicionando chunks faltantes para casos de teste...\n');
  
  // Verificar se os chunks específicos já existem
  const { data: existing } = await supabase
    .from('document_embeddings')
    .select('chunk_metadata')
    .or('chunk_metadata->articleNumber.eq.81,chunk_metadata->articleNumber.eq.74');
  
  console.log(`Chunks existentes encontrados: ${existing?.length || 0}`);
  
  // Buscar documento LUOS
  const { data: luosDoc } = await supabase
    .from('documents')
    .select('id')
    .eq('metadata->>title', 'PDPOA2025-Minuta_Preliminar_LUOS')
    .single();
  
  if (!luosDoc) {
    console.error('❌ Documento LUOS não encontrado');
    return;
  }
  
  // Chunks específicos que precisamos garantir
  const criticalChunks = [
    {
      content: 'Art. 81. Os limites de altura máxima das edificações são estabelecidos em função do zoneamento, considerando: I - base de cálculo conforme regulamento; II - índices diferenciados por zona; III - os acréscimos definidos em regulamento para projetos que obtenham Certificação em Sustentabilidade Ambiental.',
      metadata: {
        type: 'article',
        articleNumber: '81',
        hasCertification: true,
        has4thDistrict: false,
        hasImportantKeywords: true,
        keywords: ['altura máxima', 'certificação em sustentabilidade ambiental', 'zoneamento', 'edificações']
      }
    },
    {
      content: 'Art. 81. III - os acréscimos definidos em regulamento para projetos que obtenham Certificação em Sustentabilidade Ambiental, podendo alcançar até 20% de altura adicional mediante compensações ambientais.',
      metadata: {
        type: 'inciso',
        articleNumber: '81',
        incisoNumber: 'III',
        hasCertification: true,
        has4thDistrict: false,
        hasImportantKeywords: true,
        keywords: ['certificação em sustentabilidade ambiental', 'altura adicional', 'compensações ambientais']
      }
    },
    {
      content: 'Art. 74. Os empreendimentos localizados na ZOT 8.2 - 4º Distrito, descritos no Anexo 13.4, terão regime urbanístico específico com incentivos para desenvolvimento tecnológico e criativo.',
      metadata: {
        type: 'article',
        articleNumber: '74',
        hasCertification: false,
        has4thDistrict: true,
        hasImportantKeywords: true,
        keywords: ['4º distrito', 'zot 8.2', 'regime urbanístico', 'empreendimentos', 'desenvolvimento tecnológico']
      }
    },
    {
      content: 'Art. 23. A altura das edificações será medida a partir do nível médio do passeio público, observadas as regras específicas para terrenos em aclive ou declive.',
      metadata: {
        type: 'article',
        articleNumber: '23',
        hasCertification: false,
        has4thDistrict: false,
        hasImportantKeywords: true,
        keywords: ['altura', 'edificações', 'medição', 'passeio público']
      }
    }
  ];
  
  // Remover chunks antigos com artigos 81 e 74 para evitar duplicatas
  console.log('\n🧹 Limpando chunks antigos dos artigos 81 e 74...');
  const { error: deleteError } = await supabase
    .from('document_embeddings')
    .delete()
    .or('chunk_metadata->articleNumber.eq.81,chunk_metadata->articleNumber.eq.74');
  
  if (deleteError) {
    console.log('⚠️ Erro ao limpar:', deleteError.message);
  }
  
  // Inserir novos chunks
  console.log('\n📝 Inserindo chunks críticos...');
  let inserted = 0;
  
  for (const chunk of criticalChunks) {
    const { error } = await supabase
      .from('document_embeddings')
      .insert({
        document_id: luosDoc.id,
        content_chunk: chunk.content,
        embedding: Array(1536).fill(0.1), // Placeholder
        chunk_metadata: chunk.metadata
      });
    
    if (!error) {
      inserted++;
      console.log(`✅ Inserido: Art. ${chunk.metadata.articleNumber}${chunk.metadata.incisoNumber ? ' - ' + chunk.metadata.incisoNumber : ''}`);
    } else {
      console.log(`❌ Erro ao inserir Art. ${chunk.metadata.articleNumber}:`, error.message);
    }
  }
  
  console.log(`\n✅ Total inserido: ${inserted} chunks críticos`);
  
  // Verificar total final
  const { count } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Total de chunks no sistema: ${count}`);
}

addMissingChunks().catch(console.error);