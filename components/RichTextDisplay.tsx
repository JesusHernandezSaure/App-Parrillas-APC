import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface RichTextDisplayProps {
  content?: string;
  fallbackText?: string;
  className?: string;
  showCopyButton?: boolean;
  copyButtonLabel?: string;
}

/**
 * Utility to detect if a string contains HTML tags
 */
export function isHtmlContent(str?: string): boolean {
  if (!str) return false;
  return /<[a-z][\s\S]*>/i.test(str);
}

/**
 * Strips HTML tags returning plain text
 */
export function stripHtml(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Converts basic HTML formatting (bold and italic) into Unicode formatted characters
 * for direct posting to Instagram / Facebook / LinkedIn / X without losing formatting!
 */
export function convertToUnicodeSocial(htmlOrText?: string): string {
  if (!htmlOrText) return '';
  if (!isHtmlContent(htmlOrText)) return htmlOrText;

  // Temporary element to parse DOM
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlOrText;

  const toBoldUnicode = (text: string) => {
    return text.replace(/[A-Za-z0-9]/g, (char) => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d400 + (code - 65)); // A-Z
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d41a + (code - 97)); // a-z
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1d7ce + (code - 48)); // 0-9
      return char;
    });
  };

  const toItalicUnicode = (text: string) => {
    return text.replace(/[A-Za-z]/g, (char) => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d434 + (code - 65)); // A-Z
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d44e + (code - 97)); // a-z
      return char;
    });
  };

  // Convert b / strong
  tempDiv.querySelectorAll('strong, b').forEach((el) => {
    el.textContent = toBoldUnicode(el.textContent || '');
  });

  // Convert i / em
  tempDiv.querySelectorAll('em, i').forEach((el) => {
    el.textContent = toItalicUnicode(el.textContent || '');
  });

  return stripHtml(tempDiv.innerHTML);
}

/**
 * Component to display rich text or legacy plain text cleanly and safely
 */
export const RichTextDisplay: React.FC<RichTextDisplayProps> = ({
  content,
  fallbackText = 'Sin texto',
  className = '',
  showCopyButton = false,
  copyButtonLabel = 'Copiar'
}) => {
  const [copied, setCopied] = useState(false);

  if (!content || !content.trim()) {
    return <span className="text-slate-400 italic font-normal">{fallbackText}</span>;
  }

  const hasHtml = isHtmlContent(content);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = hasHtml ? stripHtml(content) : content;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative group ${className}`}>
      {showCopyButton && (
        <button
          type="button"
          onClick={handleCopy}
          title="Copiar texto"
          className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 shadow-2xs cursor-pointer z-10"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-600" />
              <span className="text-emerald-700">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>{copyButtonLabel}</span>
            </>
          )}
        </button>
      )}

      {hasHtml ? (
        <div
          className="rich-text-rendered font-normal leading-relaxed text-slate-800 break-words
            [&_b]:font-bold [&_b]:text-slate-900
            [&_strong]:font-bold [&_strong]:text-slate-900
            [&_i]:italic [&_em]:italic
            [&_u]:underline [&_u]:underline-offset-2
            [&_s]:line-through [&_strike]:line-through [&_del]:line-through
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ul]:space-y-0.5
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_ol]:space-y-0.5
            [&_li]:my-0.5
            [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:my-1.5
            [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:my-1
            [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:my-1
            [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        <p className="whitespace-pre-wrap leading-relaxed text-slate-800 break-words font-normal">
          {content}
        </p>
      )}
    </div>
  );
};
