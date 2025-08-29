
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InterestForm } from "@/components/auth/InterestForm";

export const WaitlistSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };
  
  return (
    <section className="py-20 bg-gray-900 text-white">
      <div className="container mx-auto px-4 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold mb-6"
        >
          Fique por dentro das novidades sobre o Plano Diretor
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="text-gray-300 max-w-xl mx-auto mb-8"
        >
          Cadastre-se gratuitamente para entrar na lista de espera de novos usuários e fique atualizado em relação às novas diretrizes do planejamento urbano de Porto Alegre.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="max-w-md mx-auto"
        >
          <Button 
            onClick={handleOpenModal} 
            className="w-full md:w-auto bg-white text-gray-900 hover:bg-gray-100"
          >
            Quero me cadastrar
          </Button>
        </motion.div>
      </div>
      
      {/* Interest Form Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastre seu interesse</DialogTitle>
            <DialogDescription>
              Preencha o formulário abaixo para receber novidades sobre o Plano Diretor de Porto Alegre.
            </DialogDescription>
          </DialogHeader>
          <InterestForm onClose={handleCloseModal} />
        </DialogContent>
      </Dialog>
    </section>
  );
};
