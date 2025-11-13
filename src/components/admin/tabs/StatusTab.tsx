import { AdminStatusPage } from '@/components/platform/AdminStatusPage';
import { PublicSecurityIncidents } from '../PublicSecurityIncidents';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function StatusTab() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="platform" className="w-full">
        <TabsList>
          <TabsTrigger value="platform">Status da Plataforma</TabsTrigger>
          <TabsTrigger value="security">Incidentes de Segurança</TabsTrigger>
        </TabsList>
        
        <TabsContent value="platform">
          <AdminStatusPage />
        </TabsContent>
        
        <TabsContent value="security">
          <PublicSecurityIncidents />
        </TabsContent>
      </Tabs>
    </div>
  );
}
