
import { DocumentCard } from "@/components/DocumentCard";
import { cn } from "@/lib/utils";
import type { Document } from "@/types/documents";
import { motion } from "framer-motion";

interface DocumentListProps {
  documents: Document[];
  viewMode: "grid" | "list";
  onDocumentDelete: () => void;
}

export function DocumentList({ documents, viewMode, onDocumentDelete }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhum documento encontrado</h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Tente ajustar os filtros ou realizar uma nova busca.
        </p>
      </div>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className={cn(
        viewMode === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6" 
          : "space-y-6"
      )}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {documents.map((doc) => (
        <motion.div key={doc.id} variants={item} className="h-full">
          <DocumentCard 
            document={doc}
            onDelete={onDocumentDelete}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
