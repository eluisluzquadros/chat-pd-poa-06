import React from 'react';
import { Building2, Maximize2, Droplet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RegimeData {
  Zona: string;
  Bairro: string;
  Altura_Maxima___Edificacao_Isolada: number;
  Area_Minima_de_Lote_Ate_1_500m2: number;
  Taxa_de_Permeabilidade_ate_1_500_m2: number;
  Coeficiente_de_Aproveitamento___Basico?: string;
  Coeficiente_de_Aproveitamento___Maximo?: string;
}

interface RegimeListViewProps {
  data: RegimeData;
}

export function RegimeListView({ data }: RegimeListViewProps) {
  const getZoneBadgeColor = (zona: string) => {
    if (!zona) return 'bg-muted text-muted-foreground border-border';
    if (zona.includes('ZOT')) return 'bg-primary/10 text-primary border-primary/20';
    if (zona.includes('ZR')) return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    if (zona.includes('ZC')) return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    return 'bg-muted text-muted-foreground border-border';
  };

  return (
    <div className="group p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all duration-300 cursor-pointer">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Zone and Location */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <Badge className={`${getZoneBadgeColor(data.Zona)} font-semibold px-3 py-1`}>
              {data.Zona}
            </Badge>
            <h3 className="font-medium text-sm text-foreground truncate">{data.Bairro}</h3>
          </div>
        </div>

        {/* Right: Key Metrics */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Altura Máx.</div>
              <div className="text-sm font-semibold text-foreground">{data.Altura_Maxima___Edificacao_Isolada}m</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Área Mín.</div>
              <div className="text-sm font-semibold text-foreground">{data.Area_Minima_de_Lote_Ate_1_500m2}m²</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Droplet className="h-4 w-4 text-muted-foreground" />
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Permeabilidade</div>
              <div className="text-sm font-semibold text-foreground">{data.Taxa_de_Permeabilidade_ate_1_500_m2}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
