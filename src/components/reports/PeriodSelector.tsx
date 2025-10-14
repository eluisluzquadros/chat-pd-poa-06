import { Button } from "@/components/ui/button";
import { Period } from "@/utils/dateUtils";

interface PeriodSelectorProps {
  selectedPeriod: Period;
  onPeriodChange: (period: Period) => void;
}

export function PeriodSelector({ selectedPeriod, onPeriodChange }: PeriodSelectorProps) {
  return (
    <div className="flex gap-2 mb-4">
      <Button 
        variant={selectedPeriod === 'all' ? 'default' : 'outline'}
        onClick={() => onPeriodChange('all')}
      >
        Todos os Períodos
      </Button>
      <Button 
        variant={selectedPeriod === 'testing' ? 'default' : 'outline'}
        onClick={() => onPeriodChange('testing')}
      >
        🧪 Teste (antes 08/10)
      </Button>
      <Button 
        variant={selectedPeriod === 'production' ? 'default' : 'outline'}
        onClick={() => onPeriodChange('production')}
      >
        🚀 Produção (após 08/10)
      </Button>
    </div>
  );
}