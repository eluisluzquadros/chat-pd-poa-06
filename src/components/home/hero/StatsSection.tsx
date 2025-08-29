
import { motion } from "framer-motion";

export const StatsSection = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { 
        duration: 0.6 
      }
    }
  };

  return (
    <div className="container mx-auto px-6 relative z-10 mt-8 mb-12">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        className="flex flex-wrap justify-start max-w-4xl gap-8 md:gap-12"
      >
        <motion.div 
          variants={itemVariants}
          className="flex flex-col"
        >
          <h3 className="text-3xl md:text-4xl font-bold mb-1 dark:text-white">
            95%
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Alta precisão em respostas</p>
        </motion.div>
        
        <motion.div 
          variants={itemVariants}
          className="flex flex-col"
        >
          <h3 className="text-3xl md:text-4xl font-bold mb-1 dark:text-white">
            500+
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Acessos diários</p>
        </motion.div>
        
        <motion.div 
          variants={itemVariants}
          className="flex flex-col"
        >
          <h3 className="text-3xl md:text-4xl font-bold mb-1 dark:text-white">
            100%
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Oficial via SMAMUS-PMPOA</p>
        </motion.div>
      </motion.div>
    </div>
  );
};
