
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface FilterSidebarProps {
  isVisible: boolean;
  selectedFileType?: string;
  setSelectedFileType: (type: string | undefined) => void;
  selectedDomain: string[];
  setSelectedDomain: (domains: string[]) => void;
  onReset?: () => void;
}

export function FilterSidebar({
  isVisible,
  selectedFileType,
  setSelectedFileType,
  selectedDomain,
  setSelectedDomain,
  onReset
}: FilterSidebarProps) {
  const fileTypes = ["PDF", "DOC", "PPT", "CSV", "URL"];
  const domains = ["Clima", "Espacial", "Terra", "Urbano", "Desastre"];

  const handleFileTypeClick = (type: string) => {
    if (selectedFileType === type) {
      setSelectedFileType(undefined);
    } else {
      setSelectedFileType(type);
    }
  };

  const handleDomainChange = (domain: string) => {
    if (selectedDomain.includes(domain)) {
      setSelectedDomain(selectedDomain.filter((d) => d !== domain));
    } else {
      setSelectedDomain([...selectedDomain, domain]);
    }
  };

  return (
    <div className={cn(
      "col-span-12 lg:col-span-3 transition-all duration-300",
      isVisible ? "block" : "hidden"
    )}>
      <Card className="p-4 h-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filtros</h2>
          {onReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <RefreshCw className="h-3 w-3" />
              Limpar
            </Button>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tipo de Arquivo</h3>
            <div className="space-y-2">
              {fileTypes.map((type) => (
                <button
                  key={type}
                  className={cn(
                    "px-3 py-1.5 w-full text-left rounded text-sm transition-colors",
                    selectedFileType === type
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  )}
                  onClick={() => handleFileTypeClick(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Domínio</h3>
            <div className="space-y-2">
              {domains.map((domain) => (
                <div key={domain} className="flex items-center space-x-2">
                  <Checkbox
                    id={domain}
                    checked={selectedDomain.includes(domain)}
                    onCheckedChange={() => handleDomainChange(domain)}
                  />
                  <label
                    htmlFor={domain}
                    className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    {domain}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
