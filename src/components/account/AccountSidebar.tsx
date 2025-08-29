
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AccountSidebar = () => {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Configurações</CardTitle>
        <CardDescription>
          Gerencie suas preferências e conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="account" orientation="vertical" className="w-full">
          <TabsList className="flex flex-col items-start h-auto w-full justify-start">
            <TabsTrigger value="account" className="w-full justify-start">
              Conta
            </TabsTrigger>
            <TabsTrigger value="security" className="w-full justify-start">
              Segurança
            </TabsTrigger>
            <TabsTrigger value="tutorials" className="w-full justify-start">
              Tutoriais
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AccountSidebar;
