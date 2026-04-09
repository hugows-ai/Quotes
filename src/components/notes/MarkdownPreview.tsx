import { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

function parseMarkdown(text: string): string {
  if (!text) return '';
  
  const images: { placeholder: string; alt: string; url: string }[] = [];
  let processed = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const placeholder = `__IMG_${images.length}__`;
    images.push({ placeholder, alt, url });
    return placeholder;
  });

  let html = processed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  for (const img of images) {
    // Sanitize URL to prevent javascript: protocol
    const safeUrl = img.url.replace(/^javascript:/i, '');
    const safeAlt = img.alt.replace(/"/g, '&quot;');
    html = html.replace(img.placeholder, `<img src="${safeUrl}" alt="${safeAlt}" style="max-width:100%;border-radius:8px;margin:8px 0;" />`);
  }
  
  if (!html.startsWith('<h') && !html.startsWith('<li')) {
    html = '<p>' + html + '</p>';
  }
  
  html = html.replace(/<p><\/p>/g, '');
  
  return html;
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  const html = useMemo(() => {
    const raw = parseMarkdown(content);
    return DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'br', 'strong', 'em', 'li', 'ul', 'ol', 'img'],
      ALLOWED_ATTR: ['src', 'alt', 'style'],
      ALLOW_DATA_ATTR: false,
    });
  }, [content]);
  
  return (
    <div 
      className={`note-content prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
