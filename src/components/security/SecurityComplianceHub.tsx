import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Activity } from "lucide-react";
import SecurityValidation from "@/pages/admin/SecurityValidation";
import { SecurityMonitoringPanel } from "./SecurityMonitoringPanel";

export function SecurityComplianceHub() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          Compliance de Segurança
        </h2>
        <p className="text-muted-foreground mt-2">
          Sistema unificado de Simulação e Monitoramento de Ciberataques
        </p>
      </div>

      <Tabs defaultValue="simulation" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="simulation" className="gap-2">
            <Shield className="h-4 w-4" />
            Simulação de Ciberataque
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="gap-2">
            <Activity className="h-4 w-4" />
            Monitoramento de Ciberataque
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simulation" className="mt-6">
          <SecurityValidation embedded={true} />
        </TabsContent>

        <TabsContent value="monitoring" className="mt-6">
          <SecurityMonitoringPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
