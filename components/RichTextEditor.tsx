import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Type,
  Eraser,
  Smile,
  Copy,
  Check,
  Hash,
  Sparkles
} from 'lucide-react';
import { stripHtml, convertToUnicodeSocial, normalizeValueForEditor, isHtmlContent } from './RichTextDisplay';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  disabled?: boolean;
}

const COMMON_EMOJIS = [
  '✨', '💡', '👉', '📌', '🎯', '📅', '🔥', '❤️', '✅', '⚠️', '💬', '🩺', '💊', '🏥', '👥', '📲', '⭐'
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Escribe aquí...',
  minHeight = '110px',
  className = '',
  disabled = false
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<{
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
    ul: boolean;
    ol: boolean;
  }>({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    ul: false,
    ol: false
  });

  const [showEmojis, setShowEmojis] = useState(false);
  const [copiedType, setCopiedType] = useState<'clean' | 'unicode' | null>(null);

  // Sync internal innerHTML when value prop changes externally (e.g. initial load or reset)
  // Preserves multi-line formatting from legacy plain text or rich HTML
  useEffect(() => {
    if (!editorRef.current) return;
    const targetHtml = normalizeValueForEditor(value);
    
    // Don't overwrite if user is actively typing in the editor
    if (document.activeElement === editorRef.current) return;

    if (editorRef.current.innerHTML !== targetHtml) {
      editorRef.current.innerHTML = targetHtml;
    }
  }, [value]);

  // Check active formatting at selection
  const updateActiveFormats = useCallback(() => {
    if (!editorRef.current || document.activeElement !== editorRef.current) return;
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList')
      });
    } catch {
      // Ignored if document doesn't support queryCommandState
    }
  }, []);

  const handleInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    // Check if truly empty (e.g. <br>, <p><br></p>)
    const cleanText = editorRef.current.textContent?.trim();
    if (!cleanText && (!html || html === '<p><br></p>' || html === '<br>')) {
      onChange('');
    } else {
      onChange(html);
    }
    updateActiveFormats();
  };

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    if (disabled || !editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, arg);
    handleInput();
    updateActiveFormats();
  };

  const handleFormat = (format: 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'insertUnorderedList' | 'insertOrderedList' | 'removeFormat') => {
    executeCommand(format);
  };

  const handleHeading = () => {
    if (disabled || !editorRef.current) return;
    editorRef.current.focus();
    // Toggle between h3 and p
    try {
      const block = document.queryCommandValue('formatBlock');
      if (block === 'h3' || block === 'heading 3') {
        document.execCommand('formatBlock', false, '<p>');
      } else {
        document.execCommand('formatBlock', false, '<h3>');
      }
    } catch {
      document.execCommand('formatBlock', false, '<h3>');
    }
    handleInput();
    updateActiveFormats();
  };

  const insertEmoji = (emoji: string) => {
    if (disabled || !editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('insertText', false, emoji);
    handleInput();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const html = e.clipboardData.getData('text/html');

    if (html && isHtmlContent(html)) {
      // Parse and clean basic HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Clean up script, style, comments
      doc.querySelectorAll('script, style, meta, link').forEach(el => el.remove());

      // If it contains formatting tags, paste sanitized body
      const cleanHtml = doc.body.innerHTML;
      document.execCommand('insertHTML', false, cleanHtml);
    } else {
      // Plain text: preserve line breaks as <br>
      const formatted = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n/g, '<br>');
      document.execCommand('insertHTML', false, formatted);
    }
    handleInput();
  };

  // Stats calculation
  const plainText = stripHtml(value);
  const charCount = plainText.length;
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const hashtagCount = (plainText.match(/#[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+/g) || []).length;
  const isEmpty = !plainText.trim();

  // Social Copy Actions
  const copyCleanText = () => {
    navigator.clipboard.writeText(plainText);
    setCopiedType('clean');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const copyUnicodeSocial = () => {
    const unicodeText = convertToUnicodeSocial(value);
    navigator.clipboard.writeText(unicodeText);
    setCopiedType('unicode');
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className={`border border-slate-300 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 shadow-2xs transition-all ${className}`}>
      {/* Barra de Herramientas de Formato Enriquecido */}
      <div className="bg-slate-50 border-b border-slate-200 px-2.5 py-1.5 flex items-center justify-between flex-wrap gap-1 select-none">
        {/* Botones de Estilo de Texto */}
        <div className="flex items-center gap-0.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleFormat('bold')}
            disabled={disabled}
            title="Negrita (Ctrl+B)"
            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeFormats.bold
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleFormat('italic')}
            disabled={disabled}
            title="Cursiva (Ctrl+I)"
            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeFormats.italic
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleFormat('underline')}
            disabled={disabled}
            title="Subrayado (Ctrl+U)"
            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeFormats.underline
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleFormat('strikeThrough')}
            disabled={disabled}
            title="Tachado"
            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeFormats.strike
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-300 mx-1"></div>

          {/* Listas */}
          <button
            type="button"
            onClick={() => handleFormat('insertUnorderedList')}
            disabled={disabled}
            title="Lista con viñetas"
            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeFormats.ul
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleFormat('insertOrderedList')}
            disabled={disabled}
            title="Lista numerada"
            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeFormats.ol
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleHeading}
            disabled={disabled}
            title="Titular destacado (H3)"
            className="p-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Type className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleFormat('removeFormat')}
            disabled={disabled}
            title="Limpiar formato"
            className="p-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-200/80 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-300 mx-1"></div>

          {/* Selector Rápido de Emojis */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojis(!showEmojis)}
              disabled={disabled}
              title="Insertar emojis para redes"
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                showEmojis
                  ? 'bg-amber-100 text-amber-800'
                  : 'text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              <Smile className="w-3.5 h-3.5 text-amber-500" />
            </button>

            {showEmojis && (
              <div className="absolute left-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-xl shadow-lg p-2 flex flex-wrap gap-1.5 w-60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block w-full mb-1">
                  Emojis Frecuentes
                </span>
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      insertEmoji(emoji);
                      setShowEmojis(false);
                    }}
                    className="w-7 h-7 flex items-center justify-center text-sm rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Acciones de Copiado Rápido para Community Managers */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={copyCleanText}
            title="Copiar texto plano sin etiquetas"
            className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copiedType === 'clean' ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-700">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copiar</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={copyUnicodeSocial}
            title="Copiar con negritas compatibles para Instagram/LinkedIn (Unicode)"
            className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copiedType === 'unicode' ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span>¡Copiado para Redes!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Copiar p/ Redes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Área Editable */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onPaste={handlePaste}
          style={{ minHeight }}
          className="rich-text-editor-content p-3 text-xs text-slate-800 leading-relaxed outline-hidden overflow-y-auto max-h-96 whitespace-pre-wrap break-words
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
            [&_p]:my-1 [&_p]:min-h-[1.25em]
            [&_div]:min-h-[1.25em]"
        />

        {/* Placeholder flotante cuando está vacío */}
        {isEmpty && (
          <div
            onClick={() => editorRef.current?.focus()}
            className="absolute left-3 top-3 text-xs text-slate-400 italic pointer-events-none select-none"
          >
            {placeholder}
          </div>
        )}
      </div>

      {/* Barra de Estadísticas Inferior */}
      <div className="bg-slate-50/80 border-t border-slate-200/80 px-3 py-1 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-3">
          <span>{charCount} caracteres</span>
          <span>•</span>
          <span>{wordCount} palabras</span>
          {hashtagCount > 0 && (
            <>
              <span>•</span>
              <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                <Hash className="w-3 h-3 inline" />
                {hashtagCount} hashtags
              </span>
            </>
          )}
        </div>
        <div className="text-[10px] text-slate-400 font-sans">
          Ctrl+B (Negrita) • Ctrl+I (Cursiva) • Ctrl+U (Subrayado)
        </div>
      </div>
    </div>
  );
};
