import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Settings,
  FileText,
  Target,
  Microscope,
  Brain,
  Shield,
  Database,
  BarChart3,
  Cpu,
  BookOpen,
  FlaskConical
} from "lucide-react";

const adminNavItems = [
  { path: "/admin/dashboard", label: "Dashboard & Relatórios", icon: LayoutDashboard },
  { path: "/admin/users", label: "Usuários", icon: Users },
  { path: "/admin/observatory", label: "Observatório", icon: Microscope },
  { path: "/admin/playground", label: "Playground", icon: FlaskConical },
  { path: "/admin/agents-config", label: "Agentes", icon: Cpu },
  { path: "/admin/knowledge", label: "Base de Conhecimento", icon: BookOpen },
  { path: "/admin/monitoring", label: "Monitoramento", icon: Target },
  { path: "/admin/security", label: "Segurança", icon: Shield },
  { path: "/admin/data-import", label: "Importar Dados", icon: Database },
  { path: "/admin/settings", label: "Configurações", icon: Settings },
];

export function AdminNavigation() {
  const location = useLocation();

  return (
    <nav className="space-y-1">
      {adminNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
