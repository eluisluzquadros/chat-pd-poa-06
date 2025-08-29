import React from 'react';
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
        <div key={index} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
          <stat.icon className={`h-5 w-5 ${stat.color}`} />
          <div>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`text-lg font-semibold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}