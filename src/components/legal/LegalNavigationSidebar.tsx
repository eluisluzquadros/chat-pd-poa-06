import { FileText, Shield, Cookie } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface LegalNavigationSidebarProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

const sections: NavigationItem[] = [
  { id: 'terms', label: 'Termos de Uso', icon: FileText },
  { id: 'privacy', label: 'Privacidade', icon: Shield },
  { id: 'cookies', label: 'Cookies', icon: Cookie }
];

export const LegalNavigationSidebar = ({ activeSection, onNavigate }: LegalNavigationSidebarProps) => {
  return (
    <nav className="w-48 flex-shrink-0 border-r pr-4" aria-label="Navegação de documentos legais">
      <div className="sticky top-0 space-y-2">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          
          return (
            <button
              key={section.id}
              onClick={() => onNavigate(section.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left",
                isActive 
                  ? "bg-primary text-primary-foreground font-medium" 
                  : "hover:bg-muted text-muted-foreground"
              )}
              aria-current={isActive ? 'true' : 'false'}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{section.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
