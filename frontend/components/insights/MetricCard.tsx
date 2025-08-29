
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  description: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const MetricCard = ({ icon: Icon, value, label, description, trend }: MetricCardProps) => {
  return (
    <div className="p-6 rounded-xl card-gradient border border-accent/20 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
        </div>
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{description}</p>
        {trend && (
          <p className={cn(
            "text-xs font-medium",
            trend.isPositive ? "text-green-500" : "text-red-500"
          )}>
            {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}% vs último mês
          </p>
        )}
      </div>
    </div>
  );
};
