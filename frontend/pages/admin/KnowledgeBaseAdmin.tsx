import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function KnowledgeBaseAdmin() {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [mode, setMode] = useState<"all" | "structured" | "docx" | "qa">("all");

  // SEO basics
  useEffect(() => {
    document.title = "Admin KB – Reprocessar e Upload (Knowledge Base)";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Administre a Knowledge Base: envie DOCX/XLSX e reprocessa o conhecimento.');
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  }, []);

  const uploadFiles = useCallback(async () => {
    if (!files || files.length === 0) {
      toast.error("Selecione arquivos DOCX/XLSX primeiro");
      return;
    }
    setUploading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão inválida");

      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      fd.append("prefix", "knowledgebase/");

      const resp = await fetch(
        `https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/kb-upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        }
      );

      const json = await resp.json();
      if (!resp.ok || !json.ok) {
        throw new Error(json?.error || `Falha no upload (${resp.status})`);
      }
      toast.success("Uploads concluídos");
      setResult(json);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro no upload");
    } finally {
      setUploading(false);
    }
  }, [files]);

  const runReprocess = useCallback(async () => {
    setProcessing(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("kb-reprocess-all", {
        body: { only: mode },
      });
      if (error) throw error;
      setResult(data);
      toast.success("Reprocessamento concluído");
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || "Erro ao reprocessar";
      let details: any = null;
      try {
        const ctx: any = e?.context;
        if (ctx?.json) details = await ctx.json();
        else if (ctx?.text) details = await ctx.text();
      } catch {}
      toast.error(msg);
      setResult({ ok: false, error: msg, details });
    } finally {
      setProcessing(false);
    }
  }, [mode]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Administração da Knowledge Base</h1>
        <p className="text-sm opacity-80">Envie os arquivos e reprocessa o conhecimento (DOCX + XLSX)</p>
        <link rel="canonical" href="/admin/kb" />
      </header>

      <main className="space-y-6">
        <section className="rounded-lg border p-4">
          <h2 className="text-lg font-medium">Upload de arquivos (DOCX/XLSX)</h2>
          <p className="text-sm opacity-80 mb-3">Eles serão salvos em documents/knowledgebase/</p>
          <input
            type="file"
            multiple
            accept=".docx,.xlsx"
            onChange={handleFileChange}
            className="block w-full"
          />
          <button
            onClick={uploadFiles}
            disabled={uploading}
            className="mt-3 inline-flex items-center rounded-md px-4 py-2 border disabled:opacity-50"
          >
            {uploading ? "Enviando..." : "Enviar arquivos"}
          </button>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-lg font-medium">Reprocessar Knowledge Base</h2>
          <p className="text-sm opacity-80 mb-3">Escolha o modo e execute: structured, DOCX, QA ou tudo</p>
          <div className="flex items-center gap-3 mb-3">
            <label htmlFor="kb-mode" className="text-sm">Modo:</label>
            <select
              id="kb-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="border rounded-md px-2 py-1"
            >
              <option value="all">Tudo</option>
              <option value="structured">Somente Structured (XLSX)</option>
              <option value="docx">Somente DOCX</option>
              <option value="qa">Somente QA</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={runReprocess}
              disabled={processing}
              className="inline-flex items-center rounded-md px-4 py-2 border disabled:opacity-50"
            >
              {processing ? "Processando..." : "Executar"}
            </button>
            <button
              onClick={async () => {
                if (processing) return;
                try {
                  setProcessing(true);
                  setResult(null);
                  const { data, error } = await supabase.functions.invoke("kb-reprocess-all", {
                    body: { only: "qa" },
                  });
                  if (error) throw error;
                  setResult(data);
                  toast.success("Reprocessamento (Somente QA) concluído");
                } catch (e: any) {
                  console.error(e);
                  const msg = e?.message || "Erro ao reprocessar QA";
                  let details: any = null;
                  try {
                    const ctx: any = e?.context;
                    if (ctx?.json) details = await ctx.json();
                    else if (ctx?.text) details = await ctx.text();
                  } catch {}
                  toast.error(msg);
                  setResult({ ok: false, error: msg, details });
                } finally {
                  setProcessing(false);
                }
              }}
              disabled={processing}
              className="inline-flex items-center rounded-md px-4 py-2 border disabled:opacity-50"
            >
              {processing ? "Processando..." : "Reprocessar QA (sem novo upload)"}
            </button>
            <button
              onClick={async () => {
                if (processing) return;
                try {
                  setProcessing(true);
                  setResult(null);
                  const { data, error } = await supabase.functions.invoke("kb-reprocess-all", {
                    body: { only: "qa", dryRun: true },
                  });
                  if (error) throw error;
                  setResult(data);
                  toast.success("Dry-run QA concluído (sem embeddings)");
                } catch (e: any) {
                  console.error(e);
                  const msg = e?.message || "Erro no Dry-run QA";
                  let details: any = null;
                  try {
                    const ctx: any = e?.context;
                    if (ctx?.json) details = await ctx.json();
                    else if (ctx?.text) details = await ctx.text();
                  } catch {}
                  toast.error(msg);
                  setResult({ ok: false, error: msg, details });
                } finally {
                  setProcessing(false);
                }
              }}
              disabled={processing}
              className="inline-flex items-center rounded-md px-4 py-2 border disabled:opacity-50"
            >
              {processing ? "Processando..." : "Dry-run QA"}
            </button>
          </div>
        </section>

        {result && (
          <section className="rounded-lg border p-4">
            <h2 className="text-lg font-medium">Resultado</h2>
            <pre className="mt-2 max-h-96 overflow-auto text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </section>
        )}
      </main>
    </div>
  );
}
