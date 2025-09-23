import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables for tests
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test setup
beforeAll(async () => {
  // Ensure required environment variables are present
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  console.log('🚀 Iniciando configuração dos testes RAG...');
  
  // Test Supabase connection
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    // Test basic connectivity
    const { data, error } = await supabase
      .from('document_metadata')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.warn(`⚠️ Aviso: Problema de conectividade com Supabase: ${error.message}`);
    } else {
      console.log('✅ Conexão com Supabase estabelecida');
    }
  } catch (error) {
    console.warn(`⚠️ Aviso: Não foi possível testar conectividade: ${error.message}`);
  }
  
  console.log('✅ Configuração dos testes concluída\n');
});

// Global test teardown
afterAll(async () => {
  console.log('\n🧹 Limpeza final dos testes...');
  console.log('✅ Limpeza concluída');
});

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
  },

  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toContainKeywords(received: string, keywords: string[]) {
    const lowerReceived = received.toLowerCase();
    const foundKeywords = keywords.filter(keyword => 
      lowerReceived.includes(keyword.toLowerCase())
    );
    
    const pass = foundKeywords.length >= Math.ceil(keywords.length / 2);
    
    if (pass) {
      return {
        message: () => `expected "${received}" not to contain at least half of keywords: ${keywords.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected "${received}" to contain at least half of keywords: ${keywords.join(', ')}. Found: ${foundKeywords.join(', ')}`,
        pass: false,
      };
    }
  },

  toHaveValidRAGResponse(received: any) {
    const isValid = received &&
                   typeof received === 'object' &&
                   typeof received.response === 'string' &&
                   received.response.length > 0 &&
                   typeof received.confidence === 'number' &&
                   received.confidence >= 0 &&
                   received.confidence <= 1;

    if (isValid) {
      return {
        message: () => `expected response not to be a valid RAG response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected response to be a valid RAG response with response string and confidence number`,
        pass: false,
      };
    }
  }
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toContainTable(): R;
      toBeValidZOTResponse(): R;
      toBeWithinRange(floor: number, ceiling: number): R;
      toContainKeywords(keywords: string[]): R;
      toHaveValidRAGResponse(): R;
    }
  }
}