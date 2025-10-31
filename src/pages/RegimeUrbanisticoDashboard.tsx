import React, { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { SearchBarV2 } from '@/components/regime/SearchBarV2';
import { FilterDropdown } from '@/components/regime/FilterDropdown';
import { FilterChips } from '@/components/regime/FilterChips';
import { RegimeCardV2 } from '@/components/regime/RegimeCardV2';
import { RegimeListView } from '@/components/regime/RegimeListView';
import { StatsCounter } from '@/components/regime/StatsCounter';

import { SkeletonGrid } from '@/components/regime/SkeletonLoader';
import { EmptyState } from '@/components/regime/EmptyState';
import { SortControls, SortField, SortDirection } from '@/components/regime/SortControls';
import { ViewModeToggle, ViewMode } from '@/components/regime/ViewModeToggle';
import { RangeSlider } from '@/components/regime/RangeSlider';
import { PresetFilters, PresetFilter } from '@/components/regime/PresetFilters';
import { ScrollToTop } from '@/components/regime/ScrollToTop';
import { useRegimeData } from '@/hooks/useRegimeData';
import { Building2, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
export default function RegimeUrbanisticoDashboard() {
  const {
    toast
  } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBairro, setSelectedBairro] = useState<string>('todos');
  const [selectedZona, setSelectedZona] = useState<string>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('bairro');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [alturaRange, setAlturaRange] = useState<[number, number]>([0, 130]);
  const [areaRange, setAreaRange] = useState<[number, number]>([0, 20000]);
  const itemsPerPage = 20;
  const {
    data: regimeData,
    isLoading,
    error,
    bairros,
    zonas,
    totalCount,
    filteredCount
  } = useRegimeData({
    searchTerm,
    bairro: selectedBairro,
    zona: selectedZona,
    alturaRange,
    areaRange,
    page: currentPage,
    limit: itemsPerPage
  });

  // Sort data
  const sortedData = useMemo(() => {
    if (!regimeData) return [];
    const sorted = [...regimeData];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      switch (sortField) {
        case 'bairro':
          aValue = a.bairro || '';
          bValue = b.bairro || '';
          break;
        case 'zona':
          aValue = a.zona || '';
          bValue = b.zona || '';
          break;
        case 'altura':
          aValue = parseFloat(a['altura máxima para edificação isolada'] as any) || 0;
          bValue = parseFloat(b['altura máxima para edificação isolada'] as any) || 0;
          break;
        case 'area':
          aValue = parseFloat(a['área mínima do lote'] as any) || 0;
          bValue = parseFloat(b['área mínima do lote'] as any) || 0;
          break;
        case 'permeabilidade':
          aValue = parseFloat(a['taxa de permeabilidade até 1500 m2'] as any) || 0;
          bValue = parseFloat(b['taxa de permeabilidade até 1500 m2'] as any) || 0;
          break;
        default:
          return 0;
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [regimeData, sortField, sortDirection]);
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedBairro('todos');
    setSelectedZona('todos');
    setAlturaRange([0, 130]);
    setAreaRange([0, 20000]);
    setCurrentPage(1);
    toast({
      title: "Filtros limpos",
      description: "Todos os filtros foram removidos"
    });
  };
  const handleSortChange = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    setCurrentPage(1);
  };
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };
  const handleSuggestionClick = (suggestion: string) => {
    if (!recentSearches.includes(suggestion)) {
      setRecentSearches(prev => [suggestion, ...prev.slice(0, 4)]);
    }
  };
  const handlePresetFilter = (preset: PresetFilter) => {
    // For 'bairro', use searchTerm for partial matching
    if (preset.filters.bairro) {
      setSearchTerm(preset.filters.bairro);
      setSelectedBairro('todos');
    }
    
    // For 'zona', use partial matching (contains)
    if (preset.filters.zona) {
      const matchingZona = zonas.find(z => z.includes(preset.filters.zona || ''));
      if (matchingZona) {
        setSelectedZona(matchingZona);
      } else {
        setSearchTerm(preset.filters.zona);
        setSelectedZona('todos');
      }
    }
    
    if (preset.filters.alturaMin !== undefined) {
      setAlturaRange([preset.filters.alturaMin, alturaRange[1]]);
    }
    if (preset.filters.alturaMax !== undefined) {
      setAlturaRange([alturaRange[0], preset.filters.alturaMax]);
    }
    if (preset.filters.areaMin !== undefined) {
      setAreaRange([preset.filters.areaMin, areaRange[1]]);
    }
    if (preset.filters.areaMax !== undefined) {
      setAreaRange([areaRange[0], preset.filters.areaMax]);
    }
    setCurrentPage(1);
    toast({
      title: "Filtro aplicado",
      description: `Filtro "${preset.label}" foi aplicado`
    });
  };
  const hasActiveFilters = searchTerm || selectedBairro !== 'todos' || selectedZona !== 'todos' || alturaRange[0] !== 0 || alturaRange[1] !== 130 || areaRange[0] !== 0 || areaRange[1] !== 20000;

  // Get active filter chips
  const activeFilters = useMemo(() => {
    const filters = [];
    if (searchTerm) {
      filters.push({
        id: 'search',
        label: 'Busca',
        value: searchTerm,
        type: 'search' as const,
        onRemove: () => setSearchTerm('')
      });
    }
    if (selectedBairro !== 'todos') {
      filters.push({
        id: 'bairro',
        label: 'Bairro',
        value: selectedBairro,
        type: 'bairro' as const,
        onRemove: () => setSelectedBairro('todos')
      });
    }
    if (selectedZona !== 'todos') {
      filters.push({
        id: 'zona',
        label: 'Zona',
        value: selectedZona,
        type: 'zona' as const,
        onRemove: () => setSelectedZona('todos')
      });
    }
    if (alturaRange[0] !== 0 || alturaRange[1] !== 130) {
      filters.push({
        id: 'altura',
        label: 'Altura',
        value: `${alturaRange[0]}m - ${alturaRange[1]}m`,
        type: 'search' as const,
        onRemove: () => setAlturaRange([0, 130])
      });
    }
    if (areaRange[0] !== 0 || areaRange[1] !== 20000) {
      filters.push({
        id: 'area',
        label: 'Área',
        value: `${areaRange[0]}m² - ${areaRange[1]}m²`,
        type: 'search' as const,
        onRemove: () => setAreaRange([0, 20000])
      });
    }
    return filters;
  }, [searchTerm, selectedBairro, selectedZona, alturaRange, areaRange]);

  // Get suggestions for search
  const searchSuggestions = useMemo(() => {
    const allSuggestions = [...bairros, ...zonas];
    return allSuggestions.slice(0, 8);
  }, [bairros, zonas]);
  const totalPages = Math.ceil(filteredCount / itemsPerPage);
  return <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <Header />
      
      <main className="container-wide py-8">
        {/* Hero Header Section with Gradient */}
        <div className="mb-10 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-3xl blur-3xl -z-10" />
          
          <div className="glass p-8 rounded-2xl">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-lg">
                  <Building2 className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h1 className="text-5xl font-bold text-foreground mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Explorar Dados
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    Sistema inteligente de busca e análise de dados urbanísticos
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary/15 to-primary/10 rounded-full border border-primary/30 shadow-sm animate-pulse">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold text-primary">Atualizado</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters Section */}
        <div className="glass p-6 rounded-2xl mb-8 shadow-lg">
          <div className="space-y-6">
            {/* Search Bar with Keyboard Shortcut */}
            <div className="max-w-2xl">
              <SearchBarV2 value={searchTerm} onChange={handleSearchChange} placeholder="Buscar por bairro ou zona... (⌘K)" suggestions={searchSuggestions} recentSearches={recentSearches} onSuggestionClick={handleSuggestionClick} />
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FilterDropdown label="Bairro" value={selectedBairro} onChange={setSelectedBairro} options={bairros} placeholder="Todos os bairros" />
              
              <FilterDropdown label="Zona" value={selectedZona} onChange={setSelectedZona} options={zonas} placeholder="Todas as zonas" />
              
              <div className="lg:col-span-2">
                <SortControls sortField={sortField} sortDirection={sortDirection} onSortChange={handleSortChange} />
              </div>
            </div>

            {/* Range Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-xl border border-border/50">
              <RangeSlider label="Altura Máxima" min={0} max={130} value={alturaRange} onChange={setAlturaRange} unit="m" />
              
              <RangeSlider label="Área Mínima do Lote" min={0} max={20000} value={areaRange} onChange={setAreaRange} unit="m²" step={100} />
            </div>

            {/* Preset Filters */}
            <PresetFilters onApplyPreset={handlePresetFilter} />

            {/* Controls Row */}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/50">
              <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
              
              <div className="flex items-center gap-3">
                {hasActiveFilters && <Button variant="outline" size="sm" onClick={handleClearFilters} className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all">
                    Limpar Filtros
                  </Button>}
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters Chips */}
        <FilterChips filters={activeFilters} onClearAll={handleClearFilters} />

        {/* Stats Counter */}
        <div className="mb-8">
          <StatsCounter total={totalCount} filtered={filteredCount} bairrosCount={bairros.length} zonasCount={zonas.length} isLoading={isLoading} />
        </div>

        {/* Results Section */}
        {isLoading ? <SkeletonGrid count={itemsPerPage} /> : error ? <EmptyState title="Erro ao carregar dados" description={error.message} type="error" /> : !sortedData || sortedData.length === 0 ? <EmptyState title="Nenhum resultado encontrado" description="Tente ajustar os filtros ou realizar uma nova busca" type="no-results" /> : <>
            {/* View Mode Content */}
            {viewMode === 'grid' ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {sortedData.map((regime, index) => <div key={index} className="animate-fade-in" style={{
            animationDelay: `${index * 0.05}s`
          }}>
                    <RegimeCardV2 data={regime} />
                  </div>)}
              </div> : <div className="space-y-3 mb-8">
                {sortedData.map((regime, index) => <div key={index} className="animate-fade-in" style={{
            animationDelay: `${index * 0.03}s`
          }}>
                    <RegimeListView data={regime} />
                  </div>)}
              </div>}

            {/* Enhanced Pagination */}
            {totalPages > 1 && <div className="flex items-center justify-center gap-2 mt-8">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="hover:bg-primary/10">
                  Primeira
                </Button>
                
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="hover:bg-primary/10">
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({
              length: Math.min(5, totalPages)
            }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(pageNum)} className={currentPage === pageNum ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/10'}>
                        {pageNum}
                      </Button>;
            })}
                </div>

                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="hover:bg-primary/10">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="hover:bg-primary/10">
                  Última
                </Button>
              </div>}
          </>}
      </main>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>;
}