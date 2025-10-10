export interface RetrievalResult {
  text: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface RetrievalRequest {
  query: string;
  topK?: number;
  scoreThreshold?: number;
}

export interface KnowledgeBaseConfig {
  index_id?: string;
  api_key_secret_name?: string;
  endpoint?: string;
  [key: string]: any;
}

export interface RetrievalSettings {
  top_k: number;
  score_threshold: number;
  [key: string]: any;
}

export abstract class KnowledgeBaseAdapter {
  protected config: KnowledgeBaseConfig;
  protected retrievalSettings: RetrievalSettings;
  protected apiKey: string;

  constructor(
    config: KnowledgeBaseConfig,
    retrievalSettings: RetrievalSettings,
    apiKey: string
  ) {
    this.config = config;
    this.retrievalSettings = retrievalSettings;
    this.apiKey = apiKey;
  }

  abstract retrieve(request: RetrievalRequest): Promise<RetrievalResult[]>;
  abstract testConnection(): Promise<boolean>;
}
