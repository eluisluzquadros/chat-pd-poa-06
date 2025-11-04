import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, RotateCcw, Globe, Bot, Radio } from 'lucide-react';
import { platformSettingsService, PlatformSetting } from '@/services/platformSettingsService';
import { TenantManagement } from './TenantManagement';
import RAGConfigurationTab from './RAGConfigurationTab';
import { AnnouncementsManagement } from './platform/AnnouncementsManagement';
import { StatusManagement } from './platform/StatusManagement';
import { PlatformGeneralSettings } from './platform/PlatformGeneralSettings';

interface PlatformSettingsProps {
  onSettingsChange?: () => void;
}

export function PlatformSettings({ onSettingsChange }: PlatformSettingsProps) {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const allSettings = await platformSettingsService.getAllSettings();
      setSettings(allSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configurações da Plataforma</h2>
          <p className="text-muted-foreground">
            Configure domínios, sistema RAG, anúncios e status da plataforma
          </p>
        </div>
        <Button variant="outline" onClick={loadSettings} disabled={isLoading}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Recarregar
        </Button>
      </div>

      <Tabs defaultValue="domains" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="domains" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Domínios
          </TabsTrigger>
          <TabsTrigger value="rag" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Sistema RAG
          </TabsTrigger>
          <TabsTrigger value="platform" className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Plataforma
          </TabsTrigger>
        </TabsList>

        {/* Gerenciamento de Domínios */}
        <TabsContent value="domains" className="space-y-4">
          <TenantManagement />
        </TabsContent>

        {/* Sistema RAG */}
        <TabsContent value="rag" className="space-y-4">
          <RAGConfigurationTab />
        </TabsContent>

        {/* Plataforma - Anúncios, Status e Configurações Gerais */}
        <TabsContent value="platform" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Anúncios da Plataforma</CardTitle>
              <CardDescription>
                Gerencie comunicações sobre novos recursos, atualizações e manutenções
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnnouncementsManagement />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status e Incidentes</CardTitle>
              <CardDescription>
                Monitore a saúde da plataforma e registre incidentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StatusManagement />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Comportamentos globais e permissões da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlatformGeneralSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}