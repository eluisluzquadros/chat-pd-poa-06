import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function processDocByFilename(file: string, type = "DOCX") {
  const title = file.replace(/\.[^.]+$/, "");
  // Try by metadata->>title or by file_name
  let { data: existing } = await supabase
    .from("documents")
    .select("id")
    .or(`metadata->>title.eq.${title},file_name.eq.${file}`)
    .maybeSingle();

  if (!existing) {
    // Create record if missing (file must exist in storage at knowledgebase/<file>)
    const filePath = `knowledgebase/${file}`;
    const { data: created, error } = await supabase
      .from("documents")
      .insert({
        title,
        content: `Documento: ${file}`,
        type,
        file_name: file,
        file_path: filePath,
        is_public: true,
        is_processed: false,
        metadata: { title, source: "knowledge-base", type, file_name: file, file_path: filePath },
      })
      .select("id")
      .single();
    if (error) throw new Error(`Erro ao criar documento ${file}: ${error.message}`);
    existing = created;
  }

  const { data, error } = await supabase.functions.invoke("process-document", {
    body: { documentId: existing.id, forceReprocess: true, useHierarchicalChunking: true },
  });
  if (error) throw new Error(`Erro ao processar ${file}: ${error.message}`);
  return { chunks_processed: data?.chunks_processed ?? null, documentId: existing.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const only: string = body.only ?? "all"; // structured | docx | qa | all
    const callStructured = only === "all" || only === "structured";
    const callDocx = only === "all" || only === "docx";
    const callQa = only === "all" || only === "qa";

    const results: Record<string, any> = {};

    if (callStructured) {
      const { data, error } = await supabase.functions.invoke("import-structured-kb", { body: {} });
      if (error) throw new Error(`Erro em import-structured-kb: ${error.message}`);
      results.structured = data;
    }

    if (callDocx) {
      const files = [
        "PDPOA2025-Minuta_Preliminar_LUOS.docx",
        "PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx",
        "PDPOA2025-Objetivos_Previstos.docx",
        "PDPOA2025-QA.docx",
      ];

      const processed: any[] = [];
      for (const f of files) {
        try {
          const r = await processDocByFilename(f, "DOCX");
          processed.push({ file: f, ...r });
        } catch (e) {
          processed.push({ file: f, error: String(e) });
        }
      }
      results.docx = processed;
    }

    if (callQa) {
      const { data, error } = await supabase.functions.invoke("qa-ingest-kb", {
        body: { overwrite: true },
      });
      if (error) throw new Error(`Erro em qa-ingest-kb: ${error.message}`);
      results.qa = data;
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kb-reprocess-all error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
