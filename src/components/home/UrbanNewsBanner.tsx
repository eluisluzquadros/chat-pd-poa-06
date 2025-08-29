import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
interface NewsItem {
  title: string;
  description: string;
  image: string;
}
export const UrbanNewsBanner = () => {
  const newsItems: NewsItem[] = [{
    title: "Novo Plano Diretor de Desenvolvimento Urbano de Porto Alegre 2025",
    description: "Encontre aqui as grances novidades sobre a nova forma de pensar o planejamento urbano de nossa cidade.",
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d"
  }, {
    title: "Painel comparativo de alterações entre o PDDU antigo e o atual",
    description: "Acesse nosso dashboard interativo que ajuda a demonstrar o antes e o depois.",
    image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952"
  }, {
    title: "PDDUA ChatBot chegou!",
    description: "Agora você pode conversar com uma Agente Digital que sabe tudo sobre as regras do planejamento urbano de Porto Alegre.",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e"
  }];
  return <section className="py-16 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="bg-primary rounded-2xl overflow-hidden mb-12">
          <div className="p-12 md:p-16 flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <motion.span initial={{
              opacity: 0,
              y: 10
            }} whileInView={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.4
            }} viewport={{
              once: true
            }} className="inline-block text-white/80 text-sm mb-3">
                Novo PDDUA
              </motion.span>
              
              <motion.h2 initial={{
              opacity: 0,
              y: 10
            }} whileInView={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.4,
              delay: 0.1
            }} viewport={{
              once: true
            }} className="text-3xl md:text-4xl font-bold text-white mb-4">
                Novo Plano Diretor de Porto Alegre
              </motion.h2>
              
              <motion.p initial={{
              opacity: 0,
              y: 10
            }} whileInView={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.4,
              delay: 0.2
            }} viewport={{
              once: true
            }} className="text-white/80 mb-6">
                O novo Plano Diretor de Porto Alegre é crucial para o desenvolvimento sustentável, promovendo a integração urbana e a qualidade de vida da população.
              </motion.p>
              
              <motion.div initial={{
              opacity: 0,
              y: 10
            }} whileInView={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.4,
              delay: 0.3
            }} viewport={{
              once: true
            }} className="mb-4">
                <p className="text-white/90 text-xs">Descubra as novas regras urbanas e como usar o PDDUA ChatBot para facilitar consultas diárias</p>
              </motion.div>
              
              <motion.div initial={{
              opacity: 0,
              y: 10
            }} whileInView={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.4,
              delay: 0.4
            }} viewport={{
              once: true
            }}>
                <Button className="bg-white text-primary hover:bg-white/90">
                  Acesse agora
                </Button>
              </motion.div>
            </div>
            
            <motion.div initial={{
            opacity: 0,
            x: 40
          }} whileInView={{
            opacity: 1,
            x: 0
          }} transition={{
            duration: 0.6,
            delay: 0.3
          }} viewport={{
            once: true
          }} className="md:w-1/2 flex justify-center">
              <img src="https://cdn.midjourney.com/10d4150d-0bc2-4c44-b04c-f4fcb835f9dc/0_0.png" alt="AI Strategy Guide" className="max-w-full h-auto" />
            </motion.div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {newsItems.map((item, idx) => <motion.div key={idx} initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: idx * 0.1
        }} viewport={{
          once: true
        }} className="group">
              <div className="overflow-hidden rounded-lg mb-4">
                <img src={item.image} alt={item.title} className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{item.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-3">{item.description}</p>
              <a href="#" className="text-primary hover:underline text-sm font-medium">Read more</a>
            </motion.div>)}
        </div>
      </div>
    </section>;
};