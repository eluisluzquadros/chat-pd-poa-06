
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLinkIcon } from "lucide-react";

const TutorialsTab = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Tutoriais</CardTitle>
        <CardDescription>
          Recursos e documentação para utilização da plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Documentação da API</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Dive into the developer documentation to build your chatbot using our API.
            </p>
            <Button 
              variant="outline" 
              className="flex items-center justify-center gap-2"
              type="button"
            >
              <ExternalLinkIcon className="h-4 w-4" />
              <span>Acessar documentação</span>
            </Button>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default TutorialsTab;
