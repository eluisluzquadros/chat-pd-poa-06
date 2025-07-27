
import { Button } from "@/components/ui/button";
import { LayoutGrid, LayoutList, PanelLeftClose, PanelLeft } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ViewControlsProps {
  isFilterVisible: boolean;
  setIsFilterVisible: (visible: boolean) => void;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
}

export function ViewControls({
  isFilterVisible,
  setIsFilterVisible,
  viewMode,
  setViewMode
}: ViewControlsProps) {
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsFilterVisible(!isFilterVisible)}
              className="shrink-0 order-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {isFilterVisible ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isFilterVisible ? "Ocultar filtros" : "Mostrar filtros"}</p>
          </TooltipContent>
        </Tooltip>

        <div className="flex gap-2 order-2 sm:order-3 ml-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="shrink-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {viewMode === "grid" ? 
                  <LayoutList className="h-4 w-4" /> : 
                  <LayoutGrid className="h-4 w-4" />
                }
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Alternar para visualização em {viewMode === "grid" ? "lista" : "grade"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </>
  );
}
