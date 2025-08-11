import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

interface IngestParams {
  limit?: number;
  dryRun?: boolean;
  categories?: string[];
  overwrite?: boolean;
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const resp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small", // 1536 dims (safer default)
        input: text,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Embedding API error:", resp.status, errText);
      return null;
    }

    const data = await resp.json();
    const embedding = data?.data?.[0]?.embedding as number[] | undefined;
    return embedding || null;
  } catch (e) {
    console.error("Error generating embedding:", e);
    return null;
  }
}

function buildContent(tc: any) {
  const answer = tc.expected_answer || "";
  const title = `QA: ${tc.question || tc.test_id || `Caso ${tc.id}`}`;
  const parts = [
    `Pergunta: ${tc.question || tc.test_id || ''}`,
    `Resposta: ${answer}`,
    `Categoria: ${tc.category || 'geral'}`,
    `Tags: ${(tc.tags || []).join(', ')}`,
    `Fonte: QA / Casos de Teste`,
    `Versão do caso: ${tc.version ?? '1'}`,
  ];
  // Dica leve para ZOTs no conteúdo
  if ((tc.question || '').toLowerCase().includes('zot')) {
    parts.push('Observação: Este conteúdo foi marcado como relacionado a ZOT.');
  }
  return { title, content: parts.join('\n') };
}

async function upsertDocumentForTestCase(tc: any, overwrite = false) {
  const meta = {
    source: 'qa',
    test_case_id: String(tc.id),
    category: tc.category,
    tags: tc.tags || [],
    version: tc.version ?? 1,
  };

  // Check existing
  const { data: existing, error: existingErr } = await supabase
    .from('documents')
    .select('id')
    .contains('metadata', { source: 'qa', test_case_id: String(tc.id) })
    .maybeSingle();

  if (existingErr) {
    console.error('Error checking existing document:', existingErr);
  }

  const { title, content } = buildContent(tc);

  if (existing?.id && !overwrite) {
    return { id: existing.id as number, title, content, isNew: false };
  }

  if (existing?.id && overwrite) {
    const { error: updErr } = await supabase
      .from('documents')
      .update({ title, content, metadata: meta, is_processed: true, type: 'qa_case' })
      .eq('id', existing.id);
    if (updErr) console.error('Error updating document:', updErr);
    return { id: existing.id as number, title, content, isNew: false };
  }

  const { data: insertDoc, error: insertErr } = await supabase
    .from('documents')
    .insert({
      title,
      content,
      is_public: true,
      type: 'qa_case',
      metadata: meta,
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('Error creating document:', insertErr);
    throw insertErr;
  }

  return { id: insertDoc!.id as number, title, content, isNew: true };
}

async function replaceEmbeddings(documentId: number, content: string, chunkMeta: Record<string, any>) {
  // Delete old embeddings for this doc to avoid duplicates
  const { error: delErr } = await supabase
    .from('document_embeddings')
    .delete()
    .eq('document_id', documentId);
  if (delErr) {
    console.error('Error deleting old embeddings:', delErr);
  }

  const embedding = await generateEmbedding(content);
  if (!embedding) {
    throw new Error('Failed to generate embedding');
  }

  // Insert new embedding row
  const { error: insErr } = await supabase
    .from('document_embeddings')
    .insert({
      document_id: documentId,
      content_chunk: content.slice(0, 8000),
      embedding,
      chunk_metadata: chunkMeta,
    });

  if (insErr) {
    console.error('Error inserting embedding:', insErr);
    throw insErr;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as IngestParams;
    const limit = body.limit ?? 5000;
    const dryRun = body.dryRun ?? false;
    const categories = body.categories;
    const overwrite = body.overwrite ?? true;

    if (!OPENAI_API_KEY && !dryRun) {
      return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY secret' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch QA test cases
    let query = supabase
      .from('qa_test_cases')
      .select('id, test_id, question, expected_answer, category, tags, is_sql_related, version, expected_sql, is_active')
      .eq('is_active', true)
      .limit(limit);

    if (categories && categories.length > 0) {
      query = query.in('category', categories);
    }

    const { data: testCases, error: tcErr } = await query;
    if (tcErr) {
      console.error('Error fetching test cases:', tcErr);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch test cases',
        details: tcErr,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const items = (testCases || []).filter(tc => (tc.expected_answer));

    const summary = {
      totalFetched: testCases?.length || 0,
      totalWithAnswer: items.length,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      logs: [] as string[],
    };

    // Simple concurrency control
    const concurrency = 5;
    let index = 0;

    async function worker(workerId: number) {
      while (index < items.length) {
        const current = index++;
        const tc = items[current];
        try {
          const { title, content } = buildContent(tc);
          if (dryRun) {
            const up = await upsertDocumentForTestCase(tc, overwrite);
            summary.processed++;
            if (up.isNew) summary.created++; else summary.updated++;
            summary.logs.push(`[DRYRUN] Upserted TC ${tc.id} -> doc ${up.id}; embeddings skipped`);
            continue;
          }

          const up = await upsertDocumentForTestCase(tc, overwrite);
          const chunkMeta = {
            source: 'qa',
            test_case_id: String(tc.id),
            category: tc.category,
            tags: tc.tags || [],
            is_sql_related: !!tc.is_sql_related,
            version: tc.version ?? 1,
          };

          await replaceEmbeddings(up.id, content, chunkMeta);

          summary.processed++;
          if (up.isNew) summary.created++; else summary.updated++;
          if (summary.processed % 25 === 0) {
            console.log(`Progress: ${summary.processed}/${items.length}`);
          }
        } catch (e) {
          console.error('Error processing test case', tc.id, e);
          summary.errors++;
          summary.logs.push(`Error TC ${tc.id}: ${String(e)}`);
        }
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, (_, i) => worker(i + 1));
    await Promise.all(workers);

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('qa-ingest-kb error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
