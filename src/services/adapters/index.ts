import { DifyAdapter } from './difyAdapter';
import { OpenAIAdapter } from './openaiAdapter';
import type { ChatAdapter } from './types';

export function getAdapterForAgent(provider: string): ChatAdapter {
  const normalizedProvider = provider?.toLowerCase() || 'dify';
  
  console.log(`🔌 [Adapter Factory] Selecting adapter for provider: ${normalizedProvider}`);
  
  switch (normalizedProvider) {
    case 'openai':
      console.log('✅ Using OpenAI Adapter');
      return new OpenAIAdapter();
    case 'dify':
    default:
      console.log('✅ Using Dify Adapter');
      return new DifyAdapter();
  }
}

export * from './types';
export { DifyAdapter } from './difyAdapter';
export { OpenAIAdapter } from './openaiAdapter';
