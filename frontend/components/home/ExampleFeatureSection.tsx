
import { FeatureSection } from "@/components/ui/feature-section";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export const ExampleFeatureSection = () => {
  const navigate = useNavigate();

  const sectionVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.8,
        when: "beforeChildren",
      }
    }
  };

  return (
    <>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={sectionVariants}
      >
        <FeatureSection
          title="Agilize suas consultas urbanísticas"
          description="Nossa plataforma integra inteligência artificial com a legislação urbana de Porto Alegre para fornecer respostas precisas e detalhadas em segundos, economizando horas de pesquisa manual."
          imageSrc="https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&q=80"
          imageAlt="Profissional de arquitetura consultando planos no tablet"
          buttonText="Experimente Agora"
          buttonAction={() => navigate("/chat")}
          imagePosition="left"
          variant="light"
        />
      </motion.div>
      
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={sectionVariants}
      >
        <FeatureSection
          title="Análise inteligente de zoneamento"
          description="Compreenda rapidamente os parâmetros urbanísticos aplicáveis a qualquer lote em Porto Alegre, incluindo índices construtivos, recuos e usos permitidos, sem precisar navegar por múltiplos documentos."
          imageSrc="https://images.unsplash.com/photo-1460574283810-2aab119d8511?auto=format&fit=crop&q=80"
          imageAlt="Mapa de zoneamento urbano"
          buttonText="Ver Demonstração"
          buttonAction={() => navigate("/explorer")}
          imagePosition="right"
          variant="gradient"
        />
      </motion.div>
    </>
  );
};
