
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersIcon, MessageSquareIcon, BarChart2Icon, SmileIcon, TagIcon, BellIcon } from "lucide-react";

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
            <TabsTrigger value="executive" className="w-full justify-start mb-1">
              <div className="flex items-center gap-2">
                <BarChart2Icon className="h-4 w-4" />
                <span>Dashboard Executivo</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="all" className="w-full justify-start mb-1">
              <div className="flex items-center gap-2">
                <BarChart2Icon className="h-4 w-4" />
                <span>Visão Geral</span>
              </div>
            </TabsTrigger>
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
            <TabsTrigger value="sentiment" className="w-full justify-start mb-1">
              <div className="flex items-center gap-2">
                <SmileIcon className="h-4 w-4" />
                <span>Sentimento</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="topics" className="w-full justify-start mb-1">
              <div className="flex items-center gap-2">
                <TagIcon className="h-4 w-4" />
                <span>Tópicos</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="keywords" className="w-full justify-start mb-1">
              <div className="flex items-center gap-2">
                <TagIcon className="h-4 w-4" />
                <span>Palavras-Chave</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="intents" className="w-full justify-start mb-1">
              <div className="flex items-center gap-2">
                <MessageSquareIcon className="h-4 w-4" />
                <span>Intenções</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="faqs" className="w-full justify-start mb-1">
              <div className="flex items-center gap-2">
                <MessageSquareIcon className="h-4 w-4" />
                <span>FAQs</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="w-full justify-start mb-1">
              <div className="flex items-center gap-2">
                <BellIcon className="h-4 w-4" />
                <span>Alertas</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardContent>
    </Card>
  );
}
