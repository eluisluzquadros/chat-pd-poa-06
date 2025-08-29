export class MultiLLMService {
  async processQuery() {
    return { response: 'Service temporarily disabled' };
  }

  async processMessage() {
    return { response: 'Service temporarily disabled' };
  }
}

export const multiLLMService = new MultiLLMService();