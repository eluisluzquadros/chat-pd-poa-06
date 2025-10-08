import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building2, MapPin, Ruler, TreePine, ChevronDown, ChevronUp, Info, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { RegimeData } from '@/hooks/useRegimeData';

interface RegimeCardV2Props {
  data: RegimeData;
}

export function RegimeCardV2({ data }: RegimeCardV2Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper function to get percentage for progress bars
  const getProgressPercentage = (value: string | number, max: number = 100) => {
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    return Math.min((numValue / max) * 100, 100);
  };

  // Get badge color based on zone type
  const getZoneBadgeColor = (zona: string) => {
    if (zona?.includes('ZOT')) return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
    if (zona?.includes('ZOC')) return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300';
    if (zona?.includes('ZOI')) return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';
    if (zona?.includes('ZOR')) return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300';
  };

  // Main info items
  const mainInfo = [
    {
      icon: Building2,
      label: 'Altura Máxima',
      value: data['altura máxima para edificação isolada'] || 'N/D',
      unit: 'm',
      progress: getProgressPercentage(data['altura máxima para edificação isolada'], 100),
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: Ruler,
      label: 'Área Mín. Lote',
      value: data['área mínima do lote'] || 'N/D',
      unit: 'm²',
      progress: getProgressPercentage(data['área mínima do lote'], 1000),
      color: 'text-green-600 dark:text-green-400'
    },
    {
      icon: TreePine,
      label: 'Taxa Permeabilidade',
      value: data['taxa de permeabilidade até 1500 m2'] || data['taxa de permeabilidade acima de 1500 m2'] || 'N/D',
      unit: '%',
      progress: getProgressPercentage(data['taxa de permeabilidade até 1500 m2'] || data['taxa de permeabilidade acima de 1500 m2'], 100),
      color: 'text-emerald-600 dark:text-emerald-400'
    }
  ];

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-muted/50 hover:border-primary/20 bg-gradient-to-br from-card to-card/50">
      {/* Header */}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-lg text-foreground leading-tight">
                {data.bairro || 'Bairro não informado'}
              </h3>
            </div>
            <Badge 
              variant="secondary" 
              className={`${getZoneBadgeColor(data.zona || '')} font-medium`}
            >
              {data.zona || 'Zona não informada'}
            </Badge>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-muted-foreground hover:text-primary"
              >
                <Info className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Detalhes Completos - {data.bairro} / {data.zona}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {Object.entries(data)
                  .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                  .map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2 gap-4 py-2 border-b border-muted/20 last:border-b-0">
                      <span className="font-medium text-muted-foreground">{key}:</span>
                      <span className="text-foreground">{value}</span>
                    </div>
                  ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      {/* Main Content */}
      <CardContent className="space-y-4">
        {/* Main Info Grid */}
        <div className="space-y-3">
          {mainInfo.map((info, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-background ${info.color}`}>
                  <info.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{info.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {info.value} {info.value !== 'N/D' && info.unit}
                  </p>
                </div>
              </div>
              {info.value !== 'N/D' && (
                <div className="w-16">
                  <Progress 
                    value={info.progress} 
                    className="h-2"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Expandable Details */}
        {isExpanded && (
          <div className="space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'CA Básico', value: data['coeficiente de aproveitamento básico'] },
                { label: 'CA Máximo', value: data['coeficiente de aproveitamento máximo'] },
                { label: 'Afastamento Lateral', value: data['afastamentos - laterais'] },
                { label: 'Afastamento Frente', value: data['afastamentos - frente'] },
                { label: 'Recuo de Jardim', value: data['recuo de jardim'] },
                { label: 'Afastamento Fundos', value: data['afastamentos - fundos'] }
              ].slice(0, 4).map((item, index) => (
                <div key={index} className="p-2 bg-muted/10 rounded border border-muted/20">
                  <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                  <p className="text-foreground font-semibold">{item.value || 'N/D'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-center text-muted-foreground hover:text-primary"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Menos detalhes
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Mais detalhes
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}