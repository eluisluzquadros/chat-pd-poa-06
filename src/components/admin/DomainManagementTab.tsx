import React, { useState } from 'react';
import { Building2, Leaf, Shield, Plus, Edit2, Eye, EyeOff } from 'lucide-react';
import { useDomain } from '@/context/DomainContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

// Mapeamento de ícones
const iconMap: Record<string, React.ComponentType<any>> = {
  Building2,
  Leaf,
  Shield,
};

export function DomainManagementTab() {
  const { availableDomains, currentDomain, refreshDomains } = useDomain();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<string | null>(null);

  const handleToggleDomain = async (domainId: string, isActive: boolean) => {
    try {
      // TODO: Implementar API call
      console.log(`Toggle domain ${domainId} to ${isActive}`);
      toast({
        title: "Domínio atualizado",
        description: `Domínio ${isActive ? 'ativado' : 'desativado'} com sucesso.`,
      });
      refreshDomains();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar o domínio.",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (domainId: string) => {
    try {
      // TODO: Implementar API call
      console.log(`Set domain ${domainId} as default`);
      toast({
        title: "Domínio padrão atualizado",
        description: "Domínio definido como padrão com sucesso.",
      });
      refreshDomains();
    } catch (error) {
      toast({
        title: "Erro", 
        description: "Falha ao definir domínio padrão.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Gerenciamento de Domínios</h2>
          <p className="text-sm text-muted-foreground">
            Configure e gerencie os domínios da plataforma SDK
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-domain">
              <Plus className="h-4 w-4 mr-2" />
              Novo Domínio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Novo Domínio</DialogTitle>
              <DialogDescription>
                Configure um novo domínio para a plataforma
              </DialogDescription>
            </DialogHeader>
            <DomainForm onSuccess={() => setIsCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4">
            {availableDomains.map((domain) => {
              const Icon = iconMap[domain.icon || 'Building2'] || Building2;
              const isCurrentDomain = domain.id === currentDomain?.id;
              
              return (
                <Card key={domain.id} className="p-4" data-testid={`card-domain-${domain.slug}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${domain.primary_color}20` }}
                      >
                        <Icon 
                          className="h-6 w-6" 
                          style={{ color: domain.primary_color }} 
                        />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium">{domain.display_name}</h3>
                          {isCurrentDomain && (
                            <Badge variant="secondary">Atual</Badge>
                          )}
                          {domain.is_default && (
                            <Badge variant="outline">Padrão</Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {domain.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Slug: {domain.slug}</span>
                          <span>Agentes: {domain.agent_ids?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={domain.is_active}
                          onCheckedChange={(checked) => handleToggleDomain(domain.id, checked)}
                          data-testid={`switch-domain-${domain.slug}`}
                        />
                        <span className="text-sm">
                          {domain.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </span>
                      </div>
                      
                      {domain.is_active && !domain.is_default && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSetDefault(domain.id)}
                          data-testid={`button-set-default-${domain.slug}`}
                        >
                          Tornar Padrão
                        </Button>
                      )}
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingDomain(domain.id)}
                        data-testid={`button-edit-${domain.slug}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
            
            {availableDomains.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Nenhum domínio configurado</p>
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  Criar primeiro domínio
                </Button>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Globais</CardTitle>
              <CardDescription>
                Configurações que afetam todos os domínios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-switch">Troca automática de domínio</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir que usuários troquem entre domínios automaticamente
                  </p>
                </div>
                <Switch id="auto-switch" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="domain-branding">Branding por domínio</Label>
                  <p className="text-sm text-muted-foreground">
                    Aplicar cores e logos específicos por domínio
                  </p>
                </div>
                <Switch id="domain-branding" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente de formulário para criar/editar domínios
function DomainForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    display_name: '',
    description: '',
    icon: 'Building2',
    primary_color: '#29625D',
  });
  
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // TODO: Implementar API call
      console.log('Creating domain:', formData);
      
      toast({
        title: "Domínio criado",
        description: "Novo domínio criado com sucesso.",
      });
      
      onSuccess();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao criar domínio.",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: PLAC"
          required
          data-testid="input-domain-name"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="display_name">Nome de Exibição</Label>
        <Input
          id="display_name"
          value={formData.display_name}
          onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
          placeholder="Ex: Plano de Ação Climática"
          required
          data-testid="input-domain-display-name"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição do domínio..."
          data-testid="input-domain-description"
        />
      </div>
      
      <div className="flex space-x-2">
        <Button type="submit" data-testid="button-save-domain">
          Criar Domínio
        </Button>
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}