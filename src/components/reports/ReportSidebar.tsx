
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersIcon, MessageSquareIcon, BarChart2Icon } from "lucide-react";

interface ReportSidebarProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function ReportSidebar({ activeTab, onTabChange }: ReportSidebarProps) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Relatórios</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTab} orientation="vertical" className="w-full" onValueChange={onTabChange}>
          <TabsList className="flex flex-col items-start h-auto w-full justify-start">
            <TabsTrigger value="users" className="w-full justify-start mb-1">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                <span>Usuários</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="conversations" className="w-full justify-start mb-1">
              <div className="flex items-center gap-2">
                <MessageSquareIcon className="h-4 w-4" />
                <span>Conversas</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="all" className="w-full justify-start">
              <div className="flex items-center gap-2">
                <BarChart2Icon className="h-4 w-4" />
                <span>Visão Geral</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardContent>
    </Card>
  );
}
