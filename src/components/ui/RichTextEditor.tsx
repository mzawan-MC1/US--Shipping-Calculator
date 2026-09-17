import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import DOMPurify from 'dompurify';
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  RemoveFormatting,
  Undo,
  Redo,
  Eye,
  Edit3,
} from 'lucide-react';

export interface RichTextEditorRef {
  getContent: () => string;
  setContent: (content: string) => void;
  focus: () => void;
}

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  dir?: 'ltr' | 'rtl';
  label?: string;
  required?: boolean;
  minHeight?: string;
  maxCharacters?: number;
  className?: string;
  error?: string;
}

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
      'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'br', 'span', 'div'
    ],
    ALLOWED_ATTR: ['style', 'class', 'dir'],
  });
};

export const stripHtmlToText = (html: string): string => {
  const tmp = document.createElement('div');
  tmp.innerHTML = sanitizeHtml(html);
  return tmp.textContent || tmp.innerText || '';
};

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  (
    {
      value,
      onChange,
      placeholder,
      dir = 'ltr',
      label,
      required,
      minHeight = '140px',
      maxCharacters,
      className = '',
      error,
    },
    ref
  ) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isPreview, setIsPreview] = useState(false);
    const [charCount, setCharCount] = useState(0);

    useEffect(() => {
      if (editorRef.current) {
        const sanitized = sanitizeHtml(value || '');
        if (editorRef.current.innerHTML !== sanitized) {
          editorRef.current.innerHTML = sanitized;
        }
        setCharCount(stripHtmlToText(sanitized).length);
      }
    }, [value]);

    useImperativeHandle(ref, () => ({
      getContent: () => {
        return editorRef.current ? sanitizeHtml(editorRef.current.innerHTML) : '';
      },
      setContent: (content: string) => {
        if (editorRef.current) {
          const sanitized = sanitizeHtml(content);
          editorRef.current.innerHTML = sanitized;
          setCharCount(stripHtmlToText(sanitized).length);
        }
      },
      focus: () => {
        editorRef.current?.focus();
      },
    }));

    const executeCommand = (command: string, valueArgument: string | undefined = undefined) => {
      if (isPreview) return;
      document.execCommand(command, false, valueArgument);
      handleInput();
    };

    const handleInput = () => {
      if (!editorRef.current) return;
      const cleanHtml = sanitizeHtml(editorRef.current.innerHTML);
      const textLen = stripHtmlToText(cleanHtml).length;
      setCharCount(textLen);
      onChange(cleanHtml);
    };

    const isRtl = dir === 'rtl';

    return (
      <div className={`space-y-1.5 ${className}`}>
        {label && (
          <div className="flex items-center justify-between">
            <label className="block font-bold text-slate-700 text-xs">
              {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <button
              type="button"
              onClick={() => setIsPreview(!isPreview)}
              className="text-[11px] font-semibold text-brand-orange-600 hover:text-brand-orange-700 flex items-center gap-1 transition-colors"
            >
              {isPreview ? (
                <>
                  <Edit3 className="w-3 h-3" /> Edit
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" /> Preview
                </>
              )}
            </button>
          </div>
        )}

        {!isPreview && (
          <div
            className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-50 border border-slate-200 rounded-t-xl text-slate-600"
            role="toolbar"
            aria-label="Formatting options"
          >
            <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200">
              <button
                type="button"
                onClick={() => executeCommand('undo')}
                className="p-1 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
                title="Undo"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('redo')}
                className="p-1 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
                title="Redo"
              >
                <Redo className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
              <button
                type="button"
                onClick={() => executeCommand('formatBlock', '<h3>')}
                className="p-1 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
                title="Heading 1"
              >
                <Heading1 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('formatBlock', '<h4>')}
                className="p-1 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
                title="Heading 2"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('formatBlock', '<p>')}
                className="px-1.5 py-0.5 text-[11px] font-bold rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
                title="Paragraph"
              >
                P
              </button>
            </div>

            <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
              <button
                type="button"
                onClick={() => executeCommand('bold')}
                className="p-1 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('italic')}
                className="p-1 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('underline')}
                className="p-1 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
                title="Underline"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
              <button
                type="button"
                onClick={() => executeCommand('insertUnorderedList')}
                className="p-1 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
                title="Bullet List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('insertOrderedList')}
                className="p-1 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
                title="Numbered List"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
              <button
                type="button"
                onClick={() => executeCommand('justifyLeft')}
                className="p-1 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
                title="Align Left"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('justifyCenter')}
                className="p-1 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
                title="Align Center"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('justifyRight')}
                className="p-1 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
                title="Align Right"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('justifyFull')}
                className="p-1 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
                title="Justify"
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-0.5 pl-1">
              <button
                type="button"
                onClick={() => executeCommand('removeFormat')}
                className="p-1 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors"
                title="Clear Formatting"
              >
                <RemoveFormatting className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {isPreview ? (
          <div
            dir={dir}
            style={{ minHeight }}
            className={`p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed overflow-y-auto ${
              isRtl ? 'text-right' : 'text-left'
            }`}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(value || '<p class="text-slate-400 italic">No content</p>') }}
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            dir={dir}
            style={{ minHeight }}
            onInput={handleInput}
            onBlur={handleInput}
            data-placeholder={placeholder}
            className={`p-3 bg-white border border-slate-200 ${
              label ? 'rounded-b-xl' : 'rounded-xl'
            } text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-orange-500 overflow-y-auto ${
              isRtl ? 'text-right' : 'text-left'
            }`}
          />
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5">
          <span>
            {isRtl ? 'الاتجاه: من اليمين لليسار (عربي)' : 'Direction: Left-to-Right (English)'}
          </span>
          <span>
            {charCount} {maxCharacters ? `/ ${maxCharacters}` : ''} {isRtl ? 'حرف' : 'characters'}
          </span>
        </div>

        {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';
