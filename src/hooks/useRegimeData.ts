import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from './useDebounce';

export interface RegimeData {
  bairro: string;
  zona: string;
  categoria_risco: string;
  ocupacao: string;
  cod: string;
  'área mínima do lote': string;
  'testada mínima do lote': string;
  'módulo de fracionamento': string;
  'coeficiente de aproveitamento básico': string;
  'coeficiente de aproveitamento máximo': string;
  'coeficiente de aproveitamento básico 4d': string;
  'coeficiente de aproveitamento máximo 4d': string;
  'altura máxima para edificação isolada': string;
  'afastamentos - frente': string;
  'afastamentos - laterais': string;
  'afastamentos - fundos': string;
  'recuo de jardim': string;
  'taxa de permeabilidade até 1500 m2': string;
  'taxa de permeabilidade acima de 1500 m2': string;
  'fator de conversão da taxa de permeabilidade': string;
  [key: string]: any;
}

interface UseRegimeDataParams {
  searchTerm: string;
  bairro: string;
  zona: string;
  page: number;
  limit: number;
}

export function useRegimeData({
  searchTerm,
  bairro,
  zona,
  page,
  limit
}: UseRegimeDataParams) {
  const [data, setData] = useState<RegimeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [allBairros, setAllBairros] = useState<string[]>([]);
  const [allZonas, setAllZonas] = useState<string[]>([]);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Load initial data and get unique values
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Get total count and unique values
        const { data: allData, error: allError } = await supabase
          .from('regime_urbanistico_consolidado')
          .select('bairro, zona');

        if (allError) throw allError;

        if (allData) {
          setTotalCount(allData.length);
          
          const uniqueBairros = [...new Set(allData.map(item => item.bairro))]
            .filter(bairro => bairro && bairro.trim() !== '') // Filter out empty values
            .sort();
          const uniqueZonas = [...new Set(allData.map(item => item.zona))]
            .filter(zona => zona && zona.trim() !== '') // Filter out empty values
            .sort();
          
          setAllBairros(uniqueBairros);
          setAllZonas(uniqueZonas);
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      }
    };

    loadInitialData();
  }, []);

  // Load filtered data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('regime_urbanistico_consolidado')
          .select('*');

        // Apply filters
        if (debouncedSearchTerm) {
          query = query.or(
            `bairro.ilike.%${debouncedSearchTerm}%,zona.ilike.%${debouncedSearchTerm}%`
          );
        }

        if (bairro && bairro !== 'todos') {
          query = query.eq('bairro', bairro);
        }

        if (zona && zona !== 'todos') {
          query = query.eq('zona', zona);
        }

        // Get count first - rebuild the same query for counting
        let countQuery = supabase
          .from('regime_urbanistico_consolidado')
          .select('*', { count: 'exact', head: true });

        // Apply same filters for counting
        if (debouncedSearchTerm) {
          countQuery = countQuery.or(
            `bairro.ilike.%${debouncedSearchTerm}%,zona.ilike.%${debouncedSearchTerm}%`
          );
        }

        if (bairro && bairro !== 'todos') {
          countQuery = countQuery.eq('bairro', bairro);
        }

        if (zona && zona !== 'todos') {
          countQuery = countQuery.eq('zona', zona);
        }

        const { count, error: countError } = await countQuery;

        if (countError) throw countError;

        setFilteredCount(count || 0);

        // Get paginated data
        const { data: paginatedData, error: dataError } = await query
          .order('bairro', { ascending: true })
          .order('zona', { ascending: true })
          .range((page - 1) * limit, page * limit - 1);

        if (dataError) throw dataError;

        setData(paginatedData as RegimeData[] || []);
      } catch (err) {
        console.error('Error loading regime data:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [debouncedSearchTerm, bairro, zona, page, limit]);

  const bairros = useMemo(() => allBairros, [allBairros]);
  const zonas = useMemo(() => allZonas, [allZonas]);

  return {
    data,
    isLoading,
    error,
    totalCount,
    filteredCount,
    bairros,
    zonas
  };
}