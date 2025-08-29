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
  console.log("=== KB-REPROCESS-ALL STARTED ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  if (req.method === "OPTIONS") {
    console.log("Returning CORS preflight response");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== STARTING TRY BLOCK ===");
    console.log("Request method:", req.method);
    console.log("Request headers count:", req.headers ? Array.from(req.headers).length : 0);

    let body;
    try {
      body = await req.json();
      console.log("Request body parsed successfully:", body);
    } catch (jsonError) {
      console.log("Failed to parse JSON, using empty object:", jsonError);
      body = {};
    }
    
    const only: string = body.only ?? "all"; // structured | docx | qa | all
    const callStructured = only === "all" || only === "structured";
    const callDocx = only === "all" || only === "docx";
    const callQa = only === "all" || only === "qa";

    console.log("Execution flags:", { only, callStructured, callDocx, callQa });

    const results: Record<string, any> = {};

    if (callStructured) {
      console.log("=== CALLING import-structured-kb ===");
      try {
        const { data, error } = await supabase.functions.invoke("import-structured-kb", { body: {} });
        if (error) {
          console.error("import-structured-kb error details:", JSON.stringify(error, null, 2));
          results.structured_error = { message: error.message || 'Unknown error', details: error };
        } else {
          console.log("import-structured-kb success:", data);
          results.structured = data;
        }
      } catch (structuredError) {
        console.error("=== STRUCTURED ERROR ===", structuredError);
        results.structured_error = String(structuredError);
      }
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
        body: { overwrite: true, dryRun: !!(body?.dryRun) },
      });
      if (error) {
        console.error("qa-ingest-kb error:", error);
        let errorBody: any = null;
        try {
          const ctx: any = (error as any).context;
          if (ctx?.json) {
            errorBody = await ctx.json();
          } else if (ctx?.text) {
            errorBody = await ctx.text();
          }
        } catch (ctxErr) {
          console.error("Failed to parse error body from qa-ingest-kb:", ctxErr);
        }
        return new Response(
          JSON.stringify({ ok: false, source: 'qa-ingest-kb', error: error.message || String(error), details: errorBody }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
