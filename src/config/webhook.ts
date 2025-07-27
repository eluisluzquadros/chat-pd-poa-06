export const WEBHOOK_CONFIG = {
  N8N_WEBHOOK_URL: 'https://n8n.srv921508.hstgr.cloud/webhook/chat-pd-poa',
  TIMEOUT_MS: 30000, // 30 seconds
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY_MS: 1000, // 1 second
} as const;

export const WEBHOOK_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
} as const;