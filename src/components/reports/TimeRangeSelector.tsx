
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TimeRange } from "@/utils/dateUtils";

interface TimeRangeSelectorProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}

export function TimeRangeSelector({ selectedRange, onRangeChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <Button 
        variant={selectedRange === "7days" ? "default" : "outline"} 
        size="sm"
        onClick={() => onRangeChange("7days")}
      >
        Últimos 7 dias
      </Button>
      <Button 
        variant={selectedRange === "month" ? "default" : "outline"} 
        size="sm"
        onClick={() => onRangeChange("month")}
      >
        Último mês
      </Button>
      <Button 
        variant={selectedRange === "year" ? "default" : "outline"} 
        size="sm"
        className={cn(new Date().getFullYear() < 2025 && "hidden")}
        onClick={() => onRangeChange("year")}
      >
        Ano atual
      </Button>
    </div>
  );
}
