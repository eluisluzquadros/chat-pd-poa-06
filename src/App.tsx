import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "./components/ui/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";

// Pages
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import DemoLogin from "./pages/DemoLogin";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import UserManagement from "./pages/admin/UserManagement";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Quality from "./pages/admin/Quality";
import UserSettings from "./pages/UserSettings";
import Reports from "./pages/Reports";

// Components
import { SimpleAuthGuard } from "./components/SimpleAuthGuard";
import { SimpleRoleGuard } from "./components/SimpleRoleGuard";
import ChatHistorySync from "./components/ChatHistorySync";
import { AuthSyncComponent } from "./components/AuthSyncComponent";

// Create a new query client instance
const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider defaultTheme="dark" attribute="class" enableSystem={false} storageKey="urbanista-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            {/* Componente para sincronizar a autenticação */}
            <AuthSyncComponent />
            
            {/* Componente para sincronizar o histórico de chat */}
            <ChatHistorySync />
            
            <Routes>
              {/* Redirecionar a rota inicial para a autenticação */}
              <Route path="/" element={<Navigate to="/auth" replace />} />
              
              {/* Modo demo para testes */}
              <Route path="/demo" element={<DemoLogin />} />
              
              {/* Página de autenticação como página principal */}
              <Route path="/auth" element={<Auth />} />
              
              {/* Página de callback para OAuth */}
              <Route path="/auth/callback" element={<AuthCallback />} />
              
              {/* Rotas desabilitadas - redirecionam para autenticação */}
              <Route path="/explorer" element={<Navigate to="/auth" replace />} />
              <Route path="/insights" element={<Navigate to="/auth" replace />} />
              
              {/* Basic authenticated routes */}
              <Route path="/chat" element={<SimpleAuthGuard><Chat /></SimpleAuthGuard>} />
              <Route path="/settings" element={<SimpleAuthGuard><UserSettings /></SimpleAuthGuard>} />
              
              {/* Admin routes */}
              <Route path="/admin/dashboard" element={
                <SimpleAuthGuard>
                  <SimpleRoleGuard adminOnly={true}>
                    <AdminDashboard />
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
                    <Quality />
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