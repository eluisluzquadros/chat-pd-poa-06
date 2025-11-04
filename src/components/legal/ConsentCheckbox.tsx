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
    <div className="flex items-start space-x-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
      <label
        htmlFor={id}
        className="flex items-start gap-2 text-sm font-medium leading-snug cursor-pointer flex-1"
      >
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <span className="text-left">{label}</span>
      </label>
    </div>
  );
};
