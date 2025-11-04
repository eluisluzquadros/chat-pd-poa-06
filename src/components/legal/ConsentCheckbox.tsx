import { Checkbox } from '@/components/ui/checkbox';
import { LucideIcon } from 'lucide-react';

interface ConsentCheckboxProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon: LucideIcon;
  label: string;
}

export const ConsentCheckbox = ({ id, checked, onCheckedChange, icon: Icon, label }: ConsentCheckboxProps) => {
  return (
    <div className="flex items-start space-x-2 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
      <label
        htmlFor={id}
        className="flex items-start gap-2 text-xs font-medium leading-tight cursor-pointer flex-1"
      >
        <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <span className="text-left">{label}</span>
      </label>
    </div>
  );
};
