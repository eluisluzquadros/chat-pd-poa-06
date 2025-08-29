
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export const BenefitsSection = () => {
  const benefits = [
    "Busca integrada em documentos oficiais da SMAMUS", 
    "Respostas baseadas em documentos oficiais", 
    "Atualização constante com novas diretrizes"
  ];

  return (
    <div className="mt-8 space-y-2">
      {benefits.map((benefit, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="flex items-center gap-2 text-gray-700 dark:text-gray-300"
        >
          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
          <span>{benefit}</span>
        </motion.div>
      ))}
    </div>
  );
};
