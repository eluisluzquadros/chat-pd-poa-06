import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface SecurityTestSelectorProps {
  selectedTests: number[];
  onSelectionChange: (tests: number[]) => void;
}

export function SecurityTestSelector({ selectedTests, onSelectionChange }: SecurityTestSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: testCases } = useQuery({
    queryKey: ['security-test-cases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_test_cases')
        .select('*')
        .eq('is_active', true)
        .order('test_number');
      
      if (error) throw error;
      return data;
    },
  });

  const categories = testCases
    ? Array.from(new Set(testCases.map(t => t.category)))
    : [];

  const handleToggle = (testNumber: number) => {
    if (selectedTests.includes(testNumber)) {
      onSelectionChange(selectedTests.filter(t => t !== testNumber));
    } else {
      onSelectionChange([...selectedTests, testNumber]);
    }
  };

  const handleSelectAll = () => {
    if (testCases) {
      onSelectionChange(testCases.map(t => t.test_number));
    }
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const handleSelectCategory = (category: string) => {
    if (!testCases) return;
    const categoryTests = testCases
      .filter(t => t.category === category)
      .map(t => t.test_number);
    
    const allSelected = categoryTests.every(t => selectedTests.includes(t));
    
    if (allSelected) {
      onSelectionChange(selectedTests.filter(t => !categoryTests.includes(t)));
    } else {
      onSelectionChange([...new Set([...selectedTests, ...categoryTests])]);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="gap-2">
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            Selecionar Testes Específicos
          </Button>
        </CollapsibleTrigger>
        
        {isOpen && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Selecionar Todos
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              Limpar
            </Button>
          </div>
        )}
      </div>

      <CollapsibleContent className="mt-4 space-y-4">
        {categories.map(category => {
          const categoryTests = testCases?.filter(t => t.category === category) || [];
          const allSelected = categoryTests.every(t => selectedTests.includes(t.test_number));
          
          return (
            <div key={category} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold cursor-pointer" onClick={() => handleSelectCategory(category)}>
                  {category}
                </Label>
                <Badge variant={allSelected ? "default" : "outline"}>
                  {categoryTests.filter(t => selectedTests.includes(t.test_number)).length}/{categoryTests.length}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryTests.map(test => (
                  <div key={test.test_number} className="flex items-start gap-2">
                    <Checkbox
                      id={`test-${test.test_number}`}
                      checked={selectedTests.includes(test.test_number)}
                      onCheckedChange={() => handleToggle(test.test_number)}
                    />
                    <div className="grid gap-1 leading-none">
                      <Label
                        htmlFor={`test-${test.test_number}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        #{test.test_number}: {test.test_name}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {test.objective}
                      </p>
                      <Badge 
                        variant={test.severity === 'Alta' ? 'destructive' : 'default'}
                        className="w-fit text-xs"
                      >
                        {test.severity === 'Alta' ? '🔴' : '🟡'} {test.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
