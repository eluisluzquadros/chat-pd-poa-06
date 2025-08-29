import OpenAI from 'openai';

const OPENAI_KEY = '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';

const openai = new OpenAI({
  apiKey: OPENAI_KEY
});

async function testOpenAI() {
  console.log('🔑 Testando API Key do OpenAI...\n');
  
  try {
    console.log('📝 Teste: Gerando embedding...');
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: 'Teste de API key do OpenAI'
    });
    
    if (embedding.data && embedding.data[0].embedding) {
      console.log('✅ API Key válida! Embedding gerado com sucesso!');
      console.log(`   Dimensões: ${embedding.data[0].embedding.length}`);
      return true;
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

testOpenAI();
