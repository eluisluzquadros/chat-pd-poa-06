
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
const workCategories = [{
  id: "core-ai",
  tag: "Core AI",
  title: "Respostas precisas e rápidas",
  description: "Obtenha respostas instantâneas sobre regulamentações urbanas sem precisar navegar por documentos extensos.",
  image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf"
}, {
  id: "analytics",
  tag: "Visualização",
  title: "Contextualização visual",
  description: "Mapas integrados e visualizações 3D ajudam a entender o impacto das regulamentações no seu projeto.",
  image: "https://cdn.midjourney.com/923c4e14-67fc-431f-81ea-9052c2b30e3f/0_0.png"
}, {
  id: "updates",
  tag: "Atualização",
  title: "Sempre atualizado",
  description: "Nossa base de dados é constantemente atualizada com as últimas alterações na legislação urbana de Porto Alegre.",
  image: "https://cdn.midjourney.com/d520d840-203e-43df-a4ae-862f3cea7188/0_0.png"
}, {
  id: "integration",
  tag: "Integração",
  title: "Integração com seu fluxo de trabalho",
  description: "Exporte dados e relatórios para integrar facilmente com suas ferramentas de projeto e planejamento.",
  image: "https://cdn.midjourney.com/05e5a2c5-5f27-4ac7-9ee2-1ba2ee4a0a04/0_0.png"
}];
export const WorkShowcase = () => {
  const [activeCategory, setActiveCategory] = useState(workCategories[0]);
  return <section className="py-24 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start mb-12">
          <div>
            <motion.span initial={{
            opacity: 0,
            y: 10
          }} whileInView={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.5
          }} viewport={{
            once: true
          }} className="text-sm text-gray-600 dark:text-gray-400 block mb-3">
              Nossa plataforma foi desenvolvida para tornar o processo de consulta e análise de legislação urbana muito mais eficiente
            </motion.span>
            
            <motion.h2 initial={{
            opacity: 0,
            y: 10
          }} whileInView={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.5,
            delay: 0.1
          }} viewport={{
            once: true
          }} className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">Por que escolher o PDDUA ChatBot</motion.h2>
          </div>
          
          <motion.div initial={{
          opacity: 0,
          y: 10
        }} whileInView={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: 0.2
        }} viewport={{
          once: true
        }} className="mt-6 md:mt-0">
            <Button variant="outline" className="rounded-full">
              Ver mais cases <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        </div>
        
        {/* Case studies gallery */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold mb-10 text-gray-900 dark:text-white">Estudos de caso</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {workCategories.map(category => <motion.div key={category.id} initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.5
          }} viewport={{
            once: true
          }} className="bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300" onClick={() => setActiveCategory(category)}>
                <div className="p-4 pb-0">
                  <div className="h-48 rounded-lg overflow-hidden bg-gray-200 mb-4">
                    <img src={category.image} alt={category.title} className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105" />
                  </div>
                </div>
                
                <div className="p-6">
                  <span className="inline-block px-3 py-1 bg-black text-white text-xs font-medium rounded-full mb-2">
                    {category.tag}
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{category.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{category.description}</p>
                  <Button variant="link" className="p-0 h-auto font-medium text-black dark:text-white flex items-center">
                    Saiba mais <ArrowRight className="ml-1 w-4 h-4" />
                  </Button>
                </div>
              </motion.div>)}
          </div>
        </div>
      </div>
    </section>;
};
