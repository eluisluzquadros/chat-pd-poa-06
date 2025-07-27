import { Link } from "react-router-dom";
import { Instagram } from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";
export const Footer = () => {
  const {
    theme
  } = useTheme();
  return <footer className="w-full border-t border-gray-100 py-10 mt-auto bg-white dark:bg-[#1a2928] dark:border-dark-green/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
          {/* Logo do Plano Diretor - Esquerda */}
          <div className="col-span-1 md:col-span-4">
            <Link to="/" className="flex items-center mb-4">
              {theme === 'dark' ? <img src="/lovable-uploads/9138fd22-514b-41ba-9317-fecb0bacad7d.png" alt="Plano Diretor de Porto Alegre - Modo Escuro" className="h-14 md:h-16" /> : <img src="/lovable-uploads/9c959472-19d4-4cc4-9f30-354a6c05be72.png" alt="Plano Diretor de Porto Alegre" className="h-14 md:h-16" />}
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 max-w-sm">
              Navegue, analise e obtenha respostas instantâneas sobre o Plano Diretor usando nossa plataforma alimentada por IA.
            </p>
            <Link to="/chat" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/90 transition-colors font-medium dark:text-light-green dark:hover:text-light-green/80">
              Faça sua primeira pergunta <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Links - Centro */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-3">Recursos</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/features" className="text-gray-600 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-light-green">Relatórios</Link></li>
              <li><Link to="/solutions" className="text-gray-600 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-light-green">Aplicação</Link></li>
              <li><Link to="/pricing" className="text-gray-600 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-light-green">Equipe</Link></li>
            </ul>
          </div>

          <div className="col-span-1 md:col-span-2">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-3">Institucional</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="text-gray-600 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-light-green">PMPA</Link></li>
              <li><Link to="/careers" className="text-gray-600 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-light-green">SMAMUS</Link></li>
              <li><Link to="/contact" className="text-gray-600 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-light-green">Contato</Link></li>
            </ul>
          </div>
          
          {/* Logo da Prefeitura - Direita */}
          <div className="col-span-1 md:col-span-4 flex md:justify-end items-start">
            <Link to="/" className="block">
              {theme === 'dark' ? <img src="/lovable-uploads/ea243044-6006-46b3-840a-a280efc7a4d3.png" alt="Prefeitura de Porto Alegre" className="h-16 md:h-20" /> : <img alt="Prefeitura de Porto Alegre" className="h-16 md:h-20" src="/lovable-uploads/92d655e9-31a7-48af-ac30-945a36398aad.png" />}
            </Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-col md:flex-row items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-4 md:mb-0">
            <span>© 2025 ChatPDPOA. Todos os direitos reservados.</span>
            <div className="hidden md:flex items-center gap-3">
              <span>•</span>
              <Link to="/privacy" className="hover:text-primary dark:hover:text-light-green transition-colors">Privacidade</Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-primary dark:hover:text-light-green transition-colors">Termos</Link>
              <span>•</span>
              <Link to="/security" className="hover:text-primary dark:hover:text-light-green transition-colors">Segurança</Link>
            </div>
          </div>
          
          {/* Links de rodapé em dispositivos móveis */}
          <div className="flex md:hidden items-center gap-4 text-xs mb-4">
            <Link to="/privacy" className="text-gray-500 hover:text-primary dark:hover:text-light-green transition-colors">Privacidade</Link>
            <Link to="/terms" className="text-gray-500 hover:text-primary dark:hover:text-light-green transition-colors">Termos</Link>
            <Link to="/security" className="text-gray-500 hover:text-primary dark:hover:text-light-green transition-colors">Segurança</Link>
          </div>
          
          <div className="flex items-center gap-4">
            <a href="https://instagram.com/urbanizeai" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-light-green" aria-label="Siga-nos no Instagram">
              <Instagram className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>;
};