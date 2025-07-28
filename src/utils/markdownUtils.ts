export function parseMarkdown(text: string): string {
  if (!text) return '';

  // Convert tables to HTML format first
  text = convertTablesToHTML(text);
  
  // Convert URLs to clickable links
  text = convertURLsToLinks(text);

  // Split by double line breaks first to identify paragraphs
  const sections = text.split('\n\n');
  
  const processedSections = sections.map(section => {
    let processed = section.trim();
    
    if (!processed) return '';

    // Convert headers (must be at start of line)
    processed = processed.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-foreground mt-6 mb-3 first:mt-0 flex items-center gap-2"><span class="text-primary">📋</span>$1</h3>');
    processed = processed.replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold text-foreground mt-8 mb-4 first:mt-0 flex items-center gap-2"><span class="text-primary">📍</span>$1</h2>');
    processed = processed.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-foreground mt-8 mb-4 first:mt-0 flex items-center gap-2"><span class="text-primary">🏙️</span>$1</h1>');

    // Convert bold text
    processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground bg-primary/10 px-1 rounded">$1</strong>');

    // Convert italic text  
    processed = processed.replace(/\*([^*]+)\*/g, '<em class="italic text-muted-foreground">$1</em>');

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
      const listHtml = `<ol class="space-y-2 my-4 ml-4 bg-muted/30 rounded-lg p-4 border-l-4 border-primary" style="counter-reset: list-counter; list-style: none;">${numberedItems.map((item, index) => `<li class="text-muted-foreground leading-relaxed" style="counter-increment: list-counter; position: relative; padding-left: 2rem;"><span style="position: absolute; left: 0; font-weight: 600; color: hsl(var(--primary));">${index + 1}.</span>${item}</li>`).join('')}</ol>`;
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
      const listHtml = `<ul class="list-disc list-inside space-y-2 my-4 ml-4 bg-muted/30 rounded-lg p-4 border-l-4 border-primary">${bulletItems.map(item => `<li class="text-muted-foreground leading-relaxed">${item}</li>`).join('')}</ul>`;
      processed = processed + listHtml;
    }

    // If it's not a header or list, treat as paragraph
    if (!processed.includes('<h') && !processed.includes('<ul') && !processed.includes('<ol') && !processed.includes('<table') && processed.trim()) {
      // Handle single line breaks within paragraphs
      processed = processed.replace(/\n/g, '<br class="my-1">');
      processed = `<p class="text-muted-foreground leading-relaxed mb-4">${processed}</p>`;
    }

    return processed;
  });

  return processedSections.filter(section => section.trim()).join('');
}

function convertTablesToHTML(text: string): string {
  // Detect markdown-like table patterns and convert to HTML
  const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)*)/g;
  
  return text.replace(tableRegex, (match, headerRow, bodyRows) => {
    const headers = headerRow.split('|').map((h: string) => h.trim()).filter(Boolean);
    const rows = bodyRows.trim().split('\n').map((row: string) => 
      row.split('|').map((cell: string) => cell.trim()).filter(Boolean)
    );

    const headerHTML = headers.map((header: string) => 
      `<th class="px-4 py-3 text-left font-semibold text-foreground border-b-2 border-primary bg-primary/5">${header}</th>`
    ).join('');

    const bodyHTML = rows.map((row: string[]) => 
      `<tr class="border-b border-border/50 hover:bg-muted/30 transition-colors">
        ${row.map((cell: string) => 
          `<td class="px-4 py-3 text-muted-foreground">${cell}</td>`
        ).join('')}
      </tr>`
    ).join('');

    return `
      <div class="overflow-x-auto mb-6 rounded-lg border border-border shadow-sm">
        <table class="w-full bg-card">
          <thead>
            <tr>${headerHTML}</tr>
          </thead>
          <tbody>${bodyHTML}</tbody>
        </table>
      </div>
    `;
  });
}

function convertURLsToLinks(text: string): string {
  // First convert markdown-style links [text](url) to text:url format
  // Remove trailing colon from text if it exists to avoid duplication
  text = text.replace(/\[([^\]]+?):?\]\(([^)]+)\)/g, '$1:$2');
  
  // Convert URLs to clickable links with simplified HTML
  const urlRegex = /(https?:\/\/[^\s,]+|www\.[^\s,]+|bit\.ly\/[^\s,]+)/g;
  
  return text.replace(urlRegex, (url) => {
    // Clean up URL if it ends with punctuation
    const cleanUrl = url.replace(/[.,;:!?]$/, '');
    const punctuation = url.slice(cleanUrl.length);
    
    // Add https:// to bit.ly and www links if missing
    const fullUrl = cleanUrl.startsWith('bit.ly/') || cleanUrl.startsWith('www.') ? `https://${cleanUrl}` : cleanUrl;
    
    // Use simpler HTML to avoid escaping issues
    return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80">${cleanUrl} ↗</a>${punctuation}`;
  });
}