
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  className?: string;
}

export function StatsCard({ title, value, className }: StatsCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="text-sm font-medium text-muted-foreground mb-1">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
