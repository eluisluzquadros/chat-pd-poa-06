import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Globe, Bot, Radio, Cpu, Shield, Activity } from 'lucide-react';
import { platformSettingsService, PlatformSetting } from '@/services/platformSettingsService';
import { TenantManagement } from './TenantManagement';
import RAGConfigurationTab from './RAGConfigurationTab';
import { AnnouncementsManagement } from './platform/AnnouncementsManagement';
import { StatusManagement } from './platform/StatusManagement';
import { PlatformGeneralSettings } from './platform/PlatformGeneralSettings';
import { AgentsConfigTab } from './tabs/AgentsConfigTab';
import { SecurityTab } from './tabs/SecurityTab';
import { StatusTab } from './tabs/StatusTab';

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
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações da Plataforma</h2>
        <p className="text-muted-foreground">
          Configure domínios, sistema RAG, agentes, segurança e status da plataforma
        </p>
      </div>

      <Tabs defaultValue="domains" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
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
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Agentes
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Status
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

        {/* Agentes */}
        <TabsContent value="agents">
          <AgentsConfigTab />
        </TabsContent>

        {/* Segurança */}
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>

        {/* Status */}
        <TabsContent value="status">
          <StatusTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}