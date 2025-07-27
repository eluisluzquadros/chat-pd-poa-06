export function parseMarkdown(text: string): string {
  if (!text) return '';

  // Split by double line breaks first to identify paragraphs
  const sections = text.split('\n\n');
  
  const processedSections = sections.map(section => {
    let processed = section.trim();
    
    if (!processed) return '';

    // Convert headers (must be at start of line)
    processed = processed.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-foreground mt-6 mb-3 first:mt-0">$1</h3>');
    processed = processed.replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold text-foreground mt-8 mb-4 first:mt-0">$1</h2>');
    processed = processed.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-foreground mt-8 mb-4 first:mt-0">$1</h1>');

    // Convert bold text
    processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');

    // Convert italic text  
    processed = processed.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');

    // Handle numbered lists
    const numberedListRegex = /^\d+\.\s+(.+)$/gm;
    const numberedItems = [];
    let match;
    let hasNumberedList = false;
    
    while ((match = numberedListRegex.exec(processed)) !== null) {
      numberedItems.push(match[1]);
      hasNumberedList = true;
    }
    
    if (hasNumberedList) {
      processed = processed.replace(/^\d+\.\s+.+$/gm, '');
      const listHtml = `<ol class="list-decimal list-inside space-y-2 my-4 ml-4">${numberedItems.map(item => `<li class="text-muted-foreground leading-relaxed">${item}</li>`).join('')}</ol>`;
      processed = processed + listHtml;
    }

    // Handle bullet lists
    const bulletListRegex = /^[-•]\s+(.+)$/gm;
    const bulletItems = [];
    let bulletMatch;
    let hasBulletList = false;
    
    while ((bulletMatch = bulletListRegex.exec(processed)) !== null) {
      bulletItems.push(bulletMatch[1]);
      hasBulletList = true;
    }
    
    if (hasBulletList) {
      processed = processed.replace(/^[-•]\s+.+$/gm, '');
      const listHtml = `<ul class="list-disc list-inside space-y-2 my-4 ml-4">${bulletItems.map(item => `<li class="text-muted-foreground leading-relaxed">${item}</li>`).join('')}</ul>`;
      processed = processed + listHtml;
    }

    // If it's not a header or list, treat as paragraph
    if (!processed.includes('<h') && !processed.includes('<ul') && !processed.includes('<ol') && processed.trim()) {
      // Handle single line breaks within paragraphs
      processed = processed.replace(/\n/g, '<br class="my-1">');
      processed = `<p class="text-muted-foreground leading-relaxed mb-4">${processed}</p>`;
    }

    return processed;
  });

  return processedSections.filter(section => section.trim()).join('');
}