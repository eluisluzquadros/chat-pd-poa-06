
import { RunCompletionResult } from "../types.ts";
import { openAIRequest, getProgressMessage } from "./openai.ts";

// Function to wait for the completion of the assistant execution with progressive feedback
export async function waitForRunCompletion(
  threadId: string, 
  runId: string, 
  apiKey: string
): Promise<RunCompletionResult> {
  const maxAttempts = 25;      // Increased to 25 attempts
  const initialDelayMs = 500;  // Starts with 0.5 second
  const maxDelayMs = 2000;     // Maximum of 2 seconds
  const totalTimeoutMs = 30000; // Total timeout of 30 seconds
  
  const startTime = Date.now();
  const progressMessages = new Set<string>();
  let hasFileSearch = false;
  
  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    // Check if the total timeout has been exceeded
    if (Date.now() - startTime > totalTimeoutMs) {
      console.log("⏰ Total timeout reached, returning partial response");
      return { 
        status: "timeout_but_continue",
        progressMessages: Array.from(progressMessages)
      };
    }
    
    // Calculate approximate progress based on attempts
    const progress = Math.min(attempts / maxAttempts, 0.95);
    const progressMessage = getProgressMessage(progress, hasFileSearch);
    progressMessages.add(progressMessage);
    
    try {
      // Include step_details to check if there is file search in progress
      const runStatus = await openAIRequest(
        `/threads/${threadId}/runs/${runId}?include[]=step_details`,
        { method: "GET" },
        apiKey
      );
      
      console.log(`🔄 Check ${attempts + 1}: Status - ${runStatus.status}, elapsed time: ${Math.round((Date.now() - startTime)/1000)}s`);
      
      // Check if there is file search in the steps
      if (runStatus.step_details) {
        hasFileSearch = runStatus.step_details.some((step: any) => 
          step.type === "tool_calls" && 
          step.tool_calls.some((tool: any) => tool.type === "file_search")
        );
      }
      
      if (runStatus.status === "completed") {
        console.log(`✅ Execution completed in ${Math.round((Date.now() - startTime)/1000)}s`);
        return { 
          status: "completed", 
          progressMessages: Array.from(progressMessages)
        };
      }
      
      if (runStatus.status === "failed" || runStatus.status === "cancelled" || runStatus.status === "expired") {
        throw new Error(`Run failed with status: ${runStatus.status}`);
      }
    } catch (error) {
      console.error(`⚠️ Error checking status (attempt ${attempts+1}):`, error);
      // Continue even with error, to not block the response
    }
    
    // For the last check, we don't need to wait
    if (attempts < maxAttempts - 1) {
      // Adaptive delay - increases gradually, but not more than maxDelayMs
      const delayMs = Math.min(initialDelayMs * Math.pow(1.2, attempts), maxDelayMs);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  // If the maximum number of attempts is reached, we return anyway
  console.log("⚠️ Maximum check time exceeded, returning partial response");
  return { 
    status: "timeout_but_continue",
    progressMessages: Array.from(progressMessages)
  };
}
