import dotenv from 'dotenv';
import path from 'path';

// Load environment variables for tests
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise during tests
if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}

// Global test timeout
jest.setTimeout(30000);

// Add custom matchers
expect.extend({
  toContainTable(received: string) {
    const hasTable = received.includes('|') && 
                    received.split('\n').filter(line => line.includes('|')).length > 2;
    
    return {
      pass: hasTable,
      message: () => hasTable 
        ? `Expected response not to contain a table`
        : `Expected response to contain a table with | separators`,
    };
  },
  
  toBeValidZOTResponse(received: any) {
    const hasRequiredFields = 
      received.includes('Zona') &&
      received.includes('Altura') &&
      received.includes('Coeficiente');
    
    return {
      pass: hasRequiredFields,
      message: () => hasRequiredFields
        ? `Expected response not to be a valid ZOT response`
        : `Expected response to contain Zona, Altura, and Coeficiente information`,
    };
  }
});