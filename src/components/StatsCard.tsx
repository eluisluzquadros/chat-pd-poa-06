import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  sublabel: string;
}

export const StatsCard = ({ icon: Icon, value, label, sublabel }: StatsCardProps) => {
  return (
    <div className="stats-card animate-fade-in">
      <Icon className="w-6 h-6 text-primary mb-4" />
      <div className="space-y-1">
        <h3 className="text-2xl font-bold">{value}</h3>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground/70">{sublabel}</p>
      </div>
    </div>
  );
};