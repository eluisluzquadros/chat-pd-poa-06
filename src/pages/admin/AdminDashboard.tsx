import { Header } from '@/components/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportsContainer } from "@/components/reports/ReportsContainer";
import { BarChart3, DollarSign, Cpu } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Administrativo</h1>
            <p className="text-muted-foreground">
              Visão geral, relatórios e análises do sistema
            </p>
          </div>

          <Tabs defaultValue="reports" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Relatórios
              </TabsTrigger>
              <TabsTrigger value="costs" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Tokens & Custos
              </TabsTrigger>
              <TabsTrigger value="models" className="flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                Modelos/Agentes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reports" className="space-y-4 mt-6">
              <ReportsContainer showProcessButton={true} />
            </TabsContent>

            <TabsContent value="costs" className="space-y-4 mt-6">
              <div className="rounded-lg border bg-card p-8 text-center">
                <h3 className="text-lg font-semibold mb-2">Tokens & Custos</h3>
                <p className="text-muted-foreground">
                  Análise de consumo de tokens e custos será implementada em breve
                </p>
              </div>
            </TabsContent>

            <TabsContent value="models" className="space-y-4 mt-6">
              <div className="rounded-lg border bg-card p-8 text-center">
                <h3 className="text-lg font-semibold mb-2">Modelos & Agentes</h3>
                <p className="text-muted-foreground">
                  Visão de modelos LLM e agentes será implementada em breve
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
