import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedbackDashboard } from "@/components/admin/FeedbackDashboard";
import { FeedbackNotifications } from "@/components/admin/FeedbackNotifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  BarChart3, 
  Bell, 
  Settings, 
  Download,
  RefreshCw,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { useAuthContext } from "@/context/auth/useAuthContext";
import { Navigate } from "react-router-dom";

export default function FeedbackManagement() {
  const { userRole, isAdmin } = useAuthContext();
  const [activeSection, setActiveSection] = useState("dashboard");

  // Only admins can access this page
  if (!isAdmin) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              Gerenciamento de Feedback
            </h1>
            <p className="text-muted-foreground mt-1">
              Análise completa do feedback dos usuários e métricas de qualidade
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:flex">
              <TrendingUp className="h-3 w-3 mr-1" />
              Sistema Ativo
            </Badge>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              activeSection === 'dashboard' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setActiveSection('dashboard')}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">Dashboard Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    Métricas e tendências
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              activeSection === 'notifications' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setActiveSection('notifications')}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Bell className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-medium">Alertas & Notificações</h3>
                  <p className="text-sm text-muted-foreground">
                    Feedback negativo e alertas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              activeSection === 'settings' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setActiveSection('settings')}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Settings className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Configurações</h3>
                  <p className="text-sm text-muted-foreground">
                    Ajustar parâmetros do sistema
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {activeSection === 'dashboard' && <FeedbackDashboard />}
          
          {activeSection === 'notifications' && <FeedbackNotifications />}
          
          {activeSection === 'settings' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações do Sistema de Feedback
                </CardTitle>
                <CardDescription>
                  Ajuste os parâmetros de coleta e análise de feedback
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Alertas Automáticos</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">Feedback Negativo</h4>
                          <p className="text-sm text-muted-foreground">
                            Alerta quando houver 2+ feedbacks negativos em uma sessão
                          </p>
                        </div>
                        <Badge variant="default">Ativo</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">Detecção de Spam</h4>
                          <p className="text-sm text-muted-foreground">
                            Identifica padrões suspeitos nos comentários
                          </p>
                        </div>
                        <Badge variant="default">Ativo</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">Taxa de Satisfação Baixa</h4>
                          <p className="text-sm text-muted-foreground">
                            Alerta quando satisfação do modelo cai abaixo de 70%
                          </p>
                        </div>
                        <Badge variant="default">Ativo</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Métricas de Qualidade</h3>
                    
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium mb-2">Atualização Automática</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Métricas são atualizadas em tempo real quando novos feedbacks chegam
                        </p>
                        <div className="flex gap-2">
                          <Badge variant="outline">Session Metrics</Badge>
                          <Badge variant="outline">Model Performance</Badge>
                          <Badge variant="outline">Daily Reports</Badge>
                        </div>
                      </div>
                      
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium mb-2">Retention</h4>
                        <p className="text-sm text-muted-foreground">
                          Dados de feedback são mantidos por 365 dias
                        </p>
                      </div>
                      
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium mb-2">Export</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Dados podem ser exportados em formato CSV
                        </p>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Exportar Dados
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Sistema de Feedback</h4>
                      <p className="text-sm text-muted-foreground">
                        Status geral do sistema de coleta e análise
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-700">
                        Operacional
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}