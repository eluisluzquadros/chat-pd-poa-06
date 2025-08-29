
import { motion } from "framer-motion";

const testimonials = [
  {
    quote: "Laborum quis quam. Dolorem et ut quod quis. Voluptas numquam delectus nihil. Aut enim doloremque et ipsam.",
    name: "Leslie Alexander",
    handle: "@lesliealexander",
    image: "https://randomuser.me/api/portraits/women/45.jpg"
  },
  {
    quote: "Excepteur consectetur deserunt id incididunt veniam mollit officia sint qui quis quia sit cillum. Reprehenderit fugiat amet aliqua in commodo minim sunt laborum.",
    name: "Lindsay Walton",
    handle: "@lindsaywalton",
    image: "https://randomuser.me/api/portraits/women/28.jpg"
  },
  {
    quote: "Voluptas quos itaque quam in voluptatem est. Iste eos blanditiis repudiandae. Earum deserunt enim molestias ipsum perferendis.",
    name: "Whitney Francis",
    handle: "@whitneyfrancis",
    image: "https://randomuser.me/api/portraits/women/6.jpg"
  },
  {
    quote: "Anim sit consequat culpa commodo eu do nisi commodo ut quis aliqua. Laborum esse quis tempor consectetur officia mollit fugiat. Exercitation qui elit minim quis fugiat ex.",
    name: "Michael Foster",
    handle: "@michaelfoster",
    image: "https://randomuser.me/api/portraits/men/41.jpg"
  },
  {
    quote: "Distinctio facere aliquam est qui atque sint molestias ut. Fuga consequatur asperiores voluptatum ipsum.",
    name: "Courtney Henry",
    handle: "@courtneyhenry",
    image: "https://randomuser.me/api/portraits/women/52.jpg"
  },
  {
    quote: "Aliquid dolore praesentium ratione. Cumque ea officia repellendus laboriosam. Vitae quod id explicabo non sunt.",
    name: "Leonard Krasner",
    handle: "@leonardkrasner",
    image: "https://randomuser.me/api/portraits/men/22.jpg"
  }
];

export const TestimonialsGrid = () => {
  return (
    <section className="py-20 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary text-sm font-medium">Avaliações</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 text-gray-900 dark:text-white">
            Trabalhamos com <br /> milhares de pessoas incríveis
          </h2>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <p className="text-gray-600 dark:text-gray-300 italic mb-6">"{testimonial.quote}"</p>
              <div className="flex items-center">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name}
                  className="w-10 h-10 rounded-full mr-3"
                />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{testimonial.name}</h4>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">{testimonial.handle}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
