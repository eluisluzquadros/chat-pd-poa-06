import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KnowledgeGap {
  id?: string;
  category: string;
  topic: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  failedTests?: any[];
  failed_query?: string;
  actual_answer?: string;
  confidence_score?: number;
  suggestedAction?: string;
  suggested_action?: string;
}

interface ContentGenerationRequest {
  gapId: string;
  includeExamples?: boolean;
  targetAudience?: 'general' | 'technical' | 'admin';
  contentLength?: 'brief' | 'detailed' | 'comprehensive';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { gap, action, gapId, options } = body;

    console.log(`Knowledge Updater: Processing ${action} for ${gap?.topic || gapId}`);

    let result;

    switch (action) {
      case 'analyze_and_suggest':
        result = await analyzeGapAndSuggestContent(gap, supabase);
        break;
      
      case 'generate_content':
        result = await generateMissingContent(gap || await getGapById(supabase, gapId), supabase, options);
        break;
      
      case 'update_embeddings':
        result = await updateKnowledgeBase(gap || await getGapById(supabase, gapId), supabase);
        break;

      case 'approve_content':
        result = await approveAndIntegrateContent(body.contentId, supabase);
        break;

      case 'reject_content':
        result = await rejectContent(body.contentId, body.reason, supabase);
        break;

      case 'auto_resolve_gap':
        result = await autoResolveGap(gapId, supabase);
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({
      success: true,
      action,
      result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Knowledge Updater error:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getGapById(supabase: any, gapId: string): Promise<KnowledgeGap> {
  const { data, error } = await supabase
    .from('knowledge_gaps')
    .select('*')
    .eq('id', gapId)
    .single();

  if (error) throw new Error(`Gap not found: ${error.message}`);
  return data;
}

async function analyzeGapAndSuggestContent(gap: KnowledgeGap, supabase: any) {
  // Analyze the failed tests to understand what's missing
  const failedQuestions = gap.failedTests.map(test => test.question);
  const expectedAnswers = gap.failedTests.map(test => test.expected_answer);
  
  // Search for existing documents that might be related
  const searchQuery = `${gap.topic} ${gap.category}`;
  
  const { data: existingDocs } = await supabase
    .from('documents')
    .select('id, content, metadata')
    .textSearch('content', searchQuery)
    .limit(5);

  // Use OpenAI to analyze the gap and suggest content
  const prompt = `
Analyze the following knowledge gap in our Plano Diretor documentation:

Topic: ${gap.topic}
Category: ${gap.category}
Severity: ${gap.severity}

Failed Questions:
${failedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Expected Answers:
${expectedAnswers.map((a, i) => `${i + 1}. ${a}`).join('\n')}

Existing Related Content:
${existingDocs?.map(doc => doc.content.substring(0, 200)).join('\n\n') || 'None found'}

Provide:
1. A diagnosis of what specific information is missing
2. Suggested content to add (in Portuguese)
3. Where this content should be placed in the knowledge base
4. Any cross-references needed with existing content
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in urban planning and the Porto Alegre Plano Diretor. Analyze knowledge gaps and suggest specific content improvements.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  const analysis = data.choices[0].message.content;

  // Store the analysis
  await supabase
    .from('knowledge_gap_analysis')
    .insert({
      gap_id: `${gap.category}-${gap.topic}`,
      category: gap.category,
      topic: gap.topic,
      severity: gap.severity,
      analysis,
      failed_test_count: gap.failedTests.length,
      suggested_action: gap.suggestedAction,
      status: 'analyzed'
    });

  return {
    analysis,
    existingDocCount: existingDocs?.length || 0,
    suggestedNextStep: gap.severity === 'critical' ? 'generate_content' : 'review_manually'
  };
}

async function generateMissingContent(gap: KnowledgeGap, supabase: any) {
  // Generate the missing content based on the analysis
  const prompt = `
Generate comprehensive content in Portuguese for the Porto Alegre Plano Diretor to address the following knowledge gap:

Topic: ${gap.topic}
Category: ${gap.category}

The content should specifically answer these questions:
${gap.failedTests.map(test => `
Q: ${test.question}
Expected A: ${test.expected_answer}
`).join('\n')}

Generate structured content that:
1. Is factually accurate and based on urban planning best practices
2. Uses clear, accessible Portuguese
3. Includes specific details, numbers, and regulations where applicable
4. Follows the style of official planning documents

Format the content with clear sections and subsections.
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert urban planner writing official documentation for the Porto Alegre Plano Diretor. Generate accurate, comprehensive content in Portuguese.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
    }),
  });

  const data = await response.json();
  const generatedContent = data.choices[0].message.content;

  // Store the generated content for review
  const { data: savedContent } = await supabase
    .from('pending_knowledge_updates')
    .insert({
      category: gap.category,
      topic: gap.topic,
      content: generatedContent,
      gap_severity: gap.severity,
      status: 'pending_review',
      generated_at: new Date().toISOString()
    })
    .select()
    .single();

  return {
    contentId: savedContent.id,
    contentPreview: generatedContent.substring(0, 500),
    status: 'pending_review',
    message: 'Content generated successfully. Pending human review before adding to knowledge base.'
  };
}

async function updateKnowledgeBase(gap: KnowledgeGap, supabase: any) {
  // This would be called after human review to actually update the knowledge base
  // For now, we'll create a placeholder that shows the process
  
  return {
    status: 'requires_manual_approval',
    message: 'Knowledge base updates require manual approval. Use the admin interface to review and approve pending updates.',
    pendingUpdates: gap.failedTests.length
  };
}

// Helper function to create embeddings for new content
async function createEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  const data = await response.json();
  return data.data[0].embedding;
}