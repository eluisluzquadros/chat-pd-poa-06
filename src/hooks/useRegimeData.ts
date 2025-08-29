import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from './useDebounce';

export interface RegimeData {
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
          .select('Bairro, Zona');

        if (allError) throw allError;

        if (allData) {
          setTotalCount(allData.length);
          
          const uniqueBairros = [...new Set(allData.map(item => item.Bairro))].sort();
          const uniqueZonas = [...new Set(allData.map(item => item.Zona))].sort();
          
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
            `Bairro.ilike.%${debouncedSearchTerm}%,Zona.ilike.%${debouncedSearchTerm}%`
          );
        }

        if (bairro) {
          query = query.eq('Bairro', bairro);
        }

        if (zona) {
          query = query.eq('Zona', zona);
        }

        // Get count first - rebuild the same query for counting
        let countQuery = supabase
          .from('regime_urbanistico_consolidado')
          .select('*', { count: 'exact', head: true });

        // Apply same filters for counting
        if (debouncedSearchTerm) {
          countQuery = countQuery.or(
            `Bairro.ilike.%${debouncedSearchTerm}%,Zona.ilike.%${debouncedSearchTerm}%`
          );
        }

        if (bairro) {
          countQuery = countQuery.eq('Bairro', bairro);
        }

        if (zona) {
          countQuery = countQuery.eq('Zona', zona);
        }

        const { count, error: countError } = await countQuery;

        if (countError) throw countError;

        setFilteredCount(count || 0);

        // Get paginated data
        const { data: paginatedData, error: dataError } = await query
          .order('Bairro', { ascending: true })
          .order('Zona', { ascending: true })
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