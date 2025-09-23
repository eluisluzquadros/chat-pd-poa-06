import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FilterDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
}

export function FilterDropdown({
  label,
  value,
  onChange,
  options,
  placeholder
}: FilterDropdownProps) {
  return (
    <div className="space-y-2 min-w-0 flex-1 max-w-[200px]">
      <label className="text-sm font-medium text-foreground block truncate">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          {options
            .filter(option => option && option.trim() !== '') // Filter out empty strings
            .map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}