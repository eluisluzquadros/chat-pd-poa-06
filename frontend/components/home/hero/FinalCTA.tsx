
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export const FinalCTA = () => {
  const navigate = useNavigate();
  
  return (
    <section className="py-16 bg-primary text-white">
      <div className="container mx-auto px-4 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold mb-6"
        >
          Desbloqueie o potencial do seu planejamento urbano
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="text-white/80 max-w-xl mx-auto mb-8"
        >
          Junte-se a centenas de profissionais que já estão economizando tempo e tomando melhores decisões com a UrbanizeAI.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <Button 
            onClick={() => navigate("/chat")}
            className="bg-white text-primary hover:bg-white/90"
          >
            Experimente a Urbanista Digital
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
