import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import CharacterCount from '@tiptap/extension-character-count';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  RotateCcw,
  RotateCw,
  RemoveFormatting,
  Eye,
  Edit3,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { sanitizeRuleContent } from '../../utils/sanitizeHtml';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  direction?: 'ltr' | 'rtl';
  placeholder?: string;
  minHeight?: string;
  maxCharacters?: number;
  label?: string;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  direction = 'ltr',
  placeholder = 'Write content here...',
  minHeight = '180px',
  maxCharacters = 5000,
  label,
  onDirtyChange,
}) => {
  const [isPreview, setIsPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [initialValue] = useState(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      CharacterCount.configure({
        limit: maxCharacters,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose max-w-none focus:outline-none p-4 text-slate-800 ${
          direction === 'rtl' ? 'text-right' : 'text-left'
        }`,
        dir: direction,
        placeholder,
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onChange(html);
      if (onDirtyChange) {
        onDirtyChange(html !== initialValue);
      }
    },
  });

  // Synchronize when external value changes drastically (e.g. modal open)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="border border-slate-200 rounded-lg p-4 text-slate-400 text-sm animate-pulse">
        Loading rich text editor...
      </div>
    );
  }

  const charCount = editor.storage.characterCount.characters();

  const ToolbarButton: React.FC<{
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
  }> = ({ onClick, isActive = false, disabled = false, title, children }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1 sm:p-1.5 rounded text-xs transition-colors flex-shrink-0 ${
        isActive
          ? 'bg-brand-navy-900 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );

  return (
    <div
      className={`border border-slate-300 rounded-lg bg-white flex flex-col transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-white p-6 rounded-none overflow-hidden shadow-2xl'
          : 'relative shadow-sm'
      }`}
      dir={direction}
    >
      {label && (
        <div className="px-3 sm:px-4 py-1.5 sm:py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
            {label} ({direction.toUpperCase()})
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {charCount} / {maxCharacters} chars
            </span>
          </div>
        </div>
      )}

      {/* Toolbar - Single row on desktop, horizontally scrollable on mobile */}
      <div
        className="flex items-center gap-0.5 sm:gap-1 p-1 sm:p-1.5 border-b border-slate-200 bg-slate-50 overflow-x-auto flex-nowrap"
        dir="ltr"
      >
        {/* Paragraph & Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          isActive={editor.isActive('paragraph') && !editor.isActive('heading')}
          title="Paragraph"
        >
          <span className="text-xs font-bold px-1">P</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Text Styling */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <BoldIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <ItalicIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Text Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          isActive={editor.isActive({ textAlign: 'justify' })}
          title="Justify"
        >
          <AlignJustify className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Clear Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Clear Formatting"
        >
          <RemoveFormatting className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Undo / Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <RotateCcw className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <RotateCw className="w-4 h-4" />
        </ToolbarButton>

        <div className="flex-1" />

        {/* Preview toggle */}
        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
            isPreview
              ? 'bg-brand-orange-500 text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {isPreview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {isPreview ? 'Edit' : 'Preview'}
        </button>

        {/* Fullscreen toggle */}
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Editor Content or Sanitized Preview */}
      <div
        className={`flex-1 overflow-y-auto bg-white ${
          isFullscreen ? 'min-h-[400px]' : ''
        }`}
        style={{ minHeight: isFullscreen ? '400px' : minHeight }}
      >
        {isPreview ? (
          <div
            className={`p-4 prose prose-sm sm:prose max-w-none text-slate-800 ${
              direction === 'rtl' ? 'text-right' : 'text-left'
            }`}
            dir={direction}
            dangerouslySetInnerHTML={{ __html: sanitizeRuleContent(editor.getHTML()) }}
          />
        ) : (
          <EditorContent editor={editor} className="h-full focus:outline-none" />
        )}
      </div>

      {/* Character Count Footer if no label */}
      {!label && (
        <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Direction: {direction.toUpperCase()}</span>
          <span>
            {charCount} / {maxCharacters} chars
          </span>
        </div>
      )}
    </div>
  );
};
