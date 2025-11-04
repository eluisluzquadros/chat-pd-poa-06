import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { usePlatformStatus } from '@/hooks/usePlatformStatus';
import { ServiceStatusCard } from './ServiceStatusCard';
import { IncidentTimeline } from '../admin/platform/IncidentTimeline';

export function StatusPage() {
  const { services, recentEvents, isAllOperational, isLoading } = usePlatformStatus();

  return (
    <div className="min-h-screen bg-background">
      {/* Header minimalista */}
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Status da Plataforma</h1>
            <a 
              href="/auth" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Voltar para Login
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-5xl">
        {/* Banner de Status Geral */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-4">
              {isAllOperational ? (
                <>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <div>
                    <h1 className="text-2xl font-bold">Todos os Sistemas Operacionais</h1>
                    <p className="text-muted-foreground">
                      Nenhum incidente ou manutenção programada no momento
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                  <div>
                    <h1 className="text-2xl font-bold">Incidentes Ativos</h1>
                    <p className="text-muted-foreground">
                      Alguns serviços estão com problemas. Veja os detalhes abaixo
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status dos Serviços */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Status dos Serviços</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : (
              services.map((service) => (
                <ServiceStatusCard key={service.name} service={service} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Incidentes e Histórico */}
        {recentEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Incidentes</CardTitle>
            </CardHeader>
            <CardContent>
              <IncidentTimeline incidents={recentEvents} showActions={false} />
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            Esta página mostra o status em tempo real de todos os serviços da plataforma.
          </p>
          <p className="mt-2">
            Última atualização: {new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      </main>
    </div>
  );
}
