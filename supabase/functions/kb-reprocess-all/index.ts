import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
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
    console.log("kb-reprocess-all: Starting execution");
    console.log("Request method:", req.method);
    console.log("Request headers:", Object.fromEntries(req.headers));

    const body = await req.json().catch(() => ({}));
    console.log("Request body:", body);
    
    const only: string = body.only ?? "all"; // structured | docx | qa | all
    const callStructured = only === "all" || only === "structured";
    const callDocx = only === "all" || only === "docx";
    const callQa = only === "all" || only === "qa";

    console.log("Execution flags:", { callStructured, callDocx, callQa });

    const results: Record<string, any> = {};

    if (callStructured) {
      console.log("Calling import-structured-kb...");
      const { data, error } = await supabase.functions.invoke("import-structured-kb", { body: {} });
      if (error) {
        console.error("import-structured-kb error:", error);
        throw new Error(`Erro em import-structured-kb: ${error.message}`);
      }
      console.log("import-structured-kb result:", data);
      results.structured = data;
    }

    if (callDocx) {
      console.log("Processing DOCX files...");
      const files = [
        "PDPOA2025-Minuta_Preliminar_LUOS.docx",
        "PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx",
        "PDPOA2025-Objetivos_Previstos.docx",
        "PDPOA2025-QA.docx",
      ];

      const processed: any[] = [];
      for (const f of files) {
        try {
          console.log(`Processing ${f}...`);
          const r = await processDocByFilename(f, "DOCX");
          console.log(`Processed ${f}:`, r);
          processed.push({ file: f, ...r });
        } catch (e) {
          console.error(`Error processing ${f}:`, e);
          processed.push({ file: f, error: String(e) });
        }
      }
      results.docx = processed;
    }

    if (callQa) {
      console.log("Calling qa-ingest-kb...");
      const { data, error } = await supabase.functions.invoke("qa-ingest-kb", {
        body: { overwrite: true },
      });
      if (error) {
        console.error("qa-ingest-kb error:", error);
        throw new Error(`Erro em qa-ingest-kb: ${error.message}`);
      }
      console.log("qa-ingest-kb result:", data);
      results.qa = data;
    }

    console.log("kb-reprocess-all: Completed successfully", results);
    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kb-reprocess-all error:", e);
    console.error("Error stack:", e.stack);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
