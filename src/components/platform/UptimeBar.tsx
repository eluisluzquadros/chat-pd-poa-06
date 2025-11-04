import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UptimeBarProps {
  uptimeData: number[];
}

export function UptimeBar({ uptimeData }: UptimeBarProps) {
  const getColor = (uptime: number) => {
    if (uptime >= 99) return 'bg-green-500';
    if (uptime >= 95) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Pegar os últimos 90 dias
  const last90Days = uptimeData.slice(-90);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-2">90 dias</span>
        <div className="flex gap-0.5">
          {last90Days.map((uptime, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (last90Days.length - 1 - index));

            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <div
                    className={`h-8 w-1 rounded-sm ${getColor(uptime)} hover:opacity-80 transition-opacity cursor-pointer`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {date.toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs font-bold">{uptime.toFixed(2)}% uptime</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <span className="text-xs text-muted-foreground ml-2">
          {(last90Days.reduce((a, b) => a + b, 0) / last90Days.length).toFixed(2)}%
        </span>
      </div>
    </TooltipProvider>
  );
}
