import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "./components/ui/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { DomainProvider } from "./context/DomainContext";
import React from "react";

// Pages
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import DemoLogin from "./pages/DemoLogin";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import UserManagement from "./pages/admin/UserManagement";
import AdminDashboard from "./pages/admin/AdminDashboard";
import QualityBenchmark from "./pages/admin/QualityBenchmark";
import FeedbackManagement from "./pages/admin/FeedbackManagement";
import AgentsConfig from "./pages/admin/AgentsConfig";
import AdminPlayground from "./pages/admin/AdminPlayground";
import UserSettings from "./pages/UserSettings";
import Reports from "./pages/Reports";
import ProcessInsights from "./pages/ProcessInsights";
import BenchmarkV2 from "./pages/admin/BenchmarkV2";
import SecurityValidation from "./pages/admin/SecurityValidation";
import SecurityRunDetails from "./pages/admin/SecurityRunDetails";
import AdminDataImport from "./pages/AdminDataImport";

import RegimeUrbanisticoDashboard from "./pages/RegimeUrbanisticoDashboard";
import Metrics from "./pages/admin/Metrics";
import PlatformSettings from "./pages/admin/PlatformSettings";
import AgenticRAGDashboard from "./components/admin/AgenticRAGDashboard";
const KnowledgeBaseAdminLazy = React.lazy(() => import("./pages/admin/KnowledgeBaseAdmin"));
const KnowledgeManagementLazy = React.lazy(() => import("./pages/admin/KnowledgeManagement"));

// Components
import { SimpleAuthGuard } from "./components/SimpleAuthGuard";
import { SimpleRoleGuard } from "./components/SimpleRoleGuard";
import { AdminRoleGuard } from "./components/layout/AdminRoleGuard";
import ChatHistorySync from "./components/ChatHistorySync";
import { AdminErrorBoundary } from "./components/admin/AdminErrorBoundary";


// Create a new query client instance with proper cache configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  return (
    <ThemeProvider defaultTheme="light" attribute="class" enableSystem={false} storageKey="urbanista-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DomainProvider>
            <BrowserRouter>
            
            <Routes>
              {/* Redirecionar a rota inicial para a autenticação */}
              <Route path="/" element={<Navigate to="/auth" replace />} />
              
              {/* Modo demo para testes */}
              <Route path="/demo" element={<DemoLogin />} />
              
              {/* Página de autenticação como página principal */}
              <Route path="/auth" element={<Auth />} />
              
              {/* Página de callback para OAuth */}
              <Route path="/auth/callback" element={<AuthCallback />} />
              
              {/* Página de reset de senha */}
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Insights route */}
              <Route path="/insights" element={<SimpleAuthGuard><React.Suspense fallback={null}>{React.createElement(React.lazy(() => import('./pages/Insights')))}</React.Suspense></SimpleAuthGuard>} />
              
              {/* Basic authenticated routes */}
              <Route path="/chat" element={<SimpleAuthGuard><Chat /></SimpleAuthGuard>} />
              <Route path="/explorar-dados" element={<SimpleAuthGuard><RegimeUrbanisticoDashboard /></SimpleAuthGuard>} />
              <Route path="/settings" element={<SimpleAuthGuard><UserSettings /></SimpleAuthGuard>} />
              
              {/* Admin routes */}
              <Route path="/admin/dashboard" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <AdminErrorBoundary>
                      <AdminDashboard />
                    </AdminErrorBoundary>
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/users" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <UserManagement />
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/observatory" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <AdminErrorBoundary>
                      <QualityBenchmark />
                    </AdminErrorBoundary>
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              {/* Legacy redirect for bookmarks */}
              <Route path="/admin/quality" element={<Navigate to="/admin/observatory" replace />} />
              <Route path="/admin/feedback" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <FeedbackManagement />
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/benchmark" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <AdminErrorBoundary>
                      <QualityBenchmark />
                    </AdminErrorBoundary>
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/metrics" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <Metrics />
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/settings" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <AdminErrorBoundary>
                      <PlatformSettings />
                    </AdminErrorBoundary>
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/agents-config" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <AdminErrorBoundary>
                      <AgentsConfig />
                    </AdminErrorBoundary>
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/playground" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <AdminErrorBoundary>
                      <AdminPlayground />
                    </AdminErrorBoundary>
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/monitoring" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <AgenticRAGDashboard />
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/kb" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    { /* Knowledge Base Admin */ }
                    <React.Suspense fallback={null}>
                      <KnowledgeBaseAdminLazy />
                    </React.Suspense>
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/knowledge" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <AdminErrorBoundary>
                      <React.Suspense fallback={null}>
                        <KnowledgeManagementLazy />
                      </React.Suspense>
                    </AdminErrorBoundary>
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/security" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <AdminErrorBoundary>
                      <SecurityValidation />
                    </AdminErrorBoundary>
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/security/runs/:runId" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <AdminErrorBoundary>
                      <SecurityRunDetails />
                    </AdminErrorBoundary>
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/data-import" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <AdminErrorBoundary>
                      <AdminDataImport />
                    </AdminErrorBoundary>
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/process-insights" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <ProcessInsights />
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              
              {/* Admin or supervisor routes */}
              <Route path="/reports" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={false} supervisorOnly={true}>
                    <Reports />
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              
              {/* Redirects for old routes */}
              <Route path="/profile" element={<SimpleAuthGuard><UserSettings /></SimpleAuthGuard>} />
              <Route path="/account" element={<SimpleAuthGuard><UserSettings /></SimpleAuthGuard>} />
              <Route path="/standalone-login" element={<Auth />} />
              
              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            
            <Toaster position="top-right" />
            </BrowserRouter>
          </DomainProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;