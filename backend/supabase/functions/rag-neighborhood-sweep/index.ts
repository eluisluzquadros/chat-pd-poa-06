import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type SweepRequest = {
  mode?: 'full' | 'sample';
  limit?: number;
  offset?: number;
  concurrency?: number;
  compareChat?: boolean;
  includeZones?: boolean;
  neighborhoods?: string[]; // optional override
  strict?: boolean;
  zoneLimit?: number;
  zoneOffset?: number;
};

type NeighborhoodResult = {
  bairro: string;
  zonesInDB: string[];
  responseLength: number;
  hasTable: boolean;
  hasRequiredIndicators: boolean;
  coverageRate: number; // zones matched in response / zonesInDB
  missingZones: string[];
  issues: string[];
  isConsistent: boolean;
  score: number;
  format: string;
  error?: string;
};

type ZoneResult = {
  zona: string;
  responseLength: number;
  hasTable: boolean;
  hasRequiredIndicators: boolean;
  appearsInResponse: boolean;
  isConsistent: boolean;
  score: number;
  format: string;
  error?: string;
};

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

async function withConcurrency<T>(items: T[], limit: number, worker: (item: T, idx: number) => Promise<any>) {
  const results: any[] = [];
  let i = 0;
  const runners: Promise<void>[] = [];

  async function run() {
    const idx = i++;
    if (idx >= items.length) return;
    try {
      const r = await worker(items[idx], idx);
      results[idx] = r;
    } catch (e) {
      results[idx] = { error: e instanceof Error ? e.message : String(e) };
    }
    await run();
  }

  const n = Math.min(limit, items.length);
  for (let k = 0; k < n; k++) runners.push(run());
  await Promise.all(runners);
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode = 'full', limit = 999, offset = 0, concurrency = 4, compareChat = false, includeZones = true, neighborhoods, strict = false, zoneLimit = 999, zoneOffset = 0 }: SweepRequest = await req.json().catch(() => ({}));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🚀 Iniciando varredura de bairros/zones', { mode, limit, offset, concurrency, compareChat, includeZones, strict, zoneLimit, zoneOffset });

    // 1) Carregar lista de bairros
    let bairros: string[] = [];
    if (neighborhoods && neighborhoods.length) {
      bairros = neighborhoods;
    } else {
      const { data: bairroRows, error: bairroErr } = await supabase
        .from('regime_urbanistico')
        .select('bairro')
        .not('bairro', 'is', null)
        .order('bairro', { ascending: true })
        .limit(1000);
      if (bairroErr) throw new Error(`Erro buscando bairros: ${bairroErr.message}`);
      bairros = uniq((bairroRows || []).map((r: any) => r.bairro)).slice(offset, offset + limit);
    }

    // 2) Executar testes por bairro com limite de concorrência
    const neighborhoodResults: NeighborhoodResult[] = await withConcurrency(bairros, concurrency, async (bairro) => {
      try {
        const query = `O que pode ser construído no bairro ${bairro}`;

        // Zonas do bairro via DB
        const { data: zonaRows, error: zonaErr } = await supabase
          .from('regime_urbanistico')
          .select('zona')
          .eq('bairro', bairro);
        if (zonaErr) throw new Error(`Erro buscando zonas de ${bairro}: ${zonaErr.message}`);
        const zonesInDB = uniq((zonaRows || []).map((z: any) => z.zona).filter(Boolean));

        // agentic-rag
        const ragInvoke = await supabase.functions.invoke('agentic-rag', {
          body: { query }
        });
        if (ragInvoke.error) throw new Error(`agentic-rag falhou: ${ragInvoke.error.message || ragInvoke.error}`);
        const ragData: any = ragInvoke.data || {};
        const response: string = ragData.response || '';

        // ux-consistency-validator
        const uxInvoke = await supabase.functions.invoke('ux-consistency-validator', {
          body: { response, queryType: 'neighborhood', originalQuery: query, strict }
        });
        if (uxInvoke.error) throw new Error(`ux-consistency-validator falhou: ${uxInvoke.error.message || uxInvoke.error}`);
        const validation = uxInvoke.data?.validation || uxInvoke.data || {};

        // Cobertura de zonas mencionadas na resposta
        const normalizedResp = response.toUpperCase();
        const foundZones = zonesInDB.filter(z => normalizedResp.includes(String(z).toUpperCase()));
        const missingZones = zonesInDB.filter(z => !foundZones.includes(z));
        const coverageRate = zonesInDB.length ? (foundZones.length / zonesInDB.length) : 1;

        return {
          bairro,
          zonesInDB,
          responseLength: response.length,
          hasTable: !!validation.hasTable,
          hasRequiredIndicators: !!validation.hasRequiredIndicators,
          coverageRate,
          missingZones,
          issues: validation.issues || [],
          isConsistent: !!validation.isConsistent,
          score: Number(validation.score || 0),
          format: String(validation.format || 'unknown')
        } as NeighborhoodResult;
      } catch (e) {
        return {
          bairro,
          zonesInDB: [],
          responseLength: 0,
          hasTable: false,
          hasRequiredIndicators: false,
          coverageRate: 0,
          missingZones: [],
          issues: [e instanceof Error ? e.message : String(e)],
          isConsistent: false,
          score: 0,
          format: 'error',
          error: e instanceof Error ? e.message : String(e)
        } as NeighborhoodResult;
      }
    });

    // 3) Opcional: varrer por ZONAS
    let zoneResults: ZoneResult[] = [];
    if (includeZones) {
      const { data: allZonesRows, error: allZonesErr } = await supabase
        .from('regime_urbanistico')
        .select('zona')
        .not('zona', 'is', null)
        .order('zona', { ascending: true })
        .limit(1000);
      if (allZonesErr) throw new Error(`Erro buscando zonas: ${allZonesErr.message}`);
      const allZones = uniq((allZonesRows || []).map((r: any) => r.zona));

      const zonesToTest = allZones.slice(zoneOffset, zoneOffset + zoneLimit); // batching de zonas
      zoneResults = await withConcurrency(zonesToTest, concurrency, async (zona) => {
        try {
          const query = `Quais são os parâmetros do regime urbanístico na zona ${zona}?`;
          const ragInvoke = await supabase.functions.invoke('agentic-rag', { body: { query } });
          if (ragInvoke.error) throw new Error(`agentic-rag falhou: ${ragInvoke.error.message || ragInvoke.error}`);
          const ragData: any = ragInvoke.data || {};
          const response: string = ragData.response || '';

          const uxInvoke = await supabase.functions.invoke('ux-consistency-validator', {
            body: { response, queryType: 'zone', originalQuery: query, strict }
          });
          if (uxInvoke.error) throw new Error(`ux-consistency-validator falhou: ${uxInvoke.error.message || uxInvoke.error}`);
          const validation = uxInvoke.data?.validation || uxInvoke.data || {};

          const appearsInResponse = response.toUpperCase().includes(String(zona).toUpperCase());

          return {
            zona,
            responseLength: response.length,
            hasTable: !!validation.hasTable,
            hasRequiredIndicators: !!validation.hasRequiredIndicators,
            appearsInResponse,
            isConsistent: !!validation.isConsistent,
            score: Number(validation.score || 0),
            format: String(validation.format || 'unknown')
          } as ZoneResult;
        } catch (e) {
          return {
            zona,
            responseLength: 0,
            hasTable: false,
            hasRequiredIndicators: false,
            appearsInResponse: false,
            isConsistent: false,
            score: 0,
            format: 'error',
            error: e instanceof Error ? e.message : String(e)
          } as ZoneResult;
        }
      });
    }

    // 4) Sumário
    const totalBairros = neighborhoodResults.length;
    const consistentBairros = neighborhoodResults.filter(r => r.isConsistent).length;
    const avgScoreBairros = totalBairros ? neighborhoodResults.reduce((s, r) => s + (r.score || 0), 0) / totalBairros : 0;
    const avgCoverage = totalBairros ? neighborhoodResults.reduce((s, r) => s + (r.coverageRate || 0), 0) / totalBairros : 0;

    const totalZones = zoneResults.length;
    const consistentZones = zoneResults.filter(r => r.isConsistent).length;
    const avgScoreZones = totalZones ? zoneResults.reduce((s, r) => s + (r.score || 0), 0) / totalZones : 0;

    const commonIssues = uniq(neighborhoodResults.flatMap(r => r.issues || [])).slice(0, 20);

    const report = {
      mode,
      totals: {
        neighborhoods: totalBairros,
        neighborhoodsConsistent: consistentBairros,
        consistencyRateNeighborhoods: totalBairros ? (consistentBairros / totalBairros) * 100 : 0,
        avgScoreNeighborhoods: Number(avgScoreBairros.toFixed(1)),
        avgCoverageNeighborhoods: Number((avgCoverage * 100).toFixed(1)),
        zones: totalZones,
        zonesConsistent: consistentZones,
        consistencyRateZones: totalZones ? (consistentZones / totalZones) * 100 : 0,
        avgScoreZones: Number(avgScoreZones.toFixed(1))
      },
      commonIssues,
      samples: {
        neighborhoods: neighborhoodResults.slice(0, 5),
        zones: zoneResults.slice(0, 5)
      },
      results: {
        neighborhoods: neighborhoodResults,
        zones: zoneResults
      }
    };

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Erro no rag-neighborhood-sweep:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
