import React, { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { SearchInput } from '@/components/regime/SearchInput';
import { FilterDropdown } from '@/components/regime/FilterDropdown';
import { RegimeCard } from '@/components/regime/RegimeCard';
import { StatsCounter } from '@/components/regime/StatsCounter';
import { ExportButton } from '@/components/regime/ExportButton';
import { useRegimeData } from '@/hooks/useRegimeData';
import { Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RegimeUrbanisticoDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBairro, setSelectedBairro] = useState<string>('todos');
  const [selectedZona, setSelectedZona] = useState<string>('todos');
  const [currentPage, setCurrentPage] = useState(1);
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

  const hasActiveFilters = searchTerm || (selectedBairro !== 'todos') || (selectedZona !== 'todos');

  const totalPages = Math.ceil(filteredCount / itemsPerPage);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container-wide py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Explorar Dados</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Navegue pelos parâmetros construtivos por bairro e zona urbanística de Porto Alegre
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-card rounded-lg p-6 mb-8 shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            <SearchInput 
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por bairro ou zona..."
            />
            
            <FilterDropdown
              label="Bairro"
              value={selectedBairro}
              onChange={setSelectedBairro}
              options={bairros}
              placeholder="Todos os bairros"
            />
            
            <FilterDropdown
              label="Zona"
              value={selectedZona}
              onChange={setSelectedZona}
              options={zonas}
              placeholder="Todas as zonas"
            />

            <div className="flex gap-2">
              <ExportButton 
                data={regimeData}
                filters={{ searchTerm, bairro: selectedBairro, zona: selectedZona }}
                isDisabled={isLoading || !regimeData?.length}
              />
              
              {hasActiveFilters && (
                <Button 
                  variant="outline" 
                  onClick={handleClearFilters}
                  className="flex-1"
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          </div>

          <StatsCounter 
            total={totalCount}
            filtered={filteredCount}
            bairrosCount={bairros.length}
            zonasCount={zonas.length}
            isLoading={isLoading}
          />
        </div>

        {/* Results Section */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Carregando dados...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-destructive mb-4">Erro ao carregar dados: {error}</p>
            <Button onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
          </div>
        ) : !regimeData?.length ? (
          <div className="text-center py-16">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum resultado encontrado
            </h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros para encontrar dados do regime urbanístico.
            </p>
          </div>
        ) : (
          <>
            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {regimeData.map((item, index) => (
                <RegimeCard 
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