// RAG Configuration for Dify Integration
export const ragConfig = {
  useDify: import.meta.env.VITE_USE_DIFY_RAG === 'true',
  difyEndpoint: 'agentic-rag-dify',
  localEndpoint: 'agentic-rag'
} as const;

export const getRagEndpoint = () => {
  return ragConfig.useDify ? ragConfig.difyEndpoint : ragConfig.localEndpoint;
};