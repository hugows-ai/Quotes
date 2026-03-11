import { useMemo } from 'react';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

// Simple markdown parser for basic formatting
function parseMarkdown(text: string): string {
  if (!text) return '';
  
  // Extract images before escaping HTML, store placeholders
  const images: { placeholder: string; alt: string; url: string }[] = [];
  let processed = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const placeholder = `__IMG_${images.length}__`;
    images.push({ placeholder, alt, url });
    return placeholder;
  });

  let html = processed
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    
    // Headers (must be at start of line)
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    
    // Bold and Italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  // Restore images as <img> tags
  for (const img of images) {
    html = html.replace(img.placeholder, `<img src="${img.url}" alt="${img.alt}" style="max-width:100%;border-radius:8px;margin:8px 0;" />`);
  }
  
  // Wrap in paragraph if not starting with a block element
  if (!html.startsWith('<h') && !html.startsWith('<li')) {
    html = '<p>' + html + '</p>';
  }
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  
  return html;
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  const html = useMemo(() => parseMarkdown(content), [content]);
  
  return (
    <div 
      className={`note-content prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
