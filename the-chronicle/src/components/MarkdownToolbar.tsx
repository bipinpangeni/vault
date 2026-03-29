import React from 'react';
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  List, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Quote, 
  Code 
} from 'lucide-react';

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onUpdate: (newContent: string) => void;
  content: string;
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ textareaRef, onUpdate, content }) => {
  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    onUpdate(newText);
    
    // Set focus back and adjust selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  const tools = [
    { icon: <Bold className="w-4 h-4" />, label: 'Bold', action: () => insertText('**', '**') },
    { icon: <Italic className="w-4 h-4" />, label: 'Italic', action: () => insertText('*', '*') },
    { icon: <Heading1 className="w-4 h-4" />, label: 'H1', action: () => insertText('# ') },
    { icon: <Heading2 className="w-4 h-4" />, label: 'H2', action: () => insertText('## ') },
    { icon: <List className="w-4 h-4" />, label: 'List', action: () => insertText('- ') },
    { icon: <Quote className="w-4 h-4" />, label: 'Quote', action: () => insertText('> ') },
    { icon: <Code className="w-4 h-4" />, label: 'Code', action: () => insertText('`', '`') },
    { icon: <LinkIcon className="w-4 h-4" />, label: 'Link', action: () => insertText('[', '](url)') },
    { icon: <ImageIcon className="w-4 h-4" />, label: 'Image', action: () => insertText('![alt](', ')') },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 rounded-t-xl sticky top-0 z-10">
      {tools.map((tool, index) => (
        <button
          key={index}
          type="button"
          onClick={tool.action}
          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all flex items-center justify-center min-w-[36px] min-h-[36px]"
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
};
