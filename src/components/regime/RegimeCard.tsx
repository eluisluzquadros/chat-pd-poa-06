import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Ruler, TreePine, ChevronDown, ChevronUp } from 'lucide-react';
import { RegimeData } from '@/hooks/useRegimeData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface RegimeCardProps {
  data: RegimeData;
}

export function RegimeCard({ data }: RegimeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const mainInfo = [
    {
      icon: Building2,
      label: 'Altura Máxima',
      value: data['Altura_Maxima___Edificacao_Isolada'] 
        ? `${data['Altura_Maxima___Edificacao_Isolada']}m`
        : 'N/A'
    },
    {
      icon: Ruler,
      label: 'Área Mín. Lote',
      value: data['Área_Minima_do_Lote'] 
        ? `${data['Área_Minima_do_Lote']}m²`
        : 'N/A'
    },
    {
      icon: TreePine,
      label: 'Taxa Permeabilidade',
      value: data['Taxa_de_Permeabilidade_ate_1,500_m2'] 
        ? `${data['Taxa_de_Permeabilidade_ate_1,500_m2']}%`
        : 'N/A'
    }
  ];

  const additionalInfo = [
    { label: 'CA Básico', value: data['Coeficiente_de_Aproveitamento___Basico'] || 'N/A' },
    { label: 'CA Máximo', value: data['Coeficiente_de_Aproveitamento___Maximo'] || 'N/A' },
    { label: 'Recuo de Jardim', value: data['Recuo_de_Jardim'] ? `${data['Recuo_de_Jardim']}m` : 'N/A' },
    { label: 'Testada Mínima', value: data['Testada_Minima_do_Lote'] ? `${data['Testada_Minima_do_Lote']}m` : 'N/A' }
  ];

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {data.Bairro}
            </CardTitle>
            <Badge variant="secondary" className="w-fit">
              {data.Zona}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Info Grid */}
        <div className="grid grid-cols-1 gap-3">
          {mainInfo.map((info, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <info.icon className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{info.label}</p>
                <p className="text-sm font-medium">{info.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Expandable Section */}
        {!isExpanded && (
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(true)}
            className="w-full text-sm text-muted-foreground hover:text-foreground"
          >
            Ver mais detalhes
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        )}

        {isExpanded && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {additionalInfo.map((info, index) => (
                <div key={index} className="p-2 bg-muted/20 rounded">
                  <p className="text-xs text-muted-foreground">{info.label}</p>
                  <p className="text-sm font-medium">{info.value}</p>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setIsExpanded(false)}
                className="flex-1 text-sm text-muted-foreground hover:text-foreground"
              >
                Menos detalhes
                <ChevronUp className="h-4 w-4 ml-1" />
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Detalhes Completos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {data.Bairro} - {data.Zona}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(data)
                        .filter(([key]) => !['id'].includes(key))
                        .map(([key, value]) => (
                          <div key={key} className="p-3 bg-muted/30 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">
                              {key.replace(/_/g, ' ').replace(/---/g, ' - ')}
                            </p>
                            <p className="text-sm font-medium">
                              {value !== null && value !== undefined ? String(value) : 'N/A'}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}