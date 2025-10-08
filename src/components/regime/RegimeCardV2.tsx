import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, MapPin, Ruler, TreePine, ChevronDown, ChevronUp, Info, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { RegimeData } from '@/hooks/useRegimeData';

interface RegimeCardV2Props {
  data: RegimeData;
}

export function RegimeCardV2({ data }: RegimeCardV2Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Helper function to get percentage for progress bars
  const getProgressPercentage = (value: string | number, max: number = 100) => {
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    return Math.min((numValue / max) * 100, 100);
  };

  // Get badge color based on zone type
  const getZoneBadgeColor = (zona: string) => {
    if (zona?.includes('ZOT')) return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/25';
    if (zona?.includes('ZOC')) return 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30 hover:bg-green-500/25';
    if (zona?.includes('ZOI')) return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/25';
    if (zona?.includes('ZOR')) return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30 hover:bg-orange-500/25';
    return 'bg-muted/50 text-muted-foreground border-muted hover:bg-muted';
  };

  // Main info items
  const mainInfo = [
    {
      icon: Building2,
      label: 'Altura Máxima',
      value: data['altura máxima para edificação isolada'] || 'N/D',
      unit: 'm',
      progress: getProgressPercentage(data['altura máxima para edificação isolada'], 100),
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      icon: Ruler,
      label: 'Área Mín. Lote',
      value: data['área mínima do lote'] || 'N/D',
      unit: 'm²',
      progress: getProgressPercentage(data['área mínima do lote'], 1000),
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      icon: TreePine,
      label: 'Taxa Permeabilidade',
      value: data['taxa de permeabilidade até 1500 m2'] || data['taxa de permeabilidade acima de 1500 m2'] || 'N/D',
      unit: '%',
      progress: getProgressPercentage(data['taxa de permeabilidade até 1500 m2'] || data['taxa de permeabilidade acima de 1500 m2'], 100),
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    }
  ];

  return (
    <Card 
      className="group relative overflow-hidden transition-all duration-500 hover:shadow-2xl border border-muted/50 hover:border-primary/30 bg-gradient-to-br from-card via-card to-card/50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
        transformStyle: 'preserve-3d'
      }}
    >
      {/* Glassmorphism overlay on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-lg`} />
      
      {/* Header */}
      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-lg text-foreground leading-tight group-hover:text-primary transition-colors">
                {data.bairro || 'Bairro não informado'}
              </h3>
            </div>
            <Badge 
              variant="outline" 
              className={`${getZoneBadgeColor(data.zona || '')} font-medium transform group-hover:scale-105 transition-all border`}
            >
              {data.zona || 'Zona não informada'}
            </Badge>
          </div>
          
          {/* Modal Button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-all duration-300 text-muted-foreground hover:text-primary hover:bg-primary/10"
              >
                <Info className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Informações Completas - {data.bairro} ({data.zona})
                </DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="formatted" className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="formatted">Formatado</TabsTrigger>
                  <TabsTrigger value="metrics">Métricas</TabsTrigger>
                  <TabsTrigger value="raw">Dados Brutos</TabsTrigger>
                </TabsList>
                
                <TabsContent value="formatted" className="flex-1 overflow-y-auto mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 p-4 rounded-lg bg-muted/50 border border-border">
                      <h4 className="font-semibold text-sm text-muted-foreground">Localização</h4>
                      <p className="text-lg font-medium">{data.bairro}</p>
                      <Badge className={getZoneBadgeColor(data.zona || '')}>{data.zona}</Badge>
                    </div>
                    
                    {mainInfo.map((info, idx) => (
                      <div key={idx} className="space-y-2 p-4 rounded-lg bg-muted/50 border border-border">
                        <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                          <info.icon className="h-4 w-4" />
                          {info.label}
                        </h4>
                        <p className={`text-2xl font-bold ${info.color}`}>
                          {info.value}{info.value !== 'N/D' && info.unit}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  {(data['coeficiente de aproveitamento básico'] || data['coeficiente de aproveitamento máximo']) && (
                    <div className="space-y-2 p-4 rounded-lg bg-muted/50 border border-border">
                      <h4 className="font-semibold text-sm text-muted-foreground">Coeficientes de Aproveitamento</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {data['coeficiente de aproveitamento básico'] && (
                          <div>
                            <span className="text-xs text-muted-foreground">Básico</span>
                            <p className="text-lg font-medium">{data['coeficiente de aproveitamento básico']}</p>
                          </div>
                        )}
                        {data['coeficiente de aproveitamento máximo'] && (
                          <div>
                            <span className="text-xs text-muted-foreground">Máximo</span>
                            <p className="text-lg font-medium">{data['coeficiente de aproveitamento máximo']}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="metrics" className="flex-1 overflow-y-auto mt-4 space-y-4">
                  {mainInfo.map((info, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <info.icon className={`h-4 w-4 ${info.color}`} />
                          <span className="text-sm font-medium">{info.label}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {info.value}{info.value !== 'N/D' && info.unit}
                        </span>
                      </div>
                      {info.value !== 'N/D' && (
                        <Progress value={info.progress} className="h-2.5" />
                      )}
                    </div>
                  ))}
                </TabsContent>
                
                <TabsContent value="raw" className="flex-1 overflow-y-auto mt-4">
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto border border-border">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      {/* Main Content */}
      <CardContent className="space-y-4 relative z-10">
        {/* Main Info Grid with enhanced styling */}
        <div className="space-y-3">
          {mainInfo.map((info, index) => (
            <div 
              key={index} 
              className={`flex items-center justify-between p-3 rounded-lg ${info.bgColor} border border-transparent group-hover:border-primary/20 transition-all duration-300`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-background shadow-sm ${info.color}`}>
                  <info.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{info.label}</p>
                  <p className={`text-base font-bold ${info.color}`}>
                    {info.value} {info.value !== 'N/D' && info.unit}
                  </p>
                </div>
              </div>
              {info.value !== 'N/D' && (
                <div className="w-20">
                  <Progress 
                    value={info.progress} 
                    className="h-2 transition-all duration-500 group-hover:scale-105"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Expandable Details */}
        {isExpanded && (
          <div className="space-y-3 animate-fade-in pt-2 border-t border-border/50">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'CA Básico', value: data['coeficiente de aproveitamento básico'] },
                { label: 'CA Máximo', value: data['coeficiente de aproveitamento máximo'] },
                { label: 'Afastamento Lateral', value: data['afastamentos - laterais'] },
                { label: 'Afastamento Frente', value: data['afastamentos - frente'] },
              ].map((item, index) => (
                <div key={index} className="p-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                  <p className="text-xs text-muted-foreground font-medium mb-1">{item.label}</p>
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
          className="w-full justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
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
