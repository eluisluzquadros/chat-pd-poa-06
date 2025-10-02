import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDomain } from '@/context/DomainContext';
import { Check, Globe } from 'lucide-react';
import { toast } from 'sonner';

export function TenantManagement() {
  const { availableDomains, currentDomain, switchDomain } = useDomain();

  const handleSetDomain = async (domainId: string) => {
    try {
      await switchDomain(domainId);
      toast.success('Domínio atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao alterar domínio:', error);
      toast.error('Erro ao alterar domínio');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Gerenciamento de Domínios</h2>
        <p className="text-muted-foreground">
          Configure qual domínio está ativo para toda a plataforma. Apenas administradores podem visualizar e alterar esta configuração.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {availableDomains.map((domain) => {
          const isActive = currentDomain?.id === domain.id;
          const IconComponent = domain.icon ? Globe : Globe;
          
          return (
            <Card 
              key={domain.id}
              className={isActive ? 'border-primary shadow-md' : ''}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                      <IconComponent className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{domain.name}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {domain.slug}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Badge variant={domain.isActive ? 'default' : 'secondary'}>
                      {domain.isActive ? 'Disponível' : 'Indisponível'}
                    </Badge>
                    {isActive && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        <Check className="h-3 w-3 mr-1" />
                        Ativo
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {domain.description}
                </p>
                
                {domain.isActive && !isActive && (
                  <Button
                    onClick={() => handleSetDomain(domain.id)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Ativar este domínio
                  </Button>
                )}
                
                {isActive && (
                  <div className="bg-primary/5 rounded-md p-3 text-center">
                    <p className="text-sm font-medium text-primary">
                      Este é o domínio ativo atual
                    </p>
                  </div>
                )}
                
                {!domain.isActive && (
                  <div className="bg-muted rounded-md p-3 text-center">
                    <p className="text-sm text-muted-foreground">
                      Domínio não disponível no momento
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <Globe className="h-4 w-4" />
            Informação sobre Domínios
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-800 dark:text-amber-300 space-y-2">
          <p>
            • O domínio ativo determina qual conjunto de dados e configurações serão utilizados na plataforma
          </p>
          <p>
            • Apenas administradores podem visualizar e alterar o domínio ativo
          </p>
          <p>
            • Usuários comuns não têm visibilidade desta configuração - o sistema utiliza automaticamente o domínio ativo
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
