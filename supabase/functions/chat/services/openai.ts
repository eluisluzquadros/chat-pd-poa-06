
import { OPENAI_API_BASE } from "../constants.ts";

// Function to make requests to the OpenAI API
export async function openAIRequest(endpoint: string, options: RequestInit, apiKey: string) {
  try {
    const response = await fetch(`${OPENAI_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
        ...options.headers,
      },
    });

    // Check if the response is successful before processing JSON
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(errorData.error?.message || response.statusText);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ API Error (${endpoint}):`, error);
    throw error;
  }
}

// Function to verify if a thread exists and is valid
export async function verifyThread(threadId: string, apiKey: string): Promise<boolean> {
  try {
    await openAIRequest(
      `/threads/${threadId}`,
      { method: "GET" },
      apiKey
    );
    return true;
  } catch (error: any) {
    // Check specifically if the error is "thread not found"
    if (error.message && error.message.includes("No thread found")) {
      return false;
    }
    // For other errors, it could be a temporary network issue
    throw error;
  }
}

// Function to create a new thread
export async function createThread(apiKey: string): Promise<string> {
  const threadData = await openAIRequest(
    "/threads",
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    apiKey
  );
  return threadData.id;
}

// Function to generate a status message based on progress
export function getProgressMessage(progress: number, hasFileSearch: boolean = false): string {
  if (progress < 0.2) {
    return "Iniciando processamento da sua pergunta...";
  } else if (progress < 0.4) {
    return hasFileSearch 
      ? "Pesquisando na base de conhecimento..." 
      : "Analisando sua solicitação...";
  } else if (progress < 0.6) {
    return hasFileSearch 
      ? "Avaliando informações relevantes encontradas..." 
      : "Elaborando resposta adequada...";
  } else if (progress < 0.8) {
    return "Organizando as informações para você...";
  } else {
    return "Finalizando resposta, quase pronto...";
  }
}

// Function to clean references and citations from text
export function cleanResponseText(text: string): string {
  console.log("🧹 Original text length:", text.length);
  console.log("🧹 Text before cleaning (first 300 chars):", text.substring(0, 300));
  
  // Enhanced patterns to remove all citation formats
  let cleanedText = text
    // Remove standard citation patterns with file names: 【4:4†LUOS_FINAL_JUNHO_2025.docx】
    .replace(/【\d+:\d+†[^】]*】/g, '')
    // Remove square bracket citations with file names: [4:4†LUOS_FINAL_JUNHO_2025.docx]
    .replace(/\[\d+:\d+†[^\]]*\]/g, '')
    // Remove simple numbered citations: [4], [12], [1]
    .replace(/\[\d+\]/g, '')
    // Remove numbered citations with symbols: 【4】, 【12】
    .replace(/【\d+】/g, '')
    // Remove any pattern with † symbol (citation marker)
    .replace(/[\[【][^[\]【】]*†[^[\]【】]*[\]】]/g, '')
    // Remove patterns with file extensions regardless of format
    .replace(/[\[【][^[\]【】]*\.(pdf|docx?|txt|xlsx?|pptx?|odt|rtf|csv)[^[\]【】]*[\]】]/gi, '')
    // Remove any remaining numbered references in brackets/braces
    .replace(/[\[【]\d+[\]】]/g, '')
    // Remove range citations like [1-5] or 【1-3】
    .replace(/[\[【]\d+-\d+[\]】]/g, '')
    // Remove citations with letters: [a], [A], 【b】
    .replace(/[\[【][a-zA-Z][\]】]/g, '')
    // Remove any remaining bracket/brace pairs that look like citations
    .replace(/[\[【][^a-zA-Z\s]*[\]】]/g, '')
    // Remove reference sections at the end
    .replace(/\n\s*(Referências?|References?|Fontes?|Sources?|Bibliografia):\s*\n.*$/si, '')
    .replace(/\n\s*(Referências?|References?|Fontes?|Sources?|Bibliografia)\s*\n.*$/si, '')
    // Clean up multiple spaces and normalize line breaks
    .replace(/\s{3,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    // Remove trailing spaces and empty lines
    .replace(/[ \t]+$/gm, '')
    .replace(/^\s*\n/gm, '')
    .trim();

  console.log("✨ Cleaned text length:", cleanedText.length);
  console.log("✨ Text after cleaning (first 300 chars):", cleanedText.substring(0, 300));
  
  // Advanced detection for remaining citations
  const potentialCitations = [
    ...cleanedText.matchAll(/[\[【][^\]】]*[\]】]/g),
    ...cleanedText.matchAll(/\b\d+[:†][^\s]*\b/g),
    ...cleanedText.matchAll(/†[^\s]*/g)
  ].map(match => match[0]);
  
  if (potentialCitations.length > 0) {
    console.log("⚠️ Potential remaining citations detected:", [...new Set(potentialCitations)]);
    
    // Additional cleanup for detected patterns
    potentialCitations.forEach(citation => {
      const escapedCitation = citation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleanedText = cleanedText.replace(new RegExp(escapedCitation, 'g'), '');
    });
    
    // Final cleanup after additional removals
    cleanedText = cleanedText
      .replace(/\s{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
      
    console.log("🔧 After additional cleanup:", cleanedText.substring(0, 300));
  } else {
    console.log("✅ No remaining citations detected");
  }

  // Final validation
  const finalCheck = cleanedText.match(/[\[【][^\]】]*[\]】]/g);
  if (finalCheck) {
    console.log("🚨 ALERT: Citations still present after cleaning:", finalCheck);
  }

  return cleanedText;
}
