
import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TestimonialBadge } from "./TestimonialBadge";
import { StatsSection } from "./StatsSection";
import { toast } from "@/hooks/use-toast";

interface HeroContentProps {
  scrollToFeatures: () => void;
}

export const HeroContent = ({ scrollToFeatures }: HeroContentProps) => {
  const navigate = useNavigate();

  const placeholders = [
    "Como posso construir um prédio no bairro Moinhos de Vento?",
    "Quais são as regras para uso misto no Centro Histórico?",
    "Qual é a altura máxima permitida na Av. Ipiranga?",
    "Posso transformar uma casa em escritório na Av. Carlos Gomes?",
    "Quais são os índices construtivos no bairro Petrópolis?",
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, inputValue: string) => {
    e.preventDefault();
    if (inputValue.trim()) {
      // Store the query in localStorage
      localStorage.setItem('initialChatQuery', inputValue);
      // Navigate to chat page
      navigate("/chat");
    } else {
      toast({
        title: "Campo vazio",
        description: "Por favor, digite uma pergunta antes de enviar.",
        variant: "destructive",
      });
    }
  };

  const containerAnimation = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemAnimation = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="relative container mx-auto px-6 py-12 md:py-24">
      <motion.div
        variants={containerAnimation}
        initial="hidden"
        animate="visible"
        className="max-w-xl"
      >
        {/* Breadcrumb navigation */}
        <motion.div 
          variants={itemAnimation}
          className="mb-6 text-sm text-gray-600 dark:text-gray-400"
        >
          <span>Lançamento » Novo Plano Diretor de Porto Alegre: </span>
          <span className="text-primary">2025</span>
        </motion.div>
        
        {/* Main headline */}
        <motion.h1 
          variants={itemAnimation}
          className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight"
        >
          PDDUA ChatBot<br /> Porto Alegre
        </motion.h1>
        
        {/* Subheadline */}
        <motion.p 
          variants={itemAnimation}
          className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-lg"
        >
          Acelere análises da legislação e projetos para o planejamento urbano da cidade com nossa agente digital com IA.
        </motion.p>
       
        {/* Search input with vanishing animation */}
        <motion.div 
          variants={itemAnimation}
          className="mb-8"
        >
          <PlaceholdersAndVanishInput 
            placeholders={placeholders}
            onChange={handleChange}
            onSubmit={handleSubmit}
          />
        </motion.div>
        
        {/* CTA Buttons */}
        <motion.div 
          variants={itemAnimation}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Button 
            className="bg-primary hover:bg-primary/90 text-white font-medium px-8 py-6"
            onClick={() => navigate("/chat")}
          >
            Acessar Agora
          </Button>
          <Button 
            variant="outline" 
            className="border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            onClick={scrollToFeatures}
          >
            Saiba mais <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </motion.div>
        
        {/* Testimonial badge */}
        <TestimonialBadge />
      </motion.div>
      
      {/* Stats Section */}
      <StatsSection />
    </div>
  );
};
