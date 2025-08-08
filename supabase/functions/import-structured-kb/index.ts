import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";
import { read, utils } from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function parseNumeric(val: unknown, d: number | null = null): number | null {
  if (val === null || val === undefined) return d;
  const s = String(val).trim().toLowerCase();
  if (!s || ["n/a", "na", "-", "--", "não se aplica", "nao se aplica", "null", ""
  ].includes(s)) return d;
  // Replace comma with dot, remove non-numeric (except . and -)
  const cleaned = s
    .replace(/,/g, ".")
    .replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : d;
}

function normalizeYesNo(val: unknown): string | null {
  const s = String(val ?? "").trim().toLowerCase();
  if (!s) return null;
  if (["sim", "yes", "true", "1"].includes(s)) return "Sim";
  if (["não", "nao", "no", "false", "0"].includes(s)) return "Não";
  return s;
}

async function embeddingForText(text: string): Promise<number[] | null> {
  if (!OPENAI_API_KEY) return null;
  try {
    const resp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });
    if (!resp.ok) {
      console.error("Embedding error:", await resp.text());
      return null;
    }
    const data = await resp.json();
    return data?.data?.[0]?.embedding ?? null;
  } catch (e) {
    console.error("Embedding exception:", e);
    return null;
  }
}

async function readXlsxFromStorage(path: string): Promise<any[] | null> {
  const { data, error } = await supabase.storage.from("documents").download(path);
  if (error || !data) {
    console.warn(`Storage download failed for ${path}:`, error?.message);
    return null;
  }
  const buf = new Uint8Array(await data.arrayBuffer());
  const wb = read(buf, { type: "array" });
  const sheetName = wb.SheetNames?.[0];
  if (!sheetName) return null;
  const ws = wb.Sheets[sheetName];
  const rows = utils.sheet_to_json(ws);
  return rows as any[];
}

async function ensureStructuredDocument(title: string, meta: Record<string, any>) {
  const { data: existing } = await supabase
    .from("documents")
    .select("id, title, metadata")
    .eq("title", title)
    .maybeSingle();
  if (existing) return existing.id as number;

  const { data: inserted, error } = await supabase
    .from("documents")
    .insert({
      title,
      content: title,
      type: "XLSX",
      is_public: true,
      is_processed: true,
      metadata: meta,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create document ${title}: ${error.message}`);
  return inserted!.id as number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const regimePath = body.regimePath ?? "knowledgebase/PDPOA2025-Regime_Urbanistico.xlsx";
    const zotsPath = body.zotsPath ?? "knowledgebase/PDPOA2025-ZOTs_vs_Bairros.xlsx";
    const riscoPath = body.riscoPath ?? "knowledgebase/PDPOA2025-Risco_Desastre_vs_Bairros.xlsx";

    const [regimeRows, zotsRows, riscoRows] = await Promise.all([
      readXlsxFromStorage(regimePath),
      readXlsxFromStorage(zotsPath),
      readXlsxFromStorage(riscoPath),
    ]);

    const summary: Record<string, any> = { imported: {}, validations: {} };

    // 1) Import Regime Urbanístico
    let regimeDocId: number | null = null;
    let ruInserted = 0, ruUpdated = 0, ruChunks = 0;
    if (regimeRows && regimeRows.length) {
      regimeDocId = await ensureStructuredDocument(
        "Structured: Regime Urbanístico",
        { source: "structured", dataset: "Regime_Urbanistico.xlsx" }
      );

      for (const row of regimeRows) {
        const bairro = String(row["Bairro"] ?? "").trim();
        const zona = String(row["Zona"] ?? "").trim();
        if (!bairro || !zona) continue;

        const altura_maxima = parseNumeric(row["Altura Máxima - Edificação Isolada"]);
        const coef_aproveitamento_basico = parseNumeric(row["Coeficiente de Aproveitamento - Básico"]);
        const coef_aproveitamento_maximo = parseNumeric(row["Coeficiente de Aproveitamento - Máximo"]);
        const area_minima_lote = parseNumeric(row["Área Mínima do Lote"]);
        const testada_minima_lote = parseNumeric(row["Testada Mínima do Lote"]);

        // Upsert by (bairro, zona) without unique key: try update then insert
        const { data: existing } = await supabase
          .from("regime_urbanistico")
          .select("id")
          .eq("bairro", bairro)
          .eq("zona", zona)
          .maybeSingle();

        if (existing?.id) {
          const { error } = await supabase
            .from("regime_urbanistico")
            .update({ altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo, area_minima_lote, testada_minima_lote })
            .eq("id", existing.id);
          if (!error) ruUpdated++; else console.error("RU update error", error.message);
        } else {
          const { error } = await supabase
            .from("regime_urbanistico")
            .insert({ bairro, zona, altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo, area_minima_lote, testada_minima_lote });
          if (!error) ruInserted++; else console.error("RU insert error", error.message);
        }

        // Derivative textual chunk + embedding
        if (regimeDocId) {
          const text = `Bairro ${bairro} - Zona ${zona}: Altura máxima ${altura_maxima ?? "(sem dado)"} m; Coeficiente básico ${coef_aproveitamento_basico ?? "(sem dado)"}; Coeficiente máximo ${coef_aproveitamento_maximo ?? "(sem dado)"}.`;
          const emb = await embeddingForText(text);
          const chunk_metadata = {
            source: "structured-derivative",
            table: "regime_urbanistico",
            bairro,
            zona,
            altura_maxima,
            coef_aproveitamento_basico,
            coef_aproveitamento_maximo,
            hasImportantKeywords: true,
          } as Record<string, any>;

          const { error: embErr } = await supabase
            .from("document_embeddings")
            .insert({
              document_id: regimeDocId,
              content_chunk: text,
              embedding: emb as any,
              chunk_metadata,
            });
          if (!embErr) ruChunks++; else console.error("Chunk insert error", embErr.message);
        }
      }

      // Validation: ensure no NULLs in critical fields
      const [nullAlt, nullCab, nullCam] = await Promise.all([
        supabase.from("regime_urbanistico").select("id", { count: "exact", head: true }).is("altura_maxima", null),
        supabase.from("regime_urbanistico").select("id", { count: "exact", head: true }).is("coef_aproveitamento_basico", null),
        supabase.from("regime_urbanistico").select("id", { count: "exact", head: true }).is("coef_aproveitamento_maximo", null),
      ]);

      summary.imported.regime_urbanistico = { inserted: ruInserted, updated: ruUpdated, derivative_chunks: ruChunks };
      summary.validations.regime_urbanistico = {
        null_altura_maxima: nullAlt.count ?? 0,
        null_coef_basico: nullCab.count ?? 0,
        null_coef_maximo: nullCam.count ?? 0,
      };
    }

    // 2) Import ZOTs vs Bairros
    let zotsInserted = 0, zotsUpdated = 0;
    if (zotsRows && zotsRows.length) {
      for (const row of zotsRows) {
        const bairro = String(row["Bairro"] ?? "").trim();
        const zona = String(row["Zona"] ?? "").trim();
        if (!bairro || !zona) continue;
        const total = parseNumeric(row["Total_Zonas_no_Bairro"], null);
        const especial = normalizeYesNo(row["Tem_Zona_Especial"]);

        const { data: existing } = await supabase
          .from("zots_bairros")
          .select("id")
          .eq("bairro", bairro)
          .eq("zona", zona)
          .maybeSingle();

        if (existing?.id) {
          const { error } = await supabase
            .from("zots_bairros")
            .update({ total_zonas_no_bairro: total, tem_zona_especial: especial })
            .eq("id", existing.id);
          if (!error) zotsUpdated++; else console.error("ZOTs update error", error.message);
        } else {
          const { error } = await supabase
            .from("zots_bairros")
            .insert({ bairro, zona, total_zonas_no_bairro: total, tem_zona_especial: especial });
          if (!error) zotsInserted++; else console.error("ZOTs insert error", error.message);
        }
      }
      summary.imported.zots_bairros = { inserted: zotsInserted, updated: zotsUpdated };
    }

    // 3) Import Risco x Bairros (basic mapping)
    let riscoUpserts = 0;
    if (riscoRows && riscoRows.length) {
      for (const row of riscoRows) {
        const bairro_nome = String(row["Bairro"] ?? "").trim();
        if (!bairro_nome) continue;

        const zona = String(row["Zona"] ?? "").trim(); // optional if exists
        const nivel = parseNumeric(row["Nivel_Risco_Geral"] ?? row["Nível de Risco"] ?? row["Nivel de Risco"], null);
        const risco_inundacao = normalizeYesNo(row["Risco_Inundacao"] ?? row["Risco Inundação"]) === "Sim";
        const risco_alagamento = normalizeYesNo(row["Risco_Alagamento"]) === "Sim";
        const risco_deslizamento = normalizeYesNo(row["Risco_Deslizamento"]) === "Sim";
        const risco_vendaval = normalizeYesNo(row["Risco_Vendaval"]) === "Sim";
        const risco_granizo = normalizeYesNo(row["Risco_Granizo"]) === "Sim";

        const { data: existing } = await supabase
          .from("bairros_risco_desastre")
          .select("id")
          .eq("bairro_nome", bairro_nome)
          .maybeSingle();

        const payload: any = {
          bairro_nome,
          bairro_nome_normalizado: bairro_nome.toUpperCase(),
          zona: zona || null,
          nivel_risco_geral: nivel,
          risco_inundacao,
          risco_alagamento,
          risco_deslizamento,
          risco_vendaval,
          risco_granizo,
        };

        if (existing?.id) {
          const { error } = await supabase
            .from("bairros_risco_desastre")
            .update(payload)
            .eq("id", existing.id);
          if (!error) riscoUpserts++; else console.error("Risco update error", error.message);
        } else {
          const { error } = await supabase
            .from("bairros_risco_desastre")
            .insert(payload);
          if (!error) riscoUpserts++; else console.error("Risco insert error", error.message);
        }
      }
      summary.imported.bairros_risco_desastre = { upserts: riscoUpserts };
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-structured-kb error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
