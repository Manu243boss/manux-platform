import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ProductRichDescriptionProps {
  content: string;
  initialSentenceCount?: number;
  className?: string;
}

export const ProductRichDescription: React.FC<ProductRichDescriptionProps> = ({
  content,
  initialSentenceCount = 4,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Clean and prepare the HTML / text content
  const { cleanHtml, plainText, hasMore } = useMemo(() => {
    if (!content || !content.trim()) {
      return { cleanHtml: '', plainText: '', hasMore: false };
    }

    let raw = content.trim();

    // Clean up excessive empty paragraphs that Quill sometimes outputs (e.g., <p><br></p><p><br></p>)
    let cleaned = raw
      .replace(/(<p>\s*<br\s*\/?>\s*<\/p>\s*){2,}/gi, '<p><br/></p>')
      .replace(/<span class="ql-ui"[^>]*><\/span>/gi, '');

    // Extract text without HTML tags to measure length
    const tempDiv = typeof document !== 'undefined' ? document.createElement('div') : null;
    let extractedText = '';
    if (tempDiv) {
      tempDiv.innerHTML = cleaned;
      extractedText = tempDiv.textContent || tempDiv.innerText || '';
    } else {
      extractedText = cleaned.replace(/<[^>]*>/g, ' ');
    }

    extractedText = extractedText.replace(/\s+/g, ' ').trim();

    // Sentence splitting logic: check if there are more than `initialSentenceCount` sentences
    const sentences = extractedText.match(/[^.!?\n]+[.!?\n]+/g) || [extractedText];
    const isLong = sentences.length > initialSentenceCount || extractedText.length > 280;

    return {
      cleanHtml: cleaned,
      plainText: extractedText,
      hasMore: isLong,
    };
  }, [content, initialSentenceCount]);

  if (!cleanHtml) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Content wrapper with collapse / expand state */}
      <div className="relative">
        <div
          className={`chariow-rich-content transition-all duration-300 ${
            !isExpanded && hasMore ? 'max-h-40 sm:max-h-48 overflow-hidden' : 'max-h-none'
          }`}
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />

        {/* Gradient fade overlay when collapsed */}
        {!isExpanded && hasMore && (
          <div
            className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/85 to-transparent pointer-events-none"
            aria-hidden="true"
          />
        )}
      </div>

      {/* "Voir plus" / "Voir moins" toggle button */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer pt-1 transition-colors group"
        >
          <span className="underline underline-offset-2">
            {isExpanded ? 'Voir moins' : 'Voir plus'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
          ) : (
            <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
          )}
        </button>
      )}
    </div>
  );
};
