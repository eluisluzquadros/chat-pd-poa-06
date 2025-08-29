
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { originalMessage, response, context } = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) throw new Error('OpenAI API key not configured');

    const evaluationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are an evaluation agent that assesses the quality and relevance of responses.
                     Consider accuracy, completeness, and alignment with the original query.`
          },
          {
            role: 'user',
            content: `Evaluate this response:
                     Original Query: ${originalMessage}
                     Response: ${response}
                     Context Used: ${context.join('\n')}
                     
                     Provide evaluation as JSON with:
                     - quality (1-10)
                     - feedback (string)
                     - satisfactory (boolean)`
          }
        ],
      }),
    });

    const data = await evaluationResponse.json();
    const evaluation = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(evaluation), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
