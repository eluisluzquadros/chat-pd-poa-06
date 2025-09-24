#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixCache() {
  console.log('🔧 Corrigindo sistema de cache...\n');
  
  try {
    // 1. Verificar estado atual
    const { count: beforeCount } = await supabase
      .from('query_cache')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Entries antes: ${beforeCount}`);
    
    // 2. Buscar e remover duplicatas
    const { data: allEntries } = await supabase
      .from('query_cache')
      .select('id, query_text, hit_count, created_at')
      .order('hit_count', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (allEntries) {
      const seen = new Set();
      const toDelete = [];
      
      for (const entry of allEntries) {
        const normalized = entry.query_text.toLowerCase().trim();
        if (seen.has(normalized)) {
          toDelete.push(entry.id);
        } else {
          seen.add(normalized);
        }
      }
      
      if (toDelete.length > 0) {
        console.log(`🗑️ Removendo ${toDelete.length} duplicatas...`);
        
        for (const id of toDelete) {
          await supabase
            .from('query_cache')
            .delete()
            .eq('id', id);
        }
      }
    }
    
    // 3. Adicionar algumas queries importantes se não existirem
    const importantQueries = [
      {
        query: 'o que são zeis',
        type: 'qa',
        response: 'ZEIS (Zonas Especiais de Interesse Social) são áreas urbanas destinadas prioritariamente à produção e regularização de Habitação de Interesse Social (HIS). Elas visam garantir moradia digna para a população de baixa renda, promovendo a inclusão socioespacial e o cumprimento da função social da propriedade urbana.'
      },
      {
        query: 'o que é coeficiente de aproveitamento',
        type: 'qa',
        response: 'O coeficiente de aproveitamento é um índice urbanístico que determina o potencial construtivo de um terreno. É calculado multiplicando a área do terreno pelo coeficiente. Existem dois tipos: BÁSICO (gratuito) e MÁXIMO (mediante outorga onerosa).'
      },
      {
        query: 'como funciona a outorga onerosa',
        type: 'qa',
        response: 'A outorga onerosa do direito de construir é um instrumento que permite construir acima do coeficiente básico até o máximo, mediante pagamento ao município. Os recursos devem ser aplicados em regularização fundiária, habitação de interesse social e melhorias urbanas.'
      }
    ];
    
    for (const item of importantQueries) {
      const normalized = item.query.toLowerCase().trim();
      
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('query_cache')
        .select('id')
        .ilike('query_text', normalized)
        .single();
      
      if (!existing) {
        // Criar hash simples
        let hash = 0;
        for (let i = 0; i < normalized.length; i++) {
          const char = normalized.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        const simpleHash = Math.abs(hash).toString(16);
        
        await supabase
          .from('query_cache')
          .insert({
            query_hash: simpleHash,
            query_text: normalized,
            query_type: item.type,
            result: { resposta: item.response },
            response_time_ms: 100,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            hit_count: 0
          });
        
        console.log(`✅ Adicionada: ${item.query}`);
      }
    }
    
    // 4. Verificar estado final
    const { count: afterCount } = await supabase
      .from('query_cache')
      .select('*', { count: 'exact', head: true });
    
    const { data: types } = await supabase
      .from('query_cache')
      .select('query_type');
    
    const typeCounts = {};
    if (types) {
      types.forEach(t => {
        typeCounts[t.query_type] = (typeCounts[t.query_type] || 0) + 1;
      });
    }
    
    console.log('\n📈 RESULTADO FINAL:');
    console.log(`📊 Total entries: ${afterCount}`);
    console.log(`📝 Por tipo:`, typeCounts);
    
    if (beforeCount > afterCount) {
      console.log(`🗑️ Removidas: ${beforeCount - afterCount} duplicatas`);
    }
    
    console.log('\n✅ Cache corrigido e otimizado!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

fixCache().catch(console.error);