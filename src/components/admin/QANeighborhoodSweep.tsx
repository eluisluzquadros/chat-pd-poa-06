import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, ClipboardCopy, Download, ExternalLink, Loader2 } from "lucide-react";

interface SweepReport {
  totals?: Record<string, any>;
  consistencyRateNeighborhoods?: number;
  avgCoverageNeighborhoods?: number;
  commonIssues?: Record<string, number> | string[];
  samples?: any;
  neighborhoods?: any[];
  zones?: any[];
  [key: string]: any;
}

export function QANeighborhoodSweep() {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<SweepReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  useEffect(() => {
    // Minimal SEO for this admin section
    const prevTitle = document.title;
    document.title = "Sweep de Bairros e Zonas | QA Admin";

    // Meta description
    let metaDesc = document.querySelector("meta[name='description']");
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      "content",
      "Executar sweep de bairros e zonas para validar consistência do RAG e formato de resposta."
    );

    // Canonical
    let linkCanonical = document.querySelector("link[rel='canonical']");
    if (!linkCanonical) {
      linkCanonical = document.createElement("link");
      linkCanonical.setAttribute("rel", "canonical");
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute("href", window.location.href);

    return () => {
      document.title = prevTitle;
    };
  }, []);

  const formatPercent = (value?: number) => {
    if (value == null) return "-";
    const v = value <= 1 ? value * 100 : value; // accept 0-1 or 0-100
    return `${v.toFixed(1)}%`;
  };

  const handleRun = async () => {
    setError(null);
    setIsRunning(true);
    setStartedAt(new Date());
    setReport(null);
    try {
      const { data, error } = await supabase.functions.invoke("rag-neighborhood-sweep", {
        body: {
          mode: "full",
          includeZones: true,
          concurrency: 4,
          compareChat: false,
        },
      });

      if (error) throw error;
      setReport(data as SweepReport);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Falha ao executar o sweep");
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    } catch {}
  };

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.download = `qa-neighborhood-sweep-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = report?.totals || {};
  const neighborhoodsCount = totals.neighborhoodsTested ?? report?.neighborhoods?.length ?? "-";
  const zonesCount = totals.zonesTested ?? report?.zones?.length ?? "-";

  const issuesCount = useMemo(() => {
    if (!report?.commonIssues) return 0;
    if (Array.isArray(report.commonIssues)) return report.commonIssues.length;
    return Object.keys(report.commonIssues).length;
  }, [report]);

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Varredura de Bairros e Zonas</span>
            <div className="flex gap-2">
              <Button onClick={handleRun} disabled={isRunning} size="sm">
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Executando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" /> Executar Sweep
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopy} disabled={!report}>
                <ClipboardCopy className="mr-2 h-4 w-4" /> Copiar JSON
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={!report}>
                <Download className="mr-2 h-4 w-4" /> Baixar JSON
              </Button>
              <a
                className="inline-flex items-center text-sm underline text-primary"
                href="https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions/rag-neighborhood-sweep/logs"
                target="_blank"
                rel="noreferrer"
                aria-label="Ver logs da função no Supabase"
              >
                <ExternalLink className="mr-1 h-4 w-4" /> Ver logs
              </a>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-destructive text-sm">{error}</div>
          )}

          {startedAt && (
            <div className="text-xs text-muted-foreground">
              Iniciado: {startedAt.toLocaleString()}
            </div>
          )}

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border">
              <div className="text-sm text-muted-foreground">Bairros testados</div>
              <div className="text-2xl font-semibold">{neighborhoodsCount}</div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-sm text-muted-foreground">Zonas testadas</div>
              <div className="text-2xl font-semibold">{zonesCount}</div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-sm text-muted-foreground">Consistência</div>
              <div className="text-2xl font-semibold">
                {formatPercent(report?.consistencyRateNeighborhoods)}
              </div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-sm text-muted-foreground">Cobertura média</div>
              <div className="text-2xl font-semibold">
                {formatPercent(report?.avgCoverageNeighborhoods)}
              </div>
            </div>
          </div>

          {/* Issues badges */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Issues comuns:</span>
            <Badge variant={issuesCount > 0 ? "destructive" : "default"}>
              {issuesCount} encontrados
            </Badge>
          </div>

          {/* Raw JSON */}
          {report && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm">Ver relatório completo (JSON)</summary>
              <pre className="mt-3 max-h-96 overflow-auto rounded-md border p-3 text-xs">
                {JSON.stringify(report, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
