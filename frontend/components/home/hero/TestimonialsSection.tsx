
import { Star, Users } from "lucide-react";

interface Testimonial {
  name: string;
  title: string;
  text: string;
  stars: number;
}

export const TestimonialsSection = () => {
  const testimonials: Testimonial[] = [
    {
      name: "Marcos Silva",
      title: "Arquiteto",
      text: "A Urbanista Digital reduziu meu tempo de pesquisa de legislação urbana em 80%. Consigo validar conceitos de projeto muito mais rápido agora.",
      stars: 5,
    },
    {
      name: "Julia Pereira",
      title: "Engenheira Civil",
      text: "Impressionante a precisão das respostas. Me ajudou a resolver situações complexas de zoneamento em minutos.",
      stars: 5,
    },
    {
      name: "Carlos Mendes",
      title: "Empreendedor Imobiliário",
      text: "Ferramenta essencial para quem trabalha com desenvolvimento urbano em Porto Alegre. Economizamos semanas de trabalho.",
      stars: 5,
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">O que nossos usuários dizem</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md">
              <div className="flex mb-4">
                {[...Array(testimonial.stars)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4 italic">"{testimonial.text}"</p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                  {testimonial.name.substring(0, 1)}
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900 dark:text-white">{testimonial.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-gray-700 dark:text-gray-200 font-medium">Mais de 500 profissionais confiam na Urbanista Digital</span>
          </div>
        </div>
      </div>
    </section>
  );
};
