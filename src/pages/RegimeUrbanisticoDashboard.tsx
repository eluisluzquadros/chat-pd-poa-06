import React, { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { SearchBarV2 } from '@/components/regime/SearchBarV2';
import { FilterDropdown } from '@/components/regime/FilterDropdown';
import { FilterChips } from '@/components/regime/FilterChips';
import { RegimeCardV2 } from '@/components/regime/RegimeCardV2';
import { StatsCounter } from '@/components/regime/StatsCounter';
import { ExportButton } from '@/components/regime/ExportButton';
import { SkeletonGrid } from '@/components/regime/SkeletonLoader';
import { EmptyState } from '@/components/regime/EmptyState';
import { SortControls, SortField, SortDirection } from '@/components/regime/SortControls';
import { useRegimeData } from '@/hooks/useRegimeData';
import { Building2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RegimeUrbanisticoDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBairro, setSelectedBairro] = useState<string>('todos');
  const [selectedZona, setSelectedZona] = useState<string>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('bairro');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
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
    page: currentPage,
    limit: itemsPerPage
  });

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedBairro('todos');
    setSelectedZona('todos');
    setCurrentPage(1);
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

  const hasActiveFilters = searchTerm || (selectedBairro !== 'todos') || (selectedZona !== 'todos');

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
    return filters;
  }, [searchTerm, selectedBairro, selectedZona]);

  // Get suggestions for search
  const searchSuggestions = useMemo(() => {
    const allSuggestions = [...bairros, ...zonas];
    return allSuggestions.slice(0, 8);
  }, [bairros, zonas]);

  const totalPages = Math.ceil(filteredCount / itemsPerPage);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container-wide py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Explorar Dados</h1>
              <p className="text-muted-foreground text-lg">
                Navegue pelos parâmetros construtivos por bairro e zona urbanística de Porto Alegre
              </p>
            </div>
            <div className="ml-auto">
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full border border-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Dados Atualizados</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-elegant border border-muted/20">
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="max-w-xl">
              <SearchBarV2
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Buscar por bairro ou zona..."
                suggestions={searchSuggestions}
                recentSearches={recentSearches}
                onSuggestionClick={handleSuggestionClick}
              />
            </div>

            {/* Filters and Controls */}
            <div className="flex flex-wrap items-center gap-4">
              <FilterDropdown
                label="Bairro"
                value={selectedBairro || 'todos'}
                onChange={(value) => {
                  setSelectedBairro(value || 'todos');
                  setCurrentPage(1);
                }}
                options={bairros}
                placeholder="Todos os bairros"
              />
              
              <FilterDropdown
                label="Zona"
                value={selectedZona || 'todos'}
                onChange={(value) => {
                  setSelectedZona(value || 'todos');
                  setCurrentPage(1);
                }}
                options={zonas}
                placeholder="Todas as zonas"
              />

              <SortControls
                sortField={sortField}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
              />

              <div className="ml-auto flex gap-2">
                <ExportButton 
                  data={regimeData}
                  filters={{ searchTerm, bairro: selectedBairro, zona: selectedZona }}
                  isDisabled={isLoading || !regimeData?.length}
                />
              </div>
            </div>

            {/* Active Filters */}
            <FilterChips
              filters={activeFilters}
              onClearAll={handleClearFilters}
            />

            {/* Stats */}
            <StatsCounter 
              total={totalCount}
              filtered={filteredCount}
              bairrosCount={bairros.length}
              zonasCount={zonas.length}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Results Section */}
        {isLoading ? (
          <SkeletonGrid count={6} />
        ) : error ? (
          <EmptyState
            type="error"
            description={`Erro ao carregar dados: ${error}`}
            actionLabel="Tentar Novamente"
            onAction={() => window.location.reload()}
          />
        ) : !regimeData?.length ? (
          <EmptyState
            type="no-results"
            suggestions={bairros.slice(0, 5)}
            onSuggestionClick={(suggestion) => {
              setSearchTerm(suggestion);
              handleSuggestionClick(suggestion);
            }}
          />
        ) : (
          <>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  Resultados 
                  <span className="text-lg text-muted-foreground font-normal ml-2">
                    ({filteredCount.toLocaleString()} {filteredCount === 1 ? 'resultado' : 'resultados'})
                  </span>
                </h2>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {regimeData.map((item, index) => (
                <RegimeCardV2 
                  key={`${item.Bairro}-${item.Zona}-${index}`}
                  data={item}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Próximo
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}