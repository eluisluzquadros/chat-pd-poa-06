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

  const [errorMeta, setErrorMeta] = useState<any>(null);
  const [mode, setMode] = useState<'sample' | 'full'>('sample');

  // Advanced controls
  const [strict, setStrict] = useState(false);
  const [includeZones, setIncludeZones] = useState(true);
  const [nbBatchSize, setNbBatchSize] = useState(25);
  const [zoneBatchSize, setZoneBatchSize] = useState(50);
  const [concurrency, setConcurrency] = useState(3);

  // Orchestration state
  const [isCancelled, setIsCancelled] = useState(false);
  const [nbProcessed, setNbProcessed] = useState(0);
  const [zoneProcessed, setZoneProcessed] = useState(0);
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

  // Helpers to aggregate batch results
  const mergeIssues = (
    map: Record<string, number>,
    incoming?: Record<string, number> | string[]
  ) => {
    if (!incoming) return map;
    if (Array.isArray(incoming)) {
      incoming.forEach((k) => {
        if (!k) return;
        map[k] = (map[k] || 0) + 1;
      });
    } else {
      Object.entries(incoming).forEach(([k, v]) => {
        if (!k) return;
        const num = typeof v === 'number' ? v : 1;
        map[k] = (map[k] || 0) + num;
      });
    }
    return map;
  };

  const buildFinalReport = (
    neigh: any[],
    zonesArr: any[],
    issues: Record<string, number>
  ): SweepReport => {
    const n = neigh.length;
    const z = zonesArr.length;
    const consistencyRateNeighborhoods = n
      ? (neigh.filter((x) => x?.isConsistent || x?.consistency === true).length / n) * 100
      : 0;
    const avgCoverageNeighborhoods = n
      ? (neigh.reduce((acc, x) => acc + (typeof x?.coverageRate === 'number' ? x.coverageRate : (typeof x?.coverage === 'number' ? x.coverage : 0)), 0) / n) * 100
      : 0;

    return {
      totals: {
        neighborhoods: n,
        zones: z,
        consistencyRateNeighborhoods,
        avgCoverageNeighborhoods,
      },
      neighborhoods: neigh,
      zones: zonesArr,
      commonIssues: issues,
      samples: {
        neighborhoods: neigh.slice(0, 5),
        zones: zonesArr.slice(0, 5),
      },
    } as SweepReport;
  };

  const handleRun = async () => {
    setError(null);
    setIsRunning(true);
    setStartedAt(new Date());
    setReport(null);
    setIsCancelled(false);
    setNbProcessed(0);
    setZoneProcessed(0);

    try {
      // Fast path: sample mode - single invocation
      if (mode === 'sample') {
        const payload = {
          mode: 'sample',
          limit: 10,
          includeZones: false,
          concurrency: Math.max(1, Math.min(3, concurrency)),
          compareChat: false,
          strict,
        } as any;

        const { data, error } = await supabase.functions.invoke("rag-neighborhood-sweep", {
          body: payload,
        });
        if (error) throw error;
        const d: any = data || {};
        const neighborhoods = d?.neighborhoods ?? [];
        const zones = d?.zones ?? [];
        const final = buildFinalReport(neighborhoods, zones, mergeIssues({}, d?.commonIssues));
        setReport({ ...d, ...final });
        return;
      }

      // Full mode: orchestrate in batches
      const allNeighborhoods: any[] = [];
      const allZones: any[] = [];
      const issuesMap: Record<string, number> = {};

      // Neighborhood batches
      let offset = 0;
      while (!isCancelled) {
        const { data, error } = await supabase.functions.invoke("rag-neighborhood-sweep", {
          body: {
            mode: 'full',
            limit: nbBatchSize,
            offset,
            includeZones: false,
            concurrency,
            compareChat: false,
            strict,
          },
        });
        if (error) throw error;
        const d: any = data || {};
        const batchNeighborhoods: any[] = d?.neighborhoods ?? [];
        allNeighborhoods.push(...batchNeighborhoods);
        setNbProcessed((p) => p + batchNeighborhoods.length);
        mergeIssues(issuesMap, d?.commonIssues);
        setReport(buildFinalReport(allNeighborhoods, allZones, { ...issuesMap }));
        if (batchNeighborhoods.length < nbBatchSize) break;
        offset += nbBatchSize;
      }

      // Zone batches (optional)
      if (includeZones && !isCancelled) {
        let zoneOffset = 0;
        while (!isCancelled) {
          const { data, error } = await supabase.functions.invoke("rag-neighborhood-sweep", {
            body: {
              mode: 'full',
              limit: 0,
              includeZones: true,
              zoneLimit: zoneBatchSize,
              zoneOffset,
              concurrency,
              compareChat: false,
              strict,
            },
          });
          if (error) throw error;
          const d: any = data || {};
          const batchZones: any[] = d?.zones ?? [];
          allZones.push(...batchZones);
          setZoneProcessed((p) => p + batchZones.length);
          mergeIssues(issuesMap, d?.commonIssues);
          setReport(buildFinalReport(allNeighborhoods, allZones, { ...issuesMap }));
          if (batchZones.length < zoneBatchSize) break;
          zoneOffset += zoneBatchSize;
        }
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Falha ao executar o sweep");
      setErrorMeta({
        status: e?.status,
        name: e?.name,
        context: e?.context,
        details: e?.details,
      });
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
  const neighborhoodsCount = totals.neighborhoods ?? report?.neighborhoods?.length ?? "-";
  const zonesCount = totals.zones ?? report?.zones?.length ?? "-";

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
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Modo:</span>
              <Button
                variant={mode === 'sample' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('sample')}
                disabled={isRunning}
                aria-pressed={mode === 'sample'}
              >
                Sample (rápido)
              </Button>
              <Button
                variant={mode === 'full' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('full')}
                disabled={isRunning}
                aria-pressed={mode === 'full'}
              >
                Completo (lento)
              </Button>
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
              {isRunning && (
                <Button variant="destructive" size="sm" onClick={() => setIsCancelled(true)}>
                  Parar
                </Button>
              )}
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
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <div className="font-medium text-destructive-foreground">Erro ao executar o sweep</div>
              <div className="mt-1 text-destructive-foreground/90">{error}</div>
              {errorMeta?.name === 'FunctionsFetchError' && (
                <div className="mt-2 text-xs text-destructive-foreground/90">
                  Dica: isso pode ser CORS/preflight ou tempo de execução. Tente o modo "Sample (rápido)" e execute novamente.
                </div>
              )}
              {errorMeta && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Detalhes técnicos</summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-2">{JSON.stringify(errorMeta, null, 2)}</pre>
                </details>
              )}
            </div>
          )}

          {startedAt && (
            <div className="text-xs text-muted-foreground">
              Iniciado: {startedAt.toLocaleString()}
            </div>
          )}

          {/* Advanced controls */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={strict}
                onChange={(e) => setStrict(e.target.checked)}
                disabled={isRunning}
              />
              Strict
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={includeZones}
                onChange={(e) => setIncludeZones(e.target.checked)}
                disabled={isRunning || mode === 'sample'}
              />
              Incluir Zonas
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span>Lote bairros</span>
              <input
                type="number"
                min={5}
                max={200}
                step={5}
                value={nbBatchSize}
                onChange={(e) => setNbBatchSize(Math.max(5, Math.min(200, Number(e.target.value) || 25)))}
                className="w-24 rounded border px-2 py-1 bg-background"
                disabled={isRunning || mode === 'sample'}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span>Lote zonas</span>
              <input
                type="number"
                min={10}
                max={300}
                step={10}
                value={zoneBatchSize}
                onChange={(e) => setZoneBatchSize(Math.max(10, Math.min(300, Number(e.target.value) || 50)))}
                className="w-24 rounded border px-2 py-1 bg-background"
                disabled={isRunning || mode === 'sample'}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span>Concorrência</span>
              <input
                type="number"
                min={1}
                max={4}
                step={1}
                value={concurrency}
                onChange={(e) => setConcurrency(Math.max(1, Math.min(4, Number(e.target.value) || 3)))}
                className="w-24 rounded border px-2 py-1 bg-background"
                disabled={isRunning}
              />
            </label>
          </div>

          {isRunning && (
            <div className="text-xs text-muted-foreground">
              <div>Bairros processados: {nbProcessed}</div>
              {includeZones && <div>Zonas processadas: {zoneProcessed}</div>}
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
                {formatPercent(totals?.consistencyRateNeighborhoods)}
              </div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-sm text-muted-foreground">Cobertura média</div>
              <div className="text-2xl font-semibold">
                {formatPercent(totals?.avgCoverageNeighborhoods)}
              </div>
            </div>
          </div>

          {mode === 'sample' && (
            <div className="text-xs text-muted-foreground">
              Nota: Modo Sample usa até 10 bairros e não inclui zonas — ideal para validar rapidamente.
            </div>
          )}

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
