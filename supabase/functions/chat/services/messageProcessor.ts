
import { ChatResponse } from "../types.ts";
import { cleanResponseText, openAIRequest, verifyThread, createThread } from "./openai.ts";
import { waitForRunCompletion } from "./runCompletions.ts";

// Process user message and get AI response
export async function processUserMessage(
  message: string,
  sessionId: string | null,
  assistantId: string,
  apiKey: string
): Promise<ChatResponse> {
  console.log(`📩 Message received: "${message}" (Session: ${sessionId || "New"})`);

  let threadId: string;

  try {
    // If sessionId is provided, retrieve the associated OpenAI thread_id
    if (sessionId) {
      console.log("📋 Looking up OpenAI thread for session:", sessionId);
      
      // Get the OpenAI thread_id from the database
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .select('openai_thread_id')
        .eq('id', sessionId)
        .maybeSingle();
        
      if (error || !session?.openai_thread_id) {
        console.log("❌ No OpenAI thread found for session, creating new thread");
        threadId = await createThread(apiKey);
        
        // Update the session with the new thread_id
        await supabase
          .from('chat_sessions')
          .update({ openai_thread_id: threadId })
          .eq('id', sessionId);
          
        console.log("✅ New thread created and saved:", threadId);
      } else {
        threadId = session.openai_thread_id;
        console.log("✅ Using existing OpenAI thread:", threadId);
        
        // Validate if the thread still exists
        try {
          await verifyThread(threadId, apiKey);
          console.log("✅ Thread validation successful");
        } catch (error) {
          console.log("❌ Thread validation failed, creating new thread");
          threadId = await createThread(apiKey);
          
          // Update the session with the new thread_id
          await supabase
            .from('chat_sessions')
            .update({ openai_thread_id: threadId })
            .eq('id', sessionId);
            
          console.log("✅ New thread created and saved:", threadId);
        }
      }
    } else {
      console.log("🆕 Creating new thread for new session");
      threadId = await createThread(apiKey);
      console.log("✅ New thread created:", threadId);
    }
  } catch (error) {
    console.error("❌ Error in thread management:", error);
    throw new Error("Failed to manage OpenAI thread");
  }
  
  if (!threadId) {
    throw new Error("Could not create or validate a thread.");
  }

  // Add message
  console.log("✍️ Adding message to thread...");
  await openAIRequest(
    `/threads/${threadId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        role: "user",
        content: message,
      }),
    },
    apiKey
  );

  // Run assistant as configured on OpenAI platform
  console.log("⚙️ Running assistant...");
  const runData = await openAIRequest(
    `/threads/${threadId}/runs`,
    {
      method: "POST",
      body: JSON.stringify({
        assistant_id: assistantId,
      }),
    },
    apiKey
  );

  // Wait for completion with progressive feedback
  console.log("⏳ Waiting for assistant response...");
  const runResult = await waitForRunCompletion(threadId, runData.id, apiKey);
  
  // Return progress messages to client
  const progressMessages = runResult.progressMessages || [];
  
  // If the execution is not completely finished but has already reached timeout,
  // we still fetch the partial response that might be available
  if (runResult.status !== "completed" && runResult.status !== "timeout_but_continue") {
    throw new Error(`❌ Execution failed with status: ${runResult.status}`);
  }

  // Get execution details to obtain file search information
  console.log("🔍 Getting execution details with search results...");
  await openAIRequest(
    `/threads/${threadId}/runs/${runData.id}?include[]=step_details.tool_calls[*].file_search.results[*].content`,
    { method: "GET" },
    apiKey
  );

  // Get response
  console.log("✅ Getting response...");
  const messagesData = await openAIRequest(
    `/threads/${threadId}/messages`,
    { method: "GET" },
    apiKey
  );

  const lastMessage = messagesData.data.find((msg: any) => msg.role === "assistant");

  if (!lastMessage?.content?.[0]) {
    throw new Error("❌ No valid response from assistant.");
  }

  let responseText = "";

  if (lastMessage.content[0].type === "text") {
    // Extract the text and clean all references and citations
    responseText = cleanResponseText(lastMessage.content[0].text.value);
  } else {
    responseText = "Invalid response received.";
  }
  
  console.log("📜 Response generated:", responseText.substring(0, 100) + "...");

  return {
    content: responseText,
    threadId,
    progressMessages
  };
}
