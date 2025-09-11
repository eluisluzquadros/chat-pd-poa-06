import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "./components/ui/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import React from "react";

// Pages
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import DemoLogin from "./pages/DemoLogin";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import UserManagement from "./pages/admin/UserManagement";
import AdminDashboard from "./pages/admin/AdminDashboard";
import QualityV2 from "./pages/admin/QualityV2";
import QualityV3 from "./pages/admin/QualityV3";
import QualityTest from "./pages/admin/QualityTest";
import TestQA from "./pages/admin/TestQA";
import TestQACases from "./pages/admin/TestQACases";
import ManualQATest from "./pages/admin/ManualQATest";
import FeedbackManagement from "./pages/admin/FeedbackManagement";
import UserSettings from "./pages/UserSettings";
import Reports from "./pages/Reports";
import BenchmarkV2 from "./pages/admin/BenchmarkV2";
import BenchmarkV3 from "./pages/admin/BenchmarkV3";
import RegimeUrbanisticoDashboard from "./pages/RegimeUrbanisticoDashboard";
import Metrics from "./pages/admin/Metrics";
import PlatformSettings from "./pages/admin/PlatformSettings";
import AgenticRAGDashboard from "./components/admin/AgenticRAGDashboard";
const KnowledgeBaseAdminLazy = React.lazy(() => import("./pages/admin/KnowledgeBaseAdmin"));

// Components
import { SimpleAuthGuard } from "./components/SimpleAuthGuard";
import { SimpleRoleGuard } from "./components/SimpleRoleGuard";
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
              <Route path="/admin/quality" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <AdminErrorBoundary>
                      <QualityV2 />
                    </AdminErrorBoundary>
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/quality-test" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <QualityTest />
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/test-qa" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <TestQA />
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/test-qa-cases" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <TestQACases />
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/manual-qa-test" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <ManualQATest />
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/feedback" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <FeedbackManagement />
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/quality-v3" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <AdminErrorBoundary>
                      <QualityV3 />
                    </AdminErrorBoundary>
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/benchmark" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <AdminErrorBoundary>
                      <BenchmarkV2 />
                    </AdminErrorBoundary>
                  </SimpleRoleGuard>
                </SimpleAuthGuard>
              } />
              <Route path="/admin/benchmark-v3" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <AdminErrorBoundary>
                      <BenchmarkV3 />
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
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;