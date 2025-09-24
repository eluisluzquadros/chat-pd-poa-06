import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DomainConfig } from '../../shared/schema';

interface DomainContextType {
  currentDomain: DomainConfig | null;
  availableDomains: DomainConfig[];
  isLoading: boolean;
  switchDomain: (domainId: string) => void;
  refreshDomains: () => void;
}

const DomainContext = createContext<DomainContextType | undefined>(undefined);

interface DomainProviderProps {
  children: ReactNode;
}

export function DomainProvider({ children }: DomainProviderProps) {
  const [currentDomain, setCurrentDomain] = useState<DomainConfig | null>(null);
  const [availableDomains, setAvailableDomains] = useState<DomainConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock domains para desenvolvimento - TODO: Substituir por API real
  const mockDomains: DomainConfig[] = [
    {
      id: 'plano-diretor-id',
      slug: 'plano-diretor',
      name: 'Plano Diretor',
      display_name: 'Plano Diretor de Porto Alegre',
      description: 'Consultas especializadas sobre o Plano Diretor de Desenvolvimento Urbano e Ambiental de Porto Alegre',
      icon: 'Building2',
      primary_color: '#29625D',
      secondary_color: '#1A4D47',
      logo_url: null,
      is_active: true,
      is_default: true,
      ui_config: {},
      agent_ids: [],
      routes: {},
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'plac-id', 
      slug: 'plac',
      name: 'PLAC',
      display_name: 'Plano de Ação Climática',
      description: 'Consultas especializadas sobre o Plano de Ação Climática de Porto Alegre',
      icon: 'Leaf',
      primary_color: '#22C55E',
      secondary_color: '#16A34A',
      logo_url: null,
      is_active: false,
      is_default: false,
      ui_config: {},
      agent_ids: [],
      routes: {},
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'licenciamento-id',
      slug: 'licenciamento-ambiental', 
      name: 'Licenciamento Ambiental',
      display_name: 'Licenciamento Ambiental',
      description: 'Consultas especializadas sobre licenciamento e regulamentação ambiental',
      icon: 'Shield',
      primary_color: '#3B82F6',
      secondary_color: '#2563EB',
      logo_url: null,
      is_active: false,
      is_default: false,
      ui_config: {},
      agent_ids: [],
      routes: {},
      created_at: new Date(),
      updated_at: new Date(),
    }
  ];

  const loadDomains = async () => {
    setIsLoading(true);
    try {
      // TODO: Implementar carregamento real via API
      // const domains = await fetchDomains();
      const domains = mockDomains;
      setAvailableDomains(domains);
      
      // Selecionar domínio padrão ou primeiro ativo
      const defaultDomain = domains.find(d => d.is_default && d.is_active) || 
                           domains.find(d => d.is_active) || 
                           domains[0];
      
      if (defaultDomain) {
        setCurrentDomain(defaultDomain);
        // Salvar no localStorage para persistência
        localStorage.setItem('currentDomain', defaultDomain.id);
      }
    } catch (error) {
      console.error('Error loading domains:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchDomain = (domainId: string) => {
    const domain = availableDomains.find(d => d.id === domainId);
    if (domain && domain.is_active) {
      setCurrentDomain(domain);
      localStorage.setItem('currentDomain', domainId);
    }
  };

  const refreshDomains = () => {
    loadDomains();
  };

  // Carregar domínios na inicialização
  useEffect(() => {
    loadDomains();
  }, []);

  // Restaurar domínio selecionado do localStorage
  useEffect(() => {
    const savedDomainId = localStorage.getItem('currentDomain');
    if (savedDomainId && availableDomains.length > 0) {
      const savedDomain = availableDomains.find(d => d.id === savedDomainId);
      if (savedDomain && savedDomain.is_active) {
        setCurrentDomain(savedDomain);
      }
    }
  }, [availableDomains]);

  return (
    <DomainContext.Provider value={{
      currentDomain,
      availableDomains,
      isLoading,
      switchDomain,
      refreshDomains
    }}>
      {children}
    </DomainContext.Provider>
  );
}

export function useDomain() {
  const context = useContext(DomainContext);
  if (context === undefined) {
    throw new Error('useDomain must be used within a DomainProvider');
  }
  return context;
}