import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { RegimeData } from '@/hooks/useRegimeData';
import { supabase } from '@/integrations/supabase/client';

interface ExportButtonProps {
  data: RegimeData[];
  filters: {
    searchTerm: string;
    bairro: string;
    zona: string;
  };
  isDisabled: boolean;
}

export function ExportButton({ data, filters, isDisabled }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Get all filtered data (not just current page)
      let query = supabase
        .from('regime_urbanistico_consolidado')
        .select('*');

      // Apply same filters
      if (filters.searchTerm) {
        query = query.or(
          `Bairro.ilike.%${filters.searchTerm}%,Zona.ilike.%${filters.searchTerm}%`
        );
      }

      if (filters.bairro && filters.bairro !== 'todos') {
        query = query.eq('Bairro', filters.bairro);
      }

      if (filters.zona && filters.zona !== 'todos') {
        query = query.eq('Zona', filters.zona);
      }

      const { data: allData, error } = await query
        .order('Bairro', { ascending: true })
        .order('Zona', { ascending: true });

      if (error) throw error;

      if (!allData || allData.length === 0) {
        alert('Nenhum dado para exportar');
        return;
      }

      // Convert to CSV
      const headers = Object.keys(allData[0]);
      const csvContent = [
        headers.join(','),
        ...allData.map(row => 
          headers.map(header => {
            const value = row[header];
            // Handle values that might contain commas
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value}"`;
            }
            return value || '';
          }).join(',')
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        // Generate filename with filters
        let filename = 'regime_urbanistico';
        if (filters.bairro) filename += `_${filters.bairro.replace(/\s+/g, '_')}`;
        if (filters.zona) filename += `_${filters.zona.replace(/\s+/g, '_')}`;
        if (filters.searchTerm) filename += `_busca_${filters.searchTerm.replace(/\s+/g, '_')}`;
        filename += `_${new Date().toISOString().split('T')[0]}.csv`;
        
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Erro ao exportar dados. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isDisabled || isExporting}
      className="gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Exportando...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Exportar CSV
        </>
      )}
    </Button>
  );
}