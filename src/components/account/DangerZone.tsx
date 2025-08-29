
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";

const DangerZone = () => {
  return (
    <Card className="bg-muted/50 border-destructive/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-destructive">Excluir conta</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Entre em contato com nossa equipe de suporte para processar a exclusão da sua conta.
        </p>
        <Button 
          variant="destructive" 
          className="w-full sm:w-auto flex items-center justify-center gap-2"
          type="button"
          disabled
        >
          <Trash2Icon className="h-4 w-4" />
          <span>Solicitar exclusão</span>
        </Button>
      </CardContent>
    </Card>
  );
};

export default DangerZone;
