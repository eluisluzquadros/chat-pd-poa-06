import { MessageCircleQuestion, FileSearch, BarChart, Check, Lock, Database } from "lucide-react";
import FeatureCard from "@/components/FeatureCard";
import { useNavigate } from "react-router-dom";
import { ExampleFeatureSection } from "./ExampleFeatureSection";
import { motion } from "framer-motion";

interface FeaturesProps {
  isAdminOrAnalyst: boolean;
}

export const Features = ({
  isAdminOrAnalyst
}: FeaturesProps) => {
  const navigate = useNavigate();
  
  const handleFeatureClick = (path: string) => {
    navigate(path);
  };
  
  const featuresList = [{
    title: "Passo 01: Cadastre-se",
    description: "Faça seu cadastro na plataforma e acesse a base de conhecimento atualizada de que você precisa.",
    icon: Check,
    color: "text-primary"
  }, {
    title: "Passo 02: Acesse o Novo Plano Diretor 2025",
    description: "Uma base de conhecimento atualizada contendo a legislação, guias e paineis sobre as novas regras de planejamento urbano da cidade.",
    icon: Lock,
    color: "text-primary"
  }, {
    title: "Passo 03: Converse com o PDDUA ChatBot",
    description: "Acelere a análise da legislação e a criação de projetos em planejamento urbano de Porto Alegre nosso ChatBot PDDUA.",
    icon: Database,
    color: "text-primary"
  }];
  
  return <>
      <section id="features" className="bg-white dark:bg-gray-900 py-[60px]">
        <div className="container mx-auto px-4">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6
        }} viewport={{
          once: true
        }} className="flex flex-col md:flex-row gap-10 mb-16">
            {/* Image now positioned on the left */}
            <motion.div initial={{
            opacity: 0,
            x: -50 // Changed from 50 to -50 to animate from left
          }} whileInView={{
            opacity: 1,
            x: 0
          }} transition={{
            duration: 0.8
          }} viewport={{
            once: true
          }} className="md:w-1/2 bg-primary/10 rounded-2xl overflow-hidden order-2 md:order-1">
              <img alt="Feature screenshot" className="w-full h-auto" src="https://cdn.midjourney.com/3b563b55-c39a-4f59-b110-82d75ac11bc2/0_3.png" />
            </motion.div>
            
            {/* Content now positioned on the right */}
            <div className="md:w-1/2 order-1 md:order-2">
              <span className="text-primary font-medium text-sm mb-3 block">PDDUA ChatBot</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">Conheça o novo PDDUA</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                Desenvolvemos inovações no Plano Diretor de Porto Alegre para facilitar o acesso à informação, promovendo transparência e engajamento da comunidade nas decisões urbanas.
              </p>
              
              <div className="space-y-8">
                {featuresList.map((feature, idx) => <motion.div key={idx} initial={{
                opacity: 0,
                y: 20
              }} whileInView={{
                opacity: 1,
                y: 0
              }} transition={{
                duration: 0.5,
                delay: 0.1 * idx
              }} viewport={{
                once: true
              }} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
                        <feature.icon className="w-6 h-6" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                      <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                    </div>
                  </motion.div>)}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>;
};
