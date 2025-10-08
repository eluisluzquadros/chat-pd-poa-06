import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Building2, MapPin, Map, Database } from 'lucide-react';

interface StatsCounterProps {
  total: number;
  filtered: number;
  bairrosCount: number;
  zonasCount: number;
  isLoading: boolean;
}

export function StatsCounter({
  total,
  filtered,
  bairrosCount,
  zonasCount,
  isLoading
}: StatsCounterProps) {
  const stats = [
    {
      icon: Database,
      label: 'Total de Registros',
      value: isLoading ? '...' : total.toLocaleString(),
      color: 'text-primary'
    },
    {
      icon: Building2,
      label: 'Resultados Filtrados',
      value: isLoading ? '...' : filtered.toLocaleString(),
      color: filtered === total ? 'text-muted-foreground' : 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: MapPin,
      label: 'Bairros',
      value: isLoading ? '...' : bairrosCount.toString(),
      color: 'text-green-600 dark:text-green-400'
    },
    {
      icon: Map,
      label: 'Zonas',
      value: isLoading ? '...' : zonasCount.toString(),
      color: 'text-purple-600 dark:text-purple-400'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-background to-muted/30 p-4 border border-muted/20 hover:border-primary/20 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </p>
              <p className={`text-2xl font-bold ${stat.color} transition-all duration-300 group-hover:scale-105`}>
                {stat.value}
              </p>
            </div>
            <div className={`p-3 rounded-xl bg-background/50 ${stat.color} transition-all duration-300 group-hover:scale-110`}>
              <stat.icon className="h-5 w-5" />
            </div>
          </div>
          
          {/* Decorative gradient overlay */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent rounded-full -translate-y-8 translate-x-8 transition-all duration-300 group-hover:scale-150" />
        </div>
      ))}
    </div>
  );
}